# Eva Framework

Eva Framework 是一个轻量、现代的 WordPress 后台设置框架，提供类 CSF 的注册 API、Vue 3 驱动的字段组件、独立全屏设置页，以及可复用的 UI 库，用于快速构建漂亮、易维护的 WordPress 选项面板。

> English version is available below.

## 中文说明

### 特性

- 类 CSF 的注册 API，支持 options、section、field、metabox、taxonomy、profile、comment、customizer、shortcode、widget 等容器。
- Vue 3 驱动的后台 UI，字段组件按类型分发渲染，便于扩展和维护。
- 支持脱离默认 WordPress 后台布局的独立全屏设置页。
- 内置常用字段：text、textarea、number、switcher、select、checkbox、radio、color、icon、upload、accordion、group、repeater 等。
- 提供可复用 UI 库：Select、Color、Icon Picker、Media、Accordion 等。
- PHP 端集中处理数据清洗，保存 option/meta 时更安全。

### 使用示例

```php
\Eva::createOptions('my_panel', [
    'menu_title' => '我的面板',
    'menu_slug'  => 'my-panel',
    'standalone' => true,
]);

\Eva::createSection('my_panel', [
    'id'     => 'general',
    'title'  => '基础设置',
    'fields' => [
        [
            'id'      => 'site_title',
            'type'    => 'text',
            'title'   => '站点标题',
            'default' => '',
        ],
    ],
]);
```

### 环境要求

- WordPress 6.0+
- PHP 8.0+

### 许可证

GPL-2.0-or-later

---

## English

Eva Framework is a lightweight and modern WordPress admin settings framework.
It provides CSF-like registration APIs, Vue 3 powered field components,
standalone full-screen admin pages, and reusable UI libraries for building
beautiful WordPress option panels.

### Features

- CSF-like APIs for options pages, sections, fields, metaboxes, taxonomies, user profiles, comments, customizer panels, shortcodes, and widgets.
- Vue 3 powered admin UI with reusable field components.
- Standalone full-screen settings pages outside the default WordPress admin layout.
- Built-in fields including text, textarea, number, switcher, select, checkbox, radio, color, icon, upload, accordion, group, repeater, and more.
- Reusable UI libraries for selects, color picking, icon picking, media picking, accordion panels, and other admin interactions.
- Centralized PHP sanitization for saved settings and meta values.

### Usage

```php
\Eva::createOptions('my_panel', [
    'menu_title' => 'My Panel',
    'menu_slug'  => 'my-panel',
    'standalone' => true,
]);

\Eva::createSection('my_panel', [
    'id'     => 'general',
    'title'  => 'General',
    'fields' => [
        [
            'id'      => 'site_title',
            'type'    => 'text',
            'title'   => 'Site Title',
            'default' => '',
        ],
    ],
]);
```

### Requirements

- WordPress 6.0+
- PHP 8.0+

### License

GPL-2.0-or-later
