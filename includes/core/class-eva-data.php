<?php

namespace Eva\Framework;

// 直接访问该文件时（未经 WordPress 引导）立即退出，防止源码被当作普通 PHP 执行而泄露逻辑。
if (! defined('ABSPATH')) {
    exit;
}

/**
 * Eva 字段数据层（MVP）。
 *
 * 职责：把前端（Vue 外壳）提交上来的字段值，按「已注册的字段 schema」做 type 级清洗（sanitize），
 *       再写入 wp_options。读取（注入前端）那一侧不在这里，而在 \Eva::get_values()。
 *
 * 入口：设置页通过 AJAX(action = eva_fw_save_options) 调到本类的 ajax_save()；
 *       而 metabox / 分类法 / 导航菜单 / 评论 / 用户资料等嵌入式容器，则直接复用这里的
 *       静态方法 sanitize_by_sections() 做清洗，再各自写入对应的 meta 表。
 *
 * @package Eva\Framework
 */
class Data
{
    /**
     * 构造时挂载 AJAX 保存钩子。
     *
     * 仅注册「已登录用户」的 wp_ajax_ 动作（设置页只对后台有权限者开放，无需 nopriv）。
     */
    public function __construct()
    {
        // 绑定设置页保存动作：前端 fetch admin-ajax.php?action=eva_fw_save_options 时进入 ajax_save()。
        add_action('wp_ajax_eva_fw_save_options', [$this, 'ajax_save']);
    }

    /**
     * AJAX 回调：校验 → 清洗 → 落库，最后回吐清洗后的值给前端。
     *
     * 失败时一律以 wp_send_json_error 配合对应 HTTP 状态码返回，前端据此提示。
     *
     * @return void 直接以 JSON 响应并结束请求（wp_send_json_* 内部会 die）。
     */
    public function ajax_save()
    {
        // 1) 校验 nonce：用与前端 EvaFW.config.nonce 同名的 'eva_fw_guide' 动作，防 CSRF。
        if (! check_ajax_referer('eva_fw_guide', 'nonce', false)) {
            wp_send_json_error(['msg' => 'bad_nonce'], 403);
        }
        // 2) 校验权限：设置页保存属于站点级配置，要求 manage_options。
        if (! current_user_can('manage_options')) {
            wp_send_json_error(['msg' => 'forbidden'], 403);
        }

        // 3) 取目标设置页 id，并从注册表反查其配置（拿到 sections 用于按 schema 清洗）。
        $option_id = isset($_POST['option_id']) ? sanitize_text_field(wp_unslash($_POST['option_id'])) : '';
        $opt = \Eva::get($option_id);
        if (! $opt) {
            // 未注册的 option_id：拒绝，避免被写入任意 wp_options 键。
            wp_send_json_error(['msg' => 'unknown_option'], 400);
        }

        // 4) 解析前端提交的值（JSON 字符串 → 关联数组）；非数组一律视为空，保证后续遍历安全。
        $raw = isset($_POST['values']) ? json_decode(wp_unslash($_POST['values']), true) : [];
        if (! is_array($raw)) {
            $raw = [];
        }

        // 5) 保存前做字段级校验；任一字段失败即不落库，并把错误按 field_id 回传前端。
        $errors = self::validate_by_sections($opt['sections'], $raw);
        if (! empty($errors)) {
            wp_send_json_error([
                'msg'    => 'validation_failed',
                'errors' => $errors,
            ], 422);
        }

        // 6) 按已注册字段 schema 逐项清洗；schema 之外的键一律丢弃，杜绝越权写入。
        $clean = self::sanitize_by_sections($opt['sections'], $raw);

        // 7) 落库：整组以 option_id 为键存进 wp_options（与 CSF 的 serialize 默认行为一致）。
        update_option($option_id, $clean);

        // 8) 回吐清洗结果，前端可据此刷新本地状态（确认实际入库的值）。
        wp_send_json_success(['values' => $clean]);
    }

