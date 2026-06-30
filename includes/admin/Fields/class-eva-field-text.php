<?php

namespace Eva\Framework\Admin\Fields;

// 阻断对该文件的直接 HTTP 访问，必须经由 WordPress 加载。
if (! defined('ABSPATH')) {
    exit;
}

/**
 * text 字段的 PHP 处理器。
 *
 * 对应前端 `Fields/Text.js`，负责单行文本在保存前的清洗。
 */
class Text
{
    /**
     * 功能：把任意输入规整为安全的单行文本。
     *
     * @param mixed $value 原始字段值。
     * @param array $field 字段配置。
     * @return string
     */
    public static function sanitize($value, $field = [])
    {
        return sanitize_text_field((string) $value);
    }
}
