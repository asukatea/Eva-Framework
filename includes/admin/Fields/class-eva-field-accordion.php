<?php

namespace Eva\Framework\Admin\Fields;

// 阻断对该文件的直接 HTTP 访问，必须经由 WordPress 加载。
if (! defined('ABSPATH')) {
    exit;
}

/**
 * accordion 字段的 PHP 处理器。
 *
 * 对应前端 `Fields/Accordion.js`，负责按每个折叠面板的子字段 schema 递归清洗。
 */
class Accordion
{
    /**
     * 功能：按 accordion 每个 section 的 fields 子 schema 递归清洗保存值。
     *
     * @param array $field 字段配置。
     * @param mixed $value 原始字段值。
     * @return array
     */
    public static function sanitize($field, $value)
    {
        $raw = is_array($value) ? $value : [];
        $clean = [];
        $sections = isset($field['sections']) && is_array($field['sections']) ? $field['sections'] : [];

        foreach ($sections as $index => $section) {
            $section_id = isset($section['id']) && $section['id'] !== ''
                ? (string) $section['id']
                : (string) $index;

            $section_raw = isset($raw[$section_id]) && is_array($raw[$section_id])
                ? $raw[$section_id]
                : [];

            $clean[$section_id] = \Eva\Framework\Data::sanitize_by_sections([
                [
                    'fields' => isset($section['fields']) && is_array($section['fields'])
                        ? $section['fields']
                        : [],
                ],
            ], $section_raw);
        }

        return $clean;
    }
}
