# Eva Framework

Eva Framework is a lightweight and modern WordPress admin settings framework.
It provides CSF-like registration APIs, Vue 3 powered field components,
standalone full-screen admin pages, and reusable UI libraries for building
beautiful WordPress option panels.

> 中文文档: [README.md](README.md)

## Features

- CSF-like APIs for options pages, sections, fields, metaboxes, taxonomies, user profiles, comments, customizer panels, shortcodes, and widgets.
- Vue 3 powered admin UI with reusable field components.
- Standalone full-screen settings pages outside the default WordPress admin layout.
- Built-in fields including text, textarea, switcher, select, color, color_group, icon, upload, image_select, accordion, html, backup, and more.
- Reusable UI libraries for selects, color picking, icon picking, media picking, accordion panels, and other admin interactions.
- Centralized PHP sanitization for saved settings and meta values.

## Usage

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

## Requirements

- WordPress 6.0+
- PHP 8.0+

## License

GPL-2.0-or-later
