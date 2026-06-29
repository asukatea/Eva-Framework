<?php

/**
 * 内置演示（仅作示例，可整文件删除，不影响框架本体）。
 *
 * 作用：用 \Eva::createOptions / addMenuItem / createSection 演示「如何用 Eva 注册一个设置页」，
 *       同时附带三个演示用辅助函数（解析更新日志 / 友好时间 / 近期动态）。
 *
 * 迁移到主题时：删除本文件，并移除 eva-framework.php 末尾对它的 require；改用主题真实容器 id 注册。
 * 详见插件根目录《迁移到主题使用指南.md》第 7 节。
 */

// 阻断对该文件的直接 HTTP 访问，必须经由 WordPress 加载。
if (! defined('ABSPATH')) {
    exit;
}

// 用 function_exists 守卫，避免与主题/其它插件的同名函数冲突。
if (! function_exists('eva_demo_parse_update_logs')) {
    /**
     * 解析本地 Markdown 更新日志为结构化数组（演示「版本计划」字段的数据来源）。
     *
     * 识别规则：
     * - `# YYYY-MM-DD - Version x.y` 开启一个版本块；
     * - `#### ~ ######` 标题开启该版本下的一个小节；
     * - `-`/`*`/`+` 为无序条目，`1.` 为有序条目。
     *
     * @param string $file 日志文件绝对路径。
     * @return array       版本块列表（每块含 version/date/sections）。
     */
    function eva_demo_parse_update_logs($file)
    {
        // 文件不可读直接返回空，调用方据此显示「暂无日志」。
        if (! is_readable($file)) {
            return [];
        }

        // 逐行解析：$current 累积当前版本块，$section 标记当前小节标题。
        $lines = explode("\n", (string) file_get_contents($file));
        $logs = [];
        $current = [];
        $section = '';

        foreach ($lines as $line) {
            $line = trim($line);
            // 跳过空行。
            if ($line === '') {
                continue;
            }

            if (preg_match('/^#\s*(\d{4}-\d{2}-\d{2})\s*-\s*Version\s*(.+)$/u', $line, $m)) {
                // 遇到版本标题：先把上一个版本块收尾入列，再开启新块。
                if (! empty($current)) {
                    $logs[] = $current;
                }
                $current = [
                    'version'  => trim($m[2]),
                    'date'     => trim($m[1]),
                    'sections' => [],
                ];
                $section = '';
            } elseif (! empty($current) && preg_match('/^#{4,6}\s*(.+)$/u', $line, $m)) {
                // 小节标题（####~######）：在当前版本块下建一个默认无序的小节。
                $section = trim($m[1]);
                $current['sections'][$section] = [
                    'type'  => 'unordered',
                    'items' => [],
                ];
            } elseif ($section && preg_match('/^[-*+]\s+(.+)$/u', $line, $m)) {
                // 无序条目：追加到当前小节。
                $current['sections'][$section]['items'][] = trim($m[1]);
            } elseif ($section && preg_match('/^\d+\.\s+(.+)$/u', $line, $m)) {
                // 有序条目：标记小节为有序并追加。
                $current['sections'][$section]['type'] = 'ordered';
                $current['sections'][$section]['items'][] = trim($m[1]);
            }
        }

        // 收尾：把最后一个版本块入列。
        if (! empty($current)) {
            $logs[] = $current;
        }

        return $logs;
    }
}

if (! function_exists('eva_demo_activity_time')) {
    /**
     * 把时间戳转成「N 前」的人类可读相对时间。
     *
     * @param int $timestamp Unix 时间戳。
     * @return string        形如「3 小时前」；无效时间返回「—」。
     */
    function eva_demo_activity_time($timestamp)
    {
        $timestamp = (int) $timestamp;
        // 非正时间戳视为无效。
        if ($timestamp <= 0) {
            return '—';
        }

        // 借 WP 的 human_time_diff 计算与当前时间的差，并加「前」字。
        return human_time_diff($timestamp, current_time('timestamp')) . '前';
    }
}

if (! function_exists('eva_demo_recent_activities')) {
    /**
     * 取最近 3 条更新动态（演示「版本计划」里的活动流）。
     *
     * @param array $logs  解析后的更新日志（此演示未直接使用，仅占位对齐签名）。
     * @param mixed $theme 当前主题对象（此演示未直接使用）。
     * @return array       最多 3 条 [title/desc/time] 记录，按时间倒序。
     */
    function eva_demo_recent_activities($logs, $theme)
    {
        // 动态数据存于 option；非数组直接返回空。
        $items = get_option('lentasy_update_activities', []);
        if (! is_array($items)) {
            return [];
        }

        // 按时间戳倒序（新→旧）。
        usort($items, function ($a, $b) {
            return (int) ($b['ts'] ?? 0) <=> (int) ($a['ts'] ?? 0);
        });

        // 规整字段并截取前 3 条返回。
        return array_slice(array_map(function ($item) {
            return [
                'title' => isset($item['title']) ? sanitize_text_field($item['title']) : '',
                'desc'  => isset($item['desc']) ? sanitize_text_field($item['desc']) : '',
                'time'  => eva_demo_activity_time($item['ts'] ?? 0),
            ];
        }, $items), 0, 3);
    }
}

