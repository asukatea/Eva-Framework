<?php

namespace Eva\Framework\Admin\Fields;

// 阻断对该文件的直接 HTTP 访问，必须经由 WordPress 加载。
if (! defined('ABSPATH')) {
    exit;
}

/**
 * backup 字段的 PHP 处理器。
 *
 * 对应前端 `Fields/Backup.js`，该字段的真实数据由主题备份接口维护，
 * Eva 保存层只保留兼容性的文本兜底清洗。
 */
class Backup
{
    /**
     * 功能：保持备份字段在设置保存时的兼容兜底值。
     *
     * @param mixed $value 原始字段值。
     * @param array $field 字段配置。
     * @return string
     */
    public static function sanitize($value, $field = [])
    {
        return Text::sanitize($value, $field);
    }
}
