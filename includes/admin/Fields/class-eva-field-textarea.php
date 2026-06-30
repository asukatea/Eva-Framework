<?php

namespace Eva\Framework\Admin\Fields;

// 阻断对该文件的直接 HTTP 访问，必须经由 WordPress 加载。
if (! defined('ABSPATH')) {
    exit;
}

/**
 * textarea 字段的 PHP 处理器。
 *
 * 对应前端 `Fields/Textarea.js`，负责多行文本在保存前的清洗。
 */
class Textarea
{
    /**
     * 功能：清洗多行文本并保留换行。
     *
     * @param mixed $value 原始字段值。
     * @param array $field 字段配置。
     * @return string
     */
    public static function sanitize($value, $field = [])
    {
        return sanitize_textarea_field((string) $value);
    }
}