if (! function_exists('eva_demo_image_select_preview')) {
    /**
     * 生成 image_select 演示用 SVG 预览图，避免依赖额外图片资源。
     *
     * @param string $variant 预览变体：card/list/grid/minimal。
     * @return string         data URI，可直接作为字段 option 的 url。
     */
    function eva_demo_image_select_preview($variant)
    {
        $variant = sanitize_key($variant);
        $accent  = '#FF758C';
        $muted   = '#E8EAF0';
        $soft    = '#F7F8FA';
        $text    = '#B8BECA';

        if ($variant === 'list') {
            $body = '<rect x="18" y="20" width="36" height="24" rx="4" fill="' . $muted . '"/><rect x="64" y="22" width="72" height="6" rx="3" fill="' . $accent . '" opacity=".35"/><rect x="64" y="34" width="96" height="5" rx="2.5" fill="' . $text . '" opacity=".65"/><rect x="18" y="58" width="36" height="24" rx="4" fill="' . $muted . '"/><rect x="64" y="60" width="86" height="6" rx="3" fill="' . $text . '" opacity=".65"/><rect x="64" y="72" width="66" height="5" rx="2.5" fill="' . $text . '" opacity=".45"/>';
        } elseif ($variant === 'grid') {
            $body = '<rect x="18" y="18" width="42" height="30" rx="4" fill="' . $accent . '" opacity=".28"/><rect x="68" y="18" width="42" height="30" rx="4" fill="' . $muted . '"/><rect x="118" y="18" width="42" height="30" rx="4" fill="' . $muted . '"/><rect x="18" y="58" width="42" height="30" rx="4" fill="' . $muted . '"/><rect x="68" y="58" width="42" height="30" rx="4" fill="' . $muted . '"/><rect x="118" y="58" width="42" height="30" rx="4" fill="' . $accent . '" opacity=".22"/>';
        } elseif ($variant === 'minimal') {
            $body = '<rect x="20" y="20" width="140" height="10" rx="5" fill="' . $accent . '" opacity=".32"/><rect x="20" y="42" width="110" height="7" rx="3.5" fill="' . $text . '" opacity=".7"/><rect x="20" y="60" width="132" height="7" rx="3.5" fill="' . $text . '" opacity=".45"/><rect x="20" y="78" width="88" height="7" rx="3.5" fill="' . $text . '" opacity=".45"/>';
        } else {
            $body = '<rect x="18" y="18" width="56" height="52" rx="6" fill="' . $accent . '" opacity=".28"/><rect x="86" y="22" width="72" height="8" rx="4" fill="' . $text . '" opacity=".7"/><rect x="86" y="40" width="56" height="6" rx="3" fill="' . $text . '" opacity=".45"/><rect x="86" y="56" width="78" height="6" rx="3" fill="' . $text . '" opacity=".35"/><rect x="18" y="78" width="146" height="10" rx="5" fill="' . $muted . '"/>';
        }

        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="106" viewBox="0 0 180 106"><rect width="180" height="106" rx="10" fill="' . $soft . '"/>' . $body . '</svg>';
        return 'data:image/svg+xml;charset=UTF-8,' . rawurlencode($svg);
    }
}

if (! function_exists('eva_demo_image_select_options')) {
    /**
     * image_select 演示选项集合，供多个演示字段复用。
     *
     * @param bool $with_disabled 是否附带禁用选项示例。
     * @return array<string,array>
     */
    function eva_demo_image_select_options($with_disabled = false)
    {
        $options = [
            'card'    => ['label' => '卡片布局', 'desc' => '适合内容聚合页', 'url' => eva_demo_image_select_preview('card')],
            'list'    => ['label' => '列表布局', 'desc' => '适合信息流页面', 'url' => eva_demo_image_select_preview('list')],
            'grid'    => ['label' => '网格布局', 'desc' => '适合图库或产品墙', 'url' => eva_demo_image_select_preview('grid')],
            'minimal' => ['label' => '极简布局', 'desc' => '适合文档与设置页', 'url' => eva_demo_image_select_preview('minimal')],
        ];

        if ($with_disabled) {
            $options['minimal']['disabled'] = true;
            $options['minimal']['desc'] = '此项演示禁用状态';
        }

        return $options;
    }
}

// ============================================================================
// 演示设置页注册：先建容器（createOptions），再加左侧菜单树（addMenuItem），
// 最后逐区追加字段（createSection）。
// ============================================================================

// 1) 创建演示设置页容器：顶部工具栏入口 + 独立页模式。
\Eva::createOptions('eva_demo', [
    'menu_title' => 'Eva Framework',
    'menu_slug'  => 'eva-framework',
    'location'   => 'admin_bar',
    'standalone' => true,
    'subtitle'   => '轻量 · 现代 · 好看的 WordPress 设置框架',
]);

