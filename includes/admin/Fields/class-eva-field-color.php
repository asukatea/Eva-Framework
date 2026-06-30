<?php

namespace Eva\Framework\Admin\Fields;

// 阻断对该文件的直接 HTTP 访问，必须经由 WordPress 加载。
if (! defined('ABSPATH')) {
    exit;
}

/**
 * color 字段的 PHP 处理器。
 *
 * 对应前端 `Fields/Color.js` 与 `Libraries/Color/Color.js`，负责颜色字符串清洗。
 */
class Color
{
    /**
     * 功能：仅允许 HEX、rgb() 或 rgba() 颜色字符串保存。
     *
     * @param mixed $value 原始字段值。
     * @param array $field 字段配置。
     * @return string
     */
    public static function sanitize($value, $field = [])
    {
        $value = trim((string) $value);
        if ($value === '') {
            return '';
        }

        if (preg_match('/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $value)) {
            return strtoupper($value);
        }

        if (preg_match('/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i', $value, $m)) {
            $r = max(0, min(255, (int) round((float) $m[1])));
            $g = max(0, min(255, (int) round((float) $m[2])));
            $b = max(0, min(255, (int) round((float) $m[3])));
            if (isset($m[4]) && $m[4] !== '') {
                $a = max(0, min(1, (float) $m[4]));
                $a = rtrim(rtrim(number_format($a, 3, '.', ''), '0'), '.');
                return 'rgba(' . $r . ', ' . $g . ', ' . $b . ', ' . $a . ')';
            }
            return 'rgb(' . $r . ', ' . $g . ', ' . $b . ')';
        }

        return '';
    }
}
