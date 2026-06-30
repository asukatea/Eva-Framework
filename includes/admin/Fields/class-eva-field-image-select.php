<?php

namespace Eva\Framework\Admin\Fields;

// 阻断对该文件的直接 HTTP 访问，必须经由 WordPress 加载。
if (! defined('ABSPATH')) {
    exit;
}

/**
 * image_select 字段的 PHP 处理器。
 *
 * 对应前端 `Fields/ImageSelect.js`，负责校验图像选项值是否来自字段配置。
 */
class Image_Select
{
    /**
     * 功能：只允许保存 options 中声明过的图像选项值。
     *
     * @param array $field 字段配置。
     * @param mixed $value 原始字段值。
     * @return string
     */
    public static function sanitize($field, $value)
    {
        $allowed = self::image_select_values(isset($field['options']) ? $field['options'] : []);
        $value = sanitize_text_field((string) $value);

        if (in_array($value, $allowed, true)) {
            return $value;
        }

        $default = isset($field['default']) ? sanitize_text_field((string) $field['default']) : '';
        return in_array($default, $allowed, true) ? $default : '';
    }

    /**
     * 功能：从 image_select 的 options 配置中提取允许保存的值。
     *
     * @param mixed $options 字段选项配置。
     * @return string[]
     */
    private static function image_select_values($options)
    {
        if (! is_array($options)) {
            return [];
        }

        $values = [];
        foreach ($options as $key => $item) {
            if (is_array($item)) {
                if (isset($item['value'])) {
                    $values[] = sanitize_text_field((string) $item['value']);
                } elseif (isset($item['id'])) {
                    $values[] = sanitize_text_field((string) $item['id']);
                } elseif (! is_int($key)) {
                    $values[] = sanitize_text_field((string) $key);
                }
                continue;
            }

            $raw_value = is_int($key)
                ? (is_scalar($item) ? $item : '')
                : $key;
            $values[] = sanitize_text_field((string) $raw_value);
        }

        return array_values(array_unique(array_filter($values, static function ($value) {
            return $value !== '';
        })));
    }
}