// 2) 左侧主菜单：复刻 CSF「LF主题设置」的菜单树（图标映射为 Remix Icon）。
// 「常规设置」对应下方同 id 的设置分组（有表单）；其余分区暂为菜单/占位，字段迁移后续逐区补。
\Eva::addMenuItem('eva_demo', ['id' => 'general', 'label' => '常规设置', 'icon' => 'ri-equalizer-line']);
\Eva::addMenuItem('eva_demo', ['id' => 'demo-feature', 'label' => '示例功能', 'icon' => 'ri-flashlight-line']);
\Eva::addMenuItem('eva_demo', ['id' => 'fields', 'label' => '字段展示', 'icon' => 'ri-input-method-line', 'children' => [
    ['id' => 'field-image-select', 'label' => '图像选择', 'icon' => 'ri-image-line'],
    ['id' => 'field-color', 'label' => '颜色选择', 'icon' => 'ri-palette-line'],
    ['id' => 'field-color-group', 'label' => '颜色组', 'icon' => 'ri-color-filter-line'],
    ['id' => 'field-upload', 'label' => '媒体上传', 'icon' => 'ri-folder-image-line'],
    ['id' => 'field-select', 'label' => '下拉菜单', 'icon' => 'ri-list-check'],
]]);
\Eva::addMenuItem('eva_demo', ['id' => 'module', 'label' => '容器设置', 'icon' => 'ri-layout-2-line', 'children' => [
    ['id' => 'mod-top', 'label' => '顶部模块', 'icon' => 'ri-layout-top-line'],
    ['id' => 'mod-bottom', 'label' => '底部模块', 'icon' => 'ri-layout-bottom-line'],
    ['id' => 'mod-misc', 'label' => '杂项设置', 'icon' => 'ri-more-2-line'],
]]);
\Eva::addMenuItem('eva_demo', ['id' => 'pay', 'label' => '支付模块', 'icon' => 'ri-bank-card-line', 'children' => [
    ['id' => 'pay-set', 'label' => '支付设置', 'icon' => 'ri-secure-payment-line'],
]]);
\Eva::addMenuItem('eva_demo', ['id' => 'cms', 'label' => 'Cms模块', 'icon' => 'ri-stack-line', 'children' => [
    ['id' => 'cms-home', 'label' => '首页模块', 'icon' => 'ri-home-4-line'],
    ['id' => 'cms-single', 'label' => '文章模块', 'icon' => 'ri-article-line'],
    ['id' => 'cms-archive', 'label' => '归档页设置', 'icon' => 'ri-archive-line'],
    ['id' => 'cms-comment', 'label' => '评论模块', 'icon' => 'ri-chat-3-line'],
]]);
\Eva::addMenuItem('eva_demo', ['id' => 'user', 'label' => '用户模块', 'icon' => 'ri-user-3-line', 'children' => [
    ['id' => 'user-login', 'label' => '登录与注册', 'icon' => 'ri-login-box-line'],
    ['id' => 'user-menu', 'label' => '菜单设置', 'icon' => 'ri-menu-line'],
    ['id' => 'user-page', 'label' => '用户页设置', 'icon' => 'ri-profile-line'],
    ['id' => 'user-func', 'label' => '用户功能', 'icon' => 'ri-user-settings-line'],
]]);
\Eva::addMenuItem('eva_demo', ['id' => 'write', 'label' => '编辑器模块', 'icon' => 'ri-edit-box-line', 'children' => [
    ['id' => 'write-admin', 'label' => '后台文章编辑', 'icon' => 'ri-edit-2-line'],
    ['id' => 'write-front', 'label' => '前台发帖页', 'icon' => 'ri-quill-pen-line'],
]]);
\Eva::addMenuItem('eva_demo', ['id' => 'extended', 'label' => '扩展模块', 'icon' => 'ri-puzzle-2-line']);
\Eva::addMenuItem('eva_demo', ['id' => 'system', 'label' => '系统模块', 'icon' => 'ri-settings-4-line']);
\Eva::addMenuItem('eva_demo', ['id' => 'renewal', 'label' => '更新&文档', 'icon' => 'ri-refresh-line', 'children' => [
    ['id' => 'renewal-version', 'label' => '版本计划', 'icon' => 'ri-git-branch-line'],
    ['id' => 'renewal-help', 'label' => '帮助中心', 'icon' => 'ri-book-open-line'],
]]);
\Eva::addMenuItem('eva_demo', ['id' => 'backup', 'label' => '备份恢复', 'icon' => 'ri-database-2-line']);