    /**
     * 按 sections 执行字段级 validate；返回 [field_id => error_message]。
     *
     * 支持：
     * - `required => true` 快捷必填。
     * - `validate => 'email'|'numeric'|'number'|'required'|'url'` 内置规则。
     * - `validate => callable` 自定义回调，返回非空字符串即视为错误。
     * - `validate => [rule1, rule2]` 多规则顺序执行。
     *
     * @param array $sections 容器字段分组。
     * @param array $raw      前端提交的原始字段值。
     * @return array<string,string>
     */
    public static function validate_by_sections($sections, $raw)
    {
        $raw    = is_array($raw) ? $raw : [];
        $errors = [];

        foreach ((array) $sections as $section) {
            if (empty($section['fields']) || ! is_array($section['fields'])) {
                continue;
            }

            foreach ($section['fields'] as $field) {
                if (empty($field['id'])) {
                    continue;
                }

                if (! Admin\Dependency::should_save_field($field, $raw)) {
                    continue;
                }

                $id    = (string) $field['id'];
                $value = array_key_exists($id, $raw) ? $raw[$id] : null;
                $error = self::validate_field($field, $value, $raw);
                if ($error !== '') {
                    $errors[$id] = $error;
                }
            }
        }

        return $errors;
    }

    /**
     * 执行单个字段的 validate 规则。
     *
     * @param array $field 字段 schema。
     * @param mixed $value 字段原始值。
     * @param array $raw   当前提交的全部字段值。
     * @return string      错误文案；空字符串表示通过。
     */
    public static function validate_field($field, $value, $raw = [])
    {
        $rules = [];

        if (! empty($field['required'])) {
            $rules[] = 'required';
        }

        if (isset($field['validate'])) {
            $validate = $field['validate'];
            if (is_array($validate) && ! is_callable($validate)) {
                $rules = array_merge($rules, $validate);
            } else {
                $rules[] = $validate;
            }
        }

        foreach ($rules as $rule) {
            $error = self::run_validate_rule($rule, $value, $field, $raw);
            if ($error !== '') {
                return $error;
            }
        }

        return '';
    }

    /**
     * 执行一条内置或自定义 validate 规则。
     *
     * @param mixed $rule  规则名或 callable。
     * @param mixed $value 字段原始值。
     * @param array $field 字段 schema。
     * @param array $raw   全部原始提交值。
     * @return string      错误文案；空字符串表示通过。
     */
    private static function run_validate_rule($rule, $value, $field, $raw)
    {
        if (is_callable($rule)) {
            $result = call_user_func($rule, $value, $field, $raw);
            return is_string($result) ? sanitize_text_field($result) : '';
        }

        $rule = sanitize_key((string) $rule);
        if ($rule === '') {
            return '';
        }

        $label = isset($field['title']) && is_scalar($field['title']) ? (string) $field['title'] : '该字段';
        $empty = self::is_empty_value($value);

        if ($rule === 'required') {
            return $empty ? $label . '不能为空。' : '';
        }

        if ($empty) {
            return '';
        }

        if ($rule === 'email') {
            return is_email((string) $value) ? '' : $label . '必须是有效邮箱。';
        }

        if ($rule === 'numeric' || $rule === 'number') {
            return is_numeric($value) ? '' : $label . '必须是数字。';
        }

        if ($rule === 'url') {
            return filter_var((string) $value, FILTER_VALIDATE_URL) ? '' : $label . '必须是有效 URL。';
        }

        if (function_exists($rule)) {
            $result = call_user_func($rule, $value, $field, $raw);
            return is_string($result) ? sanitize_text_field($result) : '';
        }

        return '';
    }

    /**
     * 判断 validate 语义下的空值。
     *
     * @param mixed $value 待判断值。
     * @return bool
     */
    private static function is_empty_value($value)
    {
        return $value === null || $value === '' || $value === [] || $value === false;
    }

