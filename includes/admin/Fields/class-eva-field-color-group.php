<?php

namespace Eva\Framework\Admin\Fields;

// 阻断对该文件的直接 HTTP 访问，必须经由 WordPress 加载。
if (! defined('ABSPATH')) {
    exit;
}

/**
 * color_group 字段的 PHP 处理器。
 *
 * 对应前端 `Fields/ColorGroup.js`，负责成组颜色值在保存前的清洗。
 */
class Color_Group
{
    /**
     * 功能：清洗颜色数组，仅保留合法颜色并重排索引。
     *
     * @param mixed $value 原始字段值。
     * @param array $field 字段配置。
     * @return array<int,string>
     */
    public static function sanitize($value, $field = [])
    {
        if (! is_array($value)) {
            return [];
        }

        $out = [];
        foreach ($value as $item) {
            $color = Color::sanitize($item);
            if ($color !== '') {
                $out[] = $color;
            }
        }

        return array_values($out);
    }
}
