<?php

namespace Eva\Framework\Admin\Fields;

// 阻断对该文件的直接 HTTP 访问，必须经由 WordPress 加载。
if (! defined('ABSPATH')) {
    exit;
}

/**
 * switcher 字段的 PHP 处理器。
 *
 * 对应前端 `Fields/Switcher.js`，负责把开关状态保存为稳定的 1/0。
 */
class Switcher
{
    /**
     * 功能：把布尔、数字或字符串开关值规整为 1 或 0。
     *
     * @param mixed $value 原始字段值。
     * @param array $field 字段配置。
     * @return int
     */
    public static function sanitize($value, $field = [])
    {
        return ($value === true || $value === 1 || $value === '1') ? 1 : 0;
    }
}
