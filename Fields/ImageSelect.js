/**
 * Eva 字段：image_select。
 *
 * 用途：
 * - 用图片缩略图表达一组互斥选项，适合布局、风格、封面模板等视觉化配置。
 * - 返回值为被选中选项的 value/key 字符串。
 *
 * 字段配置：
 * - `options`：选项表，支持 `{ key: { label, url } }` 或 `[{ value, label, url }]`。
 * - `columns`：期望列数，默认自适应；`min_width` 可控制卡片最小宽度。
 * - `aspect_ratio` / `preview_height` / `object_fit`：控制缩略图比例、高度与裁切方式。
 * - `show_label` / `show_desc` / `zoom`：控制标题、描述与放大预览。
 * - `disabled`：禁用整个字段；单个 option 也可设置 disabled。
 */
(function () {
  window.EvaFields = window.EvaFields || {};

  function tv(value) {
    return window.EvaI18n && window.EvaI18n.tv ? window.EvaI18n.tv(value) : (value || '');
  }

  function cssSize(value) {
    if (value == null || value === '') { return ''; }
    return /^\d+$/.test(String(value)) ? String(value) + 'px' : String(value);
  }

  function cssRatio(value) {
    if (value == null || value === '') { return '16 / 9'; }
    return String(value).replace(':', ' / ');
  }

  function normalizeOption(key, item, index) {
    var isObject = item && typeof item === 'object' && !Array.isArray(item);
    var value = isObject
      ? (item.value != null ? item.value : (item.id != null ? item.id : key))
      : (typeof key === 'string' ? key : item);

    if (value == null || value === '') {
      value = index;
    }

    return {
      value: String(value),
      label: isObject ? (item.label || item.title || value) : (typeof key === 'string' ? key : value),
      desc: isObject ? (item.desc || item.description || '') : '',
      url: isObject ? (item.url || item.image || item.src || item.thumbnail || '') : (typeof item === 'string' ? item : ''),
      disabled: !!(isObject && item.disabled)
    };
  }

  window.EvaFields.image_select = {
    props: ['field', 'modelValue'],
    emits: ['update:modelValue'],
    data: function () {
      return { zoomOption: null };
    },
    computed: {
      options: function () {
        var raw = this.field.options || [];
        if (Array.isArray(raw)) {
          return raw.map(function (item, index) {
            return normalizeOption(index, item, index);
          });
        }
        if (raw && typeof raw === 'object') {
          return Object.keys(raw).map(function (key, index) {
            return normalizeOption(key, raw[key], index);
          });
        }
        return [];
      },
      gridStyle: function () {
        var columns = parseInt(this.field.columns || this.field.cols || 0, 10);
        var minWidth = this.field.min_width || this.field.minWidth || '138px';
        var previewHeight = cssSize(this.field.preview_height || this.field.previewHeight || this.field.image_height || this.field.imageHeight);
        var style = {
          '--eva-is-ratio': cssRatio(this.field.aspect_ratio || this.field.aspectRatio || this.field.ratio),
          '--eva-is-fit': this.field.object_fit || this.field.objectFit || this.field.fit || 'cover'
        };
        if (previewHeight) {
          style['--eva-is-height'] = previewHeight;
        }
        minWidth = cssSize(minWidth);
        if (columns > 0) {
          style.gridTemplateColumns = 'repeat(' + columns + ', minmax(0, 1fr))';
          return style;
        }
        style.gridTemplateColumns = 'repeat(auto-fit, minmax(' + minWidth + ', 1fr))';
        return style;
      },
      showLabel: function () {
        return this.field.show_label !== false && this.field.showLabel !== false;
      },
      showDesc: function () {
        return this.field.show_desc !== false && this.field.showDesc !== false;
      },
      zoomEnabled: function () {
        return this.field.zoom !== false && this.field.lightbox !== false;
      }
    },
    methods: {
      tv: tv,
      isSelected: function (option) {
        return String(this.modelValue == null ? '' : this.modelValue) === option.value;
      },
      choose: function (option) {
        if (this.field.disabled || option.disabled) {
          return;
        }
        this.$emit('update:modelValue', option.value);
      },
      openZoom: function (option) {
        if (!option.url) {
          return;
        }
        this.zoomOption = option;
      },
      closeZoom: function () {
        this.zoomOption = null;
      }
    },
    template: [
      '<div class="eva-image-select" :class="{ \'is-disabled\': field.disabled }" :style="gridStyle" role="radiogroup" :aria-label="tv(field.title) || \'Image Select\'">',
      '  <div v-for="option in options" :key="option.value" class="eva-is-card" :class="{ \'is-selected\': isSelected(option), \'is-disabled\': field.disabled || option.disabled }" role="radio" :aria-checked="isSelected(option) ? \'true\' : \'false\'" :aria-disabled="field.disabled || option.disabled ? \'true\' : \'false\'" :tabindex="field.disabled || option.disabled ? -1 : 0" @click="choose(option)" @keydown.enter.prevent="choose(option)" @keydown.space.prevent="choose(option)">',
      '    <span class="eva-is-preview">',
      '      <img v-if="option.url" :src="option.url" :alt="tv(option.label)">',
      '      <span v-else class="eva-is-placeholder"><i class="ri-image-line"></i></span>',
      '      <button v-if="option.url && zoomEnabled && !field.disabled && !option.disabled" type="button" class="eva-is-zoom" :aria-label="\'放大 \' + tv(option.label)" @click.stop="openZoom(option)" @keydown.enter.stop.prevent="openZoom(option)" @keydown.space.stop.prevent="openZoom(option)"><i class="ri-zoom-in-line"></i></button>',
      '      <i v-if="isSelected(option)" class="eva-is-check ri-check-line" aria-hidden="true"></i>',
      '    </span>',
      '    <strong v-if="showLabel">{{ tv(option.label) }}</strong>',
      '    <em v-if="showDesc && tv(option.desc)">{{ tv(option.desc) }}</em>',
      '  </div>',
      '  <p v-if="!options.length" class="eva-is-empty">{{ tv(field.empty_message || field.emptyMessage || \'暂无可选图片\') }}</p>',
      '  <div v-if="zoomOption" class="eva-is-lightbox" role="dialog" aria-modal="true" @click.self="closeZoom">',
      '    <div class="eva-is-lightbox-card">',
      '      <button type="button" class="eva-is-lightbox-close" aria-label="关闭预览" @click="closeZoom"><i class="ri-close-line"></i></button>',
      '      <img :src="zoomOption.url" :alt="tv(zoomOption.label)">',
      '      <strong>{{ tv(zoomOption.label) }}</strong>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n')
  };
})();