    /**
     * 按一组 sections 的字段 schema 清洗提交值；未在 schema 内的键一律丢弃。
     *
     * 设计为静态方法，供设置页(AJAX) 与 metabox / 分类法 / 导航菜单 / 评论 / 用户资料等
     * 各嵌入式容器共用，保证「能存什么、怎么存」的规则全框架统一。
     *
     * @param array $sections 容器的 sections（每个含 fields[]，字段需带 id / type）。
     * @param array $raw      前端提交的原始键值（[field_id => value]）。
     * @return array          清洗后的 [field_id => value]，仅含 schema 内声明的字段。
     */
    public static function sanitize_by_sections($sections, $raw)
    {
        // 入参兜底：$raw 必须是数组，否则后续 array_key_exists 会报错。
        $raw   = is_array($raw) ? $raw : [];
        $clean = [];

        // 遍历每个分组。
        foreach ((array) $sections as $section) {
            // 没有 fields 的分组（纯标题/占位）直接跳过。
            if (empty($section['fields']) || ! is_array($section['fields'])) {
                continue;
            }
            // 遍历分组内每个字段，按其类型清洗对应的提交值。
            foreach ($section['fields'] as $field) {
                // 无 id 的字段（如纯展示型）不参与存储。
                if (empty($field['id'])) {
                    continue;
                }
                $id   = $field['id'];
                // 字段未声明 type 时按 text 处理（最保守的字符串清洗）。
                $type = isset($field['type']) ? $field['type'] : 'text';
                // 依赖隐藏字段默认保留保存；仅显式 save_when_hidden=false 时按规则跳过。
                if (! Admin\Dependency::should_save_field($field, $raw)) {
                    continue;
                }
                // 前端没提交该字段时取 null，交由 sanitize_field 决定其空值表现。
                $val  = array_key_exists($id, $raw) ? $raw[$id] : null;
                $value = ($type === 'accordion')
                    ? self::sanitize_accordion($field, $val)
                    : self::sanitize_field($type, $val, $field);
                $clean[$id] = self::apply_custom_sanitize($field, $value);
            }
        }
        return $clean;
    }

    /**
     * 执行字段级自定义 sanitize 回调，兼容 CSF 的 `sanitize => callable` 写法。
     *
     * @param array $field 字段 schema。
     * @param mixed $value 已按 type 清洗后的值。
     * @return mixed       自定义清洗后的值。
     */
    private static function apply_custom_sanitize($field, $value)
    {
        if (empty($field['sanitize'])) {
            return $value;
        }

        $callback = $field['sanitize'];
        if (is_callable($callback)) {
            return call_user_func($callback, $value, $field);
        }

        $function = (string) $callback;
        if ($function !== '' && function_exists($function)) {
            return call_user_func($function, $value);
        }

        return $value;
    }

    /**
     * 按字段类型清洗单个值。
     *
     * 注意（迁移须知）：当前覆盖 switcher / textarea / select / ajax_select / color / color_group / icon / upload / image_select / html / backup / builder / text 等类型，其余类型都会落到
     * default 分支被强制转成字符串。对「值为数组」的字段（group/repeater/checkbox/gallery 等），
     * 这会破坏数据——迁移此类字段前必须在此补对应分支。
     *
     * @param string $type 字段类型标识。
     * @param mixed  $val  原始值（可能为 null / 标量 / 数组）。
     * @param array  $field 字段 schema，供有限选项类字段校验合法值。
     * @return mixed       清洗后的值。
     */
    public static function sanitize_field($type, $val, $field = [])
    {
        switch ($type) {
            case 'switcher':
                return Admin\Fields\Switcher::sanitize($val, $field);
            case 'textarea':
                return Admin\Fields\Textarea::sanitize($val, $field);
            case 'color':
                return Admin\Fields\Color::sanitize($val, $field);
            case 'color_group':
                return Admin\Fields\Color_Group::sanitize($val, $field);
            case 'icon':
                return Admin\Fields\Icon::sanitize($val, $field);
            case 'upload':
                return Admin\Fields\Upload::sanitize($val, $field);
            case 'image_select':
                return Admin\Fields\Image_Select::sanitize($field, $val);
            case 'ajax_select':
                return Admin\Fields\Ajax_Select::sanitize($field, $val);
            case 'select':
                return Admin\Fields\Select::sanitize($field, $val);
            case 'html':
                return Admin\Fields\Html::sanitize($val, $field);
            case 'backup':
                return Admin\Fields\Backup::sanitize($val, $field);
            case 'builder':
                return self::sanitize_builder($val, $field);
            case 'text':
            default:
                // 其余（含未识别类型）按单行文本清洗——数组型字段在此会被损坏，详见上方注意。
                return Admin\Fields\Text::sanitize($val, $field);
        }
    }