// 3) 常规设置分组：演示 text / switcher / select（含分组+可搜索）/ textarea 等基础字段。
\Eva::createSection('eva_demo', [
    'id'     => 'general',
    'title'  => '常规设置',
    'icon'   => 'ri-equalizer-line',
    'fields' => [
        ['id' => 'primary_color', 'type' => 'color', 'title' => '主色调', 'default' => '#FF4D7F', 'alpha' => true, 'presets' => ['#FF4D7F', '#EF4444', '#F97316', '#FACC15', '#22C55E', '#38BDF8', '#3B82F6', '#8B5CF6', '#64748B'], 'desc' => '用于按钮、链接、强调状态等主要视觉元素。', 'width' => '1/3'],
        ['id' => 'brand_colors', 'type' => 'color_group', 'title' => '品牌色组', 'group_title' => '品牌色组', 'group_desc' => '用于主题配色、图表颜色或模块强调色配置。', 'default' => ['#FF4D8D', '#FF6B6B', '#FFD166', '#06D6A0', '#4D96FF', '#9B5DE5'], 'presets' => ['#FF4D8D', '#FF6B6B', '#FFD166', '#06D6A0', '#4D96FF', '#9B5DE5', '#222222', '#FFFFFF'], 'max_colors' => 8, 'sortable' => true, 'required' => true, 'width' => 'full'],
        ['id' => 'feature_icon', 'type' => 'icon', 'title' => '功能图标', 'default' => 'ri-star-fill', 'library' => 'remix', 'placeholder' => '请选择一个图标', 'desc' => '请选择一个合适的图标，用于功能展示。', 'required' => false, 'width' => '1/3'],
        ['id' => 'cover_image', 'type' => 'upload', 'title' => '封面图片', 'desc' => '建议尺寸：1920x1080 像素，支持 jpg、png、webp 格式，最大 5MB。', 'default' => '', 'library' => 'image', 'button_title' => '选择图片', 'placeholder' => '点击或拖拽图片到此处', 'preview' => true, 'width' => '1/3'],
        ['id' => 'layout_style', 'type' => 'image_select', 'title' => '图像选择', 'desc' => '用图片缩略图选择布局或风格，保存值为选项 key。', 'default' => 'card', 'columns' => 4, 'min_width' => 138, 'aspect_ratio' => '16 / 9', 'object_fit' => 'cover', 'zoom' => true, 'width' => 'full', 'options' => [
            'card'    => ['label' => '卡片布局', 'url' => eva_demo_image_select_preview('card')],
            'list'    => ['label' => '列表布局', 'url' => eva_demo_image_select_preview('list')],
            'grid'    => ['label' => '网格布局', 'url' => eva_demo_image_select_preview('grid')],
            'minimal' => ['label' => '极简布局', 'url' => eva_demo_image_select_preview('minimal')],
        ]],
        ['id' => 'site_slogan', 'type' => 'text', 'title' => '站点标语', 'desc' => '显示在首页的一句话', 'default' => '', 'placeholder' => '请输入标语', 'width' => '1/3'],
        ['id' => 'enable_feature', 'type' => 'switcher', 'title' => '启用示例功能', 'desc' => '开启或关闭', 'default' => false, 'width' => '1/3'],
        ['id' => 'settings_accordion', 'type' => 'accordion', 'title' => '手风琴设置', 'desc' => '将相关配置按折叠区组织，提升复杂表单可读性。', 'default_open' => ['basic'], 'closed_icon' => 'ri-arrow-down-s-line', 'open_icon' => 'ri-arrow-up-s-line', 'width' => 'full', 'sections' => [
            ['id' => 'basic', 'title' => '基本设置', 'badge' => '1', 'fields' => [
                ['id' => 'title', 'type' => 'text', 'title' => '标题', 'default' => '示例标题', 'width' => '1/2'],
                ['id' => 'description', 'type' => 'textarea', 'title' => '描述', 'default' => '', 'width' => '1/2'],
            ]],
            ['id' => 'content', 'title' => '内容设置', 'badge' => '2', 'fields' => [
                ['id' => 'content_title', 'type' => 'text', 'title' => '内容标题', 'default' => '', 'width' => '1/2'],
                ['id' => 'content_enabled', 'type' => 'switcher', 'title' => '启用内容', 'default' => 1, 'width' => '1/2'],
            ]],
            ['id' => 'display', 'title' => '显示设置', 'badge' => '3', 'fields' => [
                ['id' => 'display_mode', 'type' => 'select', 'title' => '显示模式', 'default' => 'normal', 'options' => ['normal' => '普通', 'compact' => '紧凑'], 'width' => '1/2'],
            ]],
            ['id' => 'advanced', 'title' => '高级选项', 'badge' => '4', 'disabled' => false, 'fields' => [
                ['id' => 'advanced_note', 'type' => 'textarea', 'title' => '备注', 'default' => '', 'width' => 'full'],
            ]],
        ]],
        ['id' => 'layout_mode', 'type' => 'select', 'title' => '布局模式', 'desc' => '选择一种布局', 'default' => 'wide', 'options' => ['wide' => '宽屏', 'boxed' => '盒装', 'fluid' => '流式'], 'width' => '1/3'],
        ['id' => 'region', 'type' => 'select', 'title' => '所在地区', 'desc' => '分组 + 下拉内搜索演示', 'default' => 'sh', 'searchable' => true, 'empty_message' => '没有匹配的地区', 'width' => '1/2', 'options' => [
            '华北' => ['bj' => '北京', 'tj' => '天津', 'sjz' => '石家庄'],
            '华东' => ['sh' => '上海', 'hz' => '杭州', 'nj' => '南京', 'su' => '苏州'],
            '华南' => ['gz' => '广州', 'sz' => '深圳', 'xm' => '厦门'],
        ]],
        ['id' => 'about_text', 'type' => 'textarea', 'title' => '关于我们', 'desc' => '支持多行文本', 'default' => '', 'width' => 'full'],
    ],
]);