    /**
     * 清洗 builder（页面构建器）字段：值为模块实例数组 [{uid,type,values}]。
     *
     * 外壳阶段做通用递归清洗、保留结构（uid/type 走 sanitize_key，values 递归清洗）。
     * 注意：此处无法获知 JS 端 window.EvaModules 的逐字段类型，故按通用规则清洗；
     * 待模块契约稳定后，可改为按各模块 fields 的 type 调用对应 sanitize 分支以更精细。
     *
     * @param mixed $val   原始值。
     * @param array $field  字段 schema。
     * @return array        清洗后的实例数组。
     */
    private static function sanitize_builder($val, $field = [])
    {
        if (! is_array($val)) {
            return [];
        }

        $clean = [];
        foreach ($val as $item) {
            if (! is_array($item) || empty($item['type'])) {
                continue;
            }
            $clean[] = [
                'uid'    => isset($item['uid']) ? sanitize_key((string) $item['uid']) : '',
                'type'   => sanitize_key((string) $item['type']),
                'values' => (isset($item['values']) && is_array($item['values'])) ? self::deep_clean_values($item['values']) : [],
            ];
        }

        return $clean;
    }

    /**
     * 递归清洗任意嵌套结构中的标量值：字符串走 wp_kses_post（保留换行与安全 HTML、剔除脚本），
     * 布尔/数值原样保留，数组递归处理。
     *
     * @param mixed $value 待清洗值。
     * @return mixed        清洗后的值。
     */
    private static function deep_clean_values($value)
    {
        if (is_array($value)) {
            $out = [];
            foreach ($value as $k => $v) {
                $key       = is_string($k) ? sanitize_key($k) : $k;
                $out[$key] = self::deep_clean_values($v);
            }
            return $out;
        }

        if (is_bool($value) || is_int($value) || is_float($value)) {
            return $value;
        }

        return wp_kses_post((string) $value);
    }

    /**
     * 清洗 select 字段；支持普通单选、多选，以及 ajax=true 的 ID 单选/多选。
     *
     * @param array $field 字段 schema。
     * @param mixed $val   原始值。
     * @return string|int|array
     */
    public static function sanitize_select($field, $val)
    {
        return Admin\Fields\Select::sanitize($field, $val);
    }

    /**
     * 清洗图像选择字段：只允许保存 options 中声明过的选项值。
     *
     * @param array $field 字段 schema。
     * @param mixed $val   原始选中值。
     * @return string      合法选项值；无效时回退到合法 default 或空字符串。
     */
    public static function sanitize_image_select($field, $val)
    {
        return Admin\Fields\Image_Select::sanitize($field, $val);
    }

    /**
     * 清洗颜色值：仅允许 #RGB/#RRGGBB 或 rgb()/rgba() 字符串，失败返回空。
     *
     * @param mixed $val 原始颜色值。
     * @return string    规范化后的颜色字符串。
     */
    public static function sanitize_color($val)
    {
        return Admin\Fields\Color::sanitize($val);
    }

    /**
     * 清洗颜色组：保留合法 HEX/RGBA 颜色并重排索引。
     *
     * @param mixed $val 原始颜色数组。
     * @return array<int,string> 清洗后的颜色数组。
     */
    public static function sanitize_color_group($val)
    {
        return Admin\Fields\Color_Group::sanitize($val);
    }

    /**
     * 清洗图标值：允许常见图标类名/名称字符，避免写入 HTML 或脚本片段。
     *
     * @param mixed $val 原始图标值。
     * @return string    清洗后的图标字符串。
     */
    public static function sanitize_icon($val)
    {
        return Admin\Fields\Icon::sanitize($val);
    }

    /**
     * 清洗上传字段值：支持 URL / 附件 ID / 附件信息数组。
     *
     * @param mixed $val 原始上传值。
     * @return mixed     清洗后的字符串、整数或数组。
     */
    public static function sanitize_upload($val)
    {
        return Admin\Fields\Upload::sanitize($val);
    }

    /**
     * 清洗 accordion 字段：按每个 panel 的 fields 子 schema 递归清洗。
     *
     * @param array $field accordion 字段 schema。
     * @param mixed $val   原始 accordion 值。
     * @return array       [section_id => [field_id => clean_value]]。
     */
    public static function sanitize_accordion($field, $val)
    {
        return Admin\Fields\Accordion::sanitize($field, $val);
    }
}