// 字段展示：Image Select / 图像选择。
\Eva::createSection('eva_demo', [
    'id'     => 'field-image-select',
    'title'  => '图像选择',
    'icon'   => 'ri-image-line',
    'fields' => [
        ['id' => 'image_select_default', 'type' => 'image_select', 'title' => '默认卡片', 'desc' => '默认 16:9 缩略图、显示标题和描述、开启放大预览。', 'default' => 'card', 'columns' => 4, 'width' => '1/2', 'options' => eva_demo_image_select_options()],
        ['id' => 'image_select_compact', 'type' => 'image_select', 'title' => '简约模式', 'desc' => '隐藏选项标题和描述，只保留图片预览，适合空间较小的设置区。', 'default' => 'card', 'columns' => 4, 'preview_height' => 76, 'show_label' => false, 'show_desc' => false, 'zoom' => false, 'width' => '1/2', 'options' => eva_demo_image_select_options()],
        ['id' => 'image_select_disabled', 'type' => 'image_select', 'title' => '禁用选项', 'desc' => '单个 option 可设置 disabled，字段本身也可设置 disabled。', 'default' => 'card', 'columns' => 4, 'width' => '1/2', 'options' => eva_demo_image_select_options(true)],
        ['id' => 'image_select_size', 'type' => 'image_select', 'title' => '自定义卡片大小', 'desc' => '用 size = small / medium / large 一键设定卡片尺寸（此处为 small）；无需手动算 columns，卡片按固定宽度自动换行。', 'default' => 'card', 'size' => 'small', 'width' => '1/2', 'options' => eva_demo_image_select_options()],
        ['id' => 'image_select_multiple', 'type' => 'image_select', 'title' => '多选 + 上限', 'desc' => 'multiple 开启多选、max=2 限制最多选 2 个；选中再点可取消，保存为数组。卡片支持方向键 ←→↑↓ 移动焦点、Enter/Space 选择。', 'default' => ['card', 'grid'], 'multiple' => true, 'max' => 2, 'columns' => 4, 'width' => '1/2', 'options' => eva_demo_image_select_options()],
        ['id' => 'image_select_search_group', 'type' => 'image_select', 'title' => '搜索 + 分组 + 徽章', 'desc' => 'searchable 顶部搜索框过滤；选项带 group 自动分组并显示小标题；带 badge 的选项右上角显示徽章（支持 primary/success/warn/danger 配色）。', 'default' => 'card', 'searchable' => true, 'columns' => 4, 'width' => '1/2', 'options' => [
            'card'    => ['label' => '卡片布局', 'group' => '基础布局', 'badge' => '常用', 'badge_tone' => 'primary', 'url' => eva_demo_image_select_preview('card')],
            'list'    => ['label' => '列表布局', 'group' => '基础布局', 'url' => eva_demo_image_select_preview('list')],
            'grid'    => ['label' => '网格布局', 'group' => '进阶布局', 'badge' => '新', 'badge_tone' => 'success', 'url' => eva_demo_image_select_preview('grid')],
            'minimal' => ['label' => '极简布局', 'group' => '进阶布局', 'badge' => 'Pro', 'badge_tone' => 'warn', 'url' => eva_demo_image_select_preview('minimal')],
        ]],
        ['id' => 'image_select_lazy', 'type' => 'image_select', 'title' => '懒加载 + 骨架', 'desc' => 'lazy=true：图片懒加载并在加载完成前显示微光骨架占位，图多时更顺滑、不跳动。', 'default' => 'card', 'lazy' => true, 'columns' => 4, 'width' => '1/2', 'options' => eva_demo_image_select_options()],
    ],
]);

// 字段展示：Color / 颜色选择。
\Eva::createSection('eva_demo', [
    'id'     => 'field-color',
    'title'  => '颜色选择',
    'icon'   => 'ri-palette-line',
    'fields' => [
        ['id' => 'color_primary', 'type' => 'color', 'title' => '主色调', 'desc' => '基础 color 字段，默认允许透明度，适合按钮、链接、强调状态等主题主色。', 'default' => '#FF4D7F', 'alpha' => true, 'placeholder' => '#FF4D7F', 'width' => '1/2', 'presets' => [
            '#FF4D7F',
            '#EF4444',
            '#F97316',
            '#FACC15',
            '#22C55E',
            '#38BDF8',
            '#3B82F6',
            '#8B5CF6',
            '#64748B',
        ]],
        ['id' => 'color_solid', 'type' => 'color', 'title' => '纯色选择', 'desc' => 'alpha = false，仅保存 HEX 颜色，适合不需要透明度的品牌色或边框色。', 'default' => '#3B82F6', 'alpha' => false, 'placeholder' => '#3B82F6', 'width' => '1/2', 'presets' => [
            '#111827',
            '#374151',
            '#6B7280',
            '#D1D5DB',
            '#F9FAFB',
            '#3B82F6',
            '#10B981',
            '#F59E0B',
            '#EF4444',
        ]],
        ['id' => 'color_presets', 'type' => 'color', 'title' => '预设色板', 'desc' => 'presets 可传一组常用色，便于快速选择统一的设计令牌。', 'default' => '#06D6A0', 'alpha' => true, 'placeholder' => '#06D6A0', 'width' => 'full', 'presets' => [
            '#FF4D8D',
            '#FF6B6B',
            '#FFD166',
            '#06D6A0',
            '#4D96FF',
            '#9B5DE5',
            '#222222',
            '#FFFFFF',
        ]],
        ['id' => 'color_inline', 'type' => 'color', 'title' => '内联面板', 'desc' => 'mode = inline 时颜色面板直接展开，适合需要高频调色的页面。', 'default' => '#8B5CF6', 'mode' => 'inline', 'palette_label' => '常用主题色', 'popover_width' => '320px', 'board_height' => '150px', 'preset_shape' => 'circle', 'width' => 'full', 'presets' => [
            '#FF4D7F',
            '#8B5CF6',
            '#3B82F6',
            '#06B6D4',
            '#22C55E',
            '#FACC15',
            '#F97316',
            '#EF4444',
        ]],
        ['id' => 'color_compact', 'type' => 'color', 'title' => '紧凑模式', 'desc' => 'size = small，并关闭输入框、格式切换、预设色板和清除按钮，适合表格或小空间。', 'default' => '#64748B', 'size' => 'small', 'show_input' => false, 'show_format' => false, 'show_presets' => false, 'clearable' => false, 'default_text' => '还原', 'apply_text' => '确定', 'width' => '1/2'],
        ['id' => 'color_rgba_only', 'type' => 'color', 'title' => 'RGBA 专用', 'desc' => 'format = rgba 且 formats 只给 rgba，可固定输出透明色。', 'default' => 'rgba(255, 77, 127, 0.72)', 'alpha' => true, 'format' => 'rgba', 'formats' => ['rgba'], 'placeholder' => 'rgba(255, 77, 127, 0.72)', 'palette_label' => '透明色预设', 'width' => '1/2', 'presets' => [
            'rgba(255, 77, 127, 0.35)',
            'rgba(59, 130, 246, 0.35)',
            'rgba(34, 197, 94, 0.35)',
            'rgba(250, 204, 21, 0.45)',
        ]],
        ['id' => 'color_disabled', 'type' => 'color', 'title' => '禁用状态', 'desc' => 'disabled = true 时只展示当前颜色，不允许打开或修改。', 'default' => '#94A3B8', 'disabled' => true, 'width' => 'full'],
    ],
]);

// 字段展示：Color Group / 颜色组（从“颜色选择”抽离出来的 color_group 字段）。
\Eva::createSection('eva_demo', [
    'id'     => 'field-color-group',
    'title'  => '颜色组',
    'icon'   => 'ri-color-filter-line',
    'fields' => [
        ['id' => 'color_group_brand', 'type' => 'color_group', 'title' => '品牌色组', 'group_title' => '品牌色组', 'group_desc' => 'color_group 保存颜色数组，适合主题色、图表色、标签色等成组配置；default_color 控制新增颜色。', 'default' => ['#FF4D8D', '#FF6B6B', '#FFD166', '#06D6A0', '#4D96FF'], 'default_color' => '#FF4D8D', 'presets' => ['#FF4D8D', '#FF6B6B', '#FFD166', '#06D6A0', '#4D96FF', '#9B5DE5', '#222222', '#FFFFFF'], 'width' => '1/2'],
        ['id' => 'color_group_sortable', 'type' => 'color_group', 'title' => '颜色组 + 排序', 'group_title' => '可排序色组', 'group_desc' => 'sortable = true 时，颜色块可拖拽调整顺序；max_colors 限制最多添加数量。', 'default' => ['#3B82F6', '#22C55E', '#FACC15', '#EF4444'], 'default_color' => '#3B82F6', 'presets' => ['#3B82F6', '#22C55E', '#FACC15', '#EF4444', '#8B5CF6', '#06B6D4'], 'max_colors' => 6, 'sortable' => true, 'width' => '1/2'],
        ['id' => 'color_group_limit', 'type' => 'color_group', 'title' => '数量上下限 + 计数', 'group_title' => '数量上下限', 'group_desc' => 'min_colors=2、max_colors=5：到下限禁删、到上限禁加，标题旁实时显示数量。', 'default' => ['#FF4D7F', '#4D96FF', '#22C55E'], 'min_colors' => 2, 'max_colors' => 5, 'presets' => ['#FF4D7F', '#FF6B6B', '#FFD166', '#06D6A0', '#4D96FF', '#9B5DE5'], 'width' => '1/2'],
        ['id' => 'color_group_disabled', 'type' => 'color_group', 'title' => '禁用态 disabled', 'group_title' => '禁用态', 'group_desc' => 'disabled = true 时只读展示当前颜色，不可增删改。', 'default' => ['#94A3B8', '#CBD5E1', '#E2E8F0'], 'disabled' => true, 'width' => '1/2'],
    ],
]);

// 字段展示：Upload / 媒体上传。
\Eva::createSection('eva_demo', [
    'id'     => 'field-upload',
    'title'  => '媒体上传',
    'icon'   => 'ri-folder-image-line',
    'fields' => [
        ['id' => 'upload_image_url', 'type' => 'upload', 'title' => '单图上传', 'desc' => '默认图片上传，return_type = url，保存图片 URL。', 'default' => '', 'library' => 'image', 'button_title' => '选择图片', 'placeholder' => '点击或拖拽图片到此处', 'return_type' => 'url', 'preview' => true, 'width' => '1/2'],
        ['id' => 'upload_image_id', 'type' => 'upload', 'title' => '返回附件 ID', 'desc' => 'return_type = id，保存 WordPress 媒体库附件 ID，适合后端读取图片尺寸或元数据。', 'default' => '', 'library' => 'image', 'button_title' => '选择附件', 'placeholder' => '选择图片并保存附件 ID', 'return_type' => 'id', 'preview' => true, 'width' => '1/2'],
        ['id' => 'upload_image_array', 'type' => 'upload', 'title' => '返回媒体信息', 'desc' => 'return_type = array，保存 id、url、title、mime、width、height 等结构化信息。', 'default' => [], 'library' => 'image', 'button_title' => '选择图片', 'placeholder' => '选择图片并保存完整媒体信息', 'return_type' => 'array', 'preview' => true, 'width' => '1/2'],
        ['id' => 'upload_gallery', 'type' => 'upload', 'title' => '多图上传', 'desc' => 'multiple = true，可选择多张图片；适合相册、轮播图、产品图集。', 'default' => [], 'library' => 'image', 'multiple' => true, 'button_title' => '选择多张图片', 'placeholder' => '点击或拖拽多张图片到此处', 'return_type' => 'array', 'preview' => true, 'width' => '1/2'],
        ['id' => 'upload_file', 'type' => 'upload', 'title' => '文件上传', 'desc' => 'library = file，适合上传 zip、pdf、文档等非图片文件；preview = false 关闭图片预览。', 'default' => '', 'library' => 'file', 'button_title' => '选择文件', 'placeholder' => '点击选择或拖拽文件', 'return_type' => 'url', 'preview' => false, 'max_size' => 10, 'width' => '1/2'],
        ['id' => 'upload_video', 'type' => 'upload', 'title' => '视频上传', 'desc' => 'library = video，可用于上传或选择视频素材；通常关闭图片预览。', 'default' => '', 'library' => 'video', 'button_title' => '选择视频', 'placeholder' => '点击选择或拖拽视频文件', 'return_type' => 'url', 'preview' => false, 'max_size' => 50, 'width' => '1/2'],
        ['id' => 'upload_hide_drop', 'type' => 'upload', 'title' => '隐藏拖拽上传区', 'desc' => 'show_drop = false：专门演示隐藏 eva-media-drop，只保留按钮和媒体库入口。', 'default' => '', 'library' => 'image', 'button_title' => '选择图片', 'placeholder' => '这里不会显示拖拽区', 'return_type' => 'url', 'preview' => true, 'show_drop' => false, 'width' => 'full'],
    ],
]);

// 字段展示：Select / 下拉菜单。
\Eva::createSection('eva_demo', [
    'id'     => 'field-select',
    'title'  => '下拉菜单',
    'icon'   => 'ri-list-check',
    'fields' => [
        ['id' => 'select_basic', 'type' => 'select', 'title' => '基础下拉', 'desc' => '最常见的 key => label 选项写法。', 'default' => 'wide', 'placeholder' => '请选择布局', 'width' => '1/2', 'options' => [
            'wide'  => '宽屏布局',
            'boxed' => '盒装布局',
            'fluid' => '流式布局',
        ]],
        ['id' => 'select_searchable', 'type' => 'select', 'title' => '可搜索下拉', 'desc' => 'searchable = true，适合选项较多的场景。', 'default' => 'sz', 'searchable' => true, 'placeholder' => '搜索城市', 'empty_message' => '没有匹配城市', 'width' => '1/2', 'options' => [
            'bj' => '北京',
            'sh' => '上海',
            'gz' => '广州',
            'sz' => '深圳',
            'hz' => '杭州',
            'nj' => '南京',
            'cd' => '成都',
            'wh' => '武汉',
        ]],
        ['id' => 'select_grouped', 'type' => 'select', 'title' => '分组选项', 'desc' => 'options 可按地区或类型分组，适合层级较清晰的选项。', 'default' => 'sh', 'searchable' => true, 'placeholder' => '请选择地区', 'width' => 'full', 'options' => [
            '华北' => ['bj' => '北京', 'tj' => '天津', 'sjz' => '石家庄'],
            '华东' => ['sh' => '上海', 'hz' => '杭州', 'nj' => '南京', 'su' => '苏州'],
            '华南' => ['gz' => '广州', 'sz' => '深圳', 'xm' => '厦门'],
            '西南' => ['cd' => '成都', 'cq' => '重庆', 'km' => '昆明'],
        ]],
        ['id' => 'select_disabled', 'type' => 'select', 'title' => '禁用选项', 'desc' => '数组对象写法支持 disabled，禁用项会变淡且无法选中。', 'default' => 'pro', 'placeholder' => '请选择套餐', 'width' => 'full', 'options' => [
            ['value' => 'free', 'label' => '免费版'],
            ['value' => 'pro', 'label' => '专业版'],
            ['value' => 'team', 'label' => '团队版（暂不可选）', 'disabled' => true],
            ['value' => 'enterprise', 'label' => '企业版'],
        ]],
        ['id' => 'select_multiple_sortable', 'type' => 'select', 'title' => '多选 + 排序', 'desc' => 'multiple = true 可选多个值；sortable = true 时已选标签可拖拽调整顺序。', 'default' => ['header', 'sidebar'], 'multiple' => true, 'sortable' => true, 'searchable' => true, 'placeholder' => '请选择模块', 'width' => 'full', 'options' => [
            'header'  => '头部模块',
            'hero'    => '首屏模块',
            'sidebar' => '侧边栏',
            'content' => '正文模块',
            'footer'  => '底部模块',
        ]],
        ['id' => 'ajax_select_post', 'type' => 'select', 'ajax' => true, 'title' => '文章查找', 'desc' => '输入关键词后通过 admin-ajax 搜索 post，保存文章 ID。', 'post_type' => 'post', 'placeholder' => '搜索并选择文章', 'search_placeholder' => '输入文章标题关键词…', 'width' => 'full'],
        ['id' => 'ajax_select_page', 'type' => 'select', 'ajax' => true, 'title' => '页面查找', 'desc' => '限制 post_type = page，适合选择落地页、协议页、帮助页。', 'post_type' => 'page', 'placeholder' => '搜索并选择页面', 'search_placeholder' => '输入页面标题关键词…', 'width' => 'full'],
        ['id' => 'ajax_select_content', 'type' => 'select', 'ajax' => true, 'title' => '文章 + 页面查找', 'desc' => 'post_type 可传数组，同时搜索 post 与 page。', 'post_type' => ['post', 'page'], 'placeholder' => '搜索文章或页面', 'search_placeholder' => '输入至少 2 个字符…', 'limit' => 15, 'width' => 'full'],
        ['id' => 'ajax_select_multiple', 'type' => 'select', 'ajax' => true, 'multiple' => true, 'sortable' => true, 'title' => 'AJAX 多选 + 排序', 'desc' => 'AJAX 模式同样支持 multiple / sortable，适合配置相关文章、推荐页面等有顺序的内容列表。', 'post_type' => ['post', 'page'], 'placeholder' => '搜索并选择多个内容', 'search_placeholder' => '输入标题关键词…', 'limit' => 15, 'width' => 'full'],
    ],
]);

// 帮助中心：CSF 里就是个 iframe，直接搬过来即可用。
\Eva::createSection('eva_demo', [
    'id'     => 'renewal-help',
    'title'  => '帮助中心',
    'fields' => [
        ['id' => 'help_doc', 'type' => 'html', 'width' => 'full', 'html' => '<div class="eva-embed"><iframe src="https://docs.9wt.cn/" loading="lazy"></iframe></div>'],
    ],
]);

// 扩展模块 / 版本计划：沿用 CSF 的 callback 页面模式，callback 只输出挂载点。
// 备份恢复可作为 Eva 字段，因为它本身就是一个可复用的单字段应用。
\Eva::createSection('eva_demo', [
    'id'     => 'extended',
    'title'  => '扩展模块',
    'fields' => [
        // callback 字段：运行时执行此闭包，输出会被 prepare_sections 转成 html 注入前端。
        ['id' => 'ext_app', 'type' => 'callback', 'width' => 'full', 'function' => function () {
            // 实时读取已启用扩展数量，演示 callback 可访问运行时数据。
            $mods = (array) get_option('lentasy_enabled_modules', []);
            $on   = array_filter($mods, function ($m) { return ((is_array($m) ? ($m['state'] ?? '') : '') === 'enabled'); });
            echo '<div class="eva-embed-card"><strong>扩展模块 · callback 实时读取</strong>';
            echo '<p class="eva-html-note">已启用扩展：<b>' . count($on) . '</b> 个（来自 option <code>lentasy_enabled_modules</code>）。</p>';
            // 完整扩展市场是主题独立 Vue 应用，这里只放其挂载点。
            echo '<div id="extended" class="extended-page"></div>';
            echo '<p class="eva-html-note">完整扩展市场是主题独立 Vue 应用，挂载点 <code>#extended</code>（REST <code>lf/v2/getallExtendeds</code>），需其前端 JS。</p></div>';
        }],
    ],
]);
// 取当前主题对象，供下方版本计划 callback 通过 use 捕获使用。
$eva_demo_theme = wp_get_theme();
\Eva::createSection('eva_demo', [
    'id'     => 'renewal-version',
    'title'  => '版本计划',
    'fields' => [
        [
            'id'       => 'update_app',
            'type'     => 'callback',
            'width'    => 'full',
            // callback：组装版本/计划/动态数据，输出更新页 Vue 应用的挂载点（带 data-* 传参）。
            'function' => function () use ($eva_demo_theme) {
                // 解析主题目录下的 update_logs.md。
                $logs = eva_demo_parse_update_logs(get_template_directory() . '/update_logs.md');
                // 最新版本：优先取日志首条，否则退回主题头版本号。
                $latest = ! empty($logs[0]['version'])
                    ? 'Version ' . $logs[0]['version']
                    : 'Version ' . ($eva_demo_theme->get('Version') ?: '1.0.0');
                // 自动更新计划（来自各 option）。
                $schedule = [
                    'enabled'   => (bool) get_option('update_schedule_enabled', false),
                    'time'      => get_option('update_schedule_time', '03:00'),
                    'frequency' => get_option('update_schedule_frequency', 'everyday'),
                ];
                // 近期动态。
                $activities = eva_demo_recent_activities($logs, $eva_demo_theme);

                // 输出挂载点：所有数据经 esc_attr/json 编码后塞进 data-* 供前端读取。
                printf(
                    '<div id="update" class="update-blcok" data-eva-update-page="1" data-version="%s" data-last-update="%s" data-latest-version="%s" data-update-info="%s" data-schedule="%s" data-logs="%s" data-activities="%s"></div>',
                    esc_attr($eva_demo_theme->get('Version') ?: '1.0.0'),
                    esc_attr(date('Y-m-d H:i', @filemtime(get_template_directory() . '/style.css') ?: time())),
                    esc_attr($latest),
                    esc_attr($logs ? '读取本地 update_logs.md' : '暂无本地更新日志'),
                    esc_attr(wp_json_encode($schedule)),
                    esc_attr(wp_json_encode($logs)),
                    esc_attr(wp_json_encode($activities))
                );
            },
        ],
    ],
]);
// 备份恢复：单字段应用，演示自定义字段类型 backup。
\Eva::createSection('eva_demo', [
    'id'     => 'backup',
    'title'  => '备份恢复',
    'fields' => [
        ['id' => 'backup_ui', 'type' => 'backup', 'width' => 'full'],
    ],
]);

// 示例功能：与“启用示例功能”开关对应的功能设置页。
\Eva::createSection('eva_demo', [
    'id'     => 'demo-feature',
    'title'  => '示例功能',
    'icon'   => 'ri-flashlight-line',
    'fields' => [
        ['id' => 'feature_enable', 'type' => 'switcher', 'title' => '启用示例功能', 'desc' => '开启后启用本页示例功能；关闭则停用。', 'default' => true, 'width' => '1/3'],
        ['id' => 'feature_badge', 'type' => 'switcher', 'title' => '显示 NEW 角标', 'desc' => '在功能入口显示 NEW 角标。', 'default' => false, 'width' => '1/3'],
        ['id' => 'feature_autorun', 'type' => 'switcher', 'title' => '自动运行', 'desc' => '页面加载后自动执行该功能。', 'default' => false, 'width' => '1/3'],
        ['id' => 'feature_title', 'type' => 'text', 'title' => '功能标题', 'desc' => '显示在前台的功能名称。', 'default' => '我的示例功能', 'placeholder' => '请输入功能标题', 'width' => '1/2'],
        ['id' => 'feature_mode', 'type' => 'select', 'title' => '运行模式', 'desc' => '选择功能的运行模式。', 'default' => 'auto', 'placeholder' => '请选择模式', 'width' => '1/2', 'options' => ['auto' => '自动', 'manual' => '手动', 'schedule' => '定时']],
        ['id' => 'feature_note', 'type' => 'textarea', 'title' => '备注说明', 'desc' => '可填写该功能的备注或使用说明。', 'default' => '', 'placeholder' => '选填', 'width' => 'full'],
    ],
]);
