/**
 * Eva UI 库 · eva-color（颜色选择器）。
 *
 * 支持 HEX / RGBA 输出、透明度、预设色板和拖拽选择。组件只负责 UI 与字符串值，
 * 字段包装层负责把 Eva field schema 转成 props。
 */
(function () {
  if (typeof window === 'undefined') { return; }
  window.EvaUI = window.EvaUI || {};

  // Purpose: Clamp a number to a min/max range.
  function Clamp(n, min, max) {
    n = Number(n);
    if (Number.isNaN(n)) { n = min; }
    return Math.min(max, Math.max(min, n));
  }

  // Purpose: Format an RGB channel as two hex digits.
  function Pad_Hex(n) {
    var s = Clamp(Math.round(n), 0, 255).toString(16).toUpperCase();
    return s.length === 1 ? '0' + s : s;
  }

  // Purpose: Convert RGB values into a HEX color string.
  function Rgb_To_Hex(rgb) {
    return '#' + Pad_Hex(rgb.r) + Pad_Hex(rgb.g) + Pad_Hex(rgb.b);
  }

  // Purpose: Parse a HEX color string into RGB values.
  function Hex_To_Rgb(hex) {
    var v = String(hex || '').trim().replace(/^#/, '');
    if (v.length === 3) {
      v = v.charAt(0) + v.charAt(0) + v.charAt(1) + v.charAt(1) + v.charAt(2) + v.charAt(2);
    }
    if (!/^[0-9a-fA-F]{6}$/.test(v)) { return null; }
    return {
      r: parseInt(v.slice(0, 2), 16),
      g: parseInt(v.slice(2, 4), 16),
      b: parseInt(v.slice(4, 6), 16)
    };
  }

  // Purpose: Convert RGB values into HSV picker coordinates.
  function Rgb_To_Hsv(rgb) {
    var r = Clamp(rgb.r, 0, 255) / 255;
    var g = Clamp(rgb.g, 0, 255) / 255;
    var b = Clamp(rgb.b, 0, 255) / 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var d = max - min;
    var h = 0;
    if (d !== 0) {
      if (max === r) {
        h = ((g - b) / d) % 6;
      } else if (max === g) {
        h = (b - r) / d + 2;
      } else {
        h = (r - g) / d + 4;
      }
      h *= 60;
      if (h < 0) { h += 360; }
    }
    return { h: h, s: max === 0 ? 0 : d / max, v: max };
  }

  // Purpose: Convert HSV picker coordinates back into RGB values.
  function Hsv_To_Rgb(h, s, v) {
    h = ((Clamp(h, 0, 360) % 360) + 360) % 360;
    s = Clamp(s, 0, 1);
    v = Clamp(v, 0, 1);
    var c = v * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = v - c;
    var r = 0;
    var g = 0;
    var b = 0;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }

  // Purpose: Parse HEX or RGBA text into color picker state.
  function Parse_Color(value) {
    var raw = String(value || '').trim();
    var rgb = null;
    var alpha = 1;
    var format = /^rgba/i.test(raw) ? 'rgba' : 'hex';
    var m = raw.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i);
    if (m) {
      rgb = {
        r: Clamp(parseFloat(m[1]), 0, 255),
        g: Clamp(parseFloat(m[2]), 0, 255),
        b: Clamp(parseFloat(m[3]), 0, 255)
      };
      alpha = m[4] === undefined ? 1 : Clamp(parseFloat(m[4]), 0, 1);
    } else {
      rgb = Hex_To_Rgb(raw);
    }
    if (!rgb) { return null; }
    var hsv = Rgb_To_Hsv(rgb);
    return { h: hsv.h, s: hsv.s, v: hsv.v, a: alpha, format: format };
  }

  // Purpose: Format alpha values without redundant trailing zeros.
  function Alpha_Text(a) {
    return String(Math.round(Clamp(a, 0, 1) * 1000) / 1000).replace(/0+$/, '').replace(/\.$/, '');
  }

  window.EvaUI.Color = {
    props: {
      modelValue: { type: String, default: '' },
      alpha: { type: Boolean, default: true },
      presets: { type: Array, default: function () { return []; } },
      placeholder: { type: String, default: '' },
      defaultValue: { type: String, default: '' },
      mode: { type: String, default: 'popover' },
      size: { type: String, default: 'medium' },
      defaultFormat: { type: String, default: 'hex' },
      formats: { type: Array, default: function () { return []; } },
      showInput: { type: Boolean, default: true },
      showFormat: { type: Boolean, default: true },
      showPresets: { type: Boolean, default: true },
      clearable: { type: Boolean, default: true },
      resettable: { type: Boolean, default: true },
      disabled: { type: Boolean, default: false },
      paletteLabel: { type: String, default: '' },
      clearText: { type: String, default: '清除' },
      applyText: { type: String, default: '应用' },
      defaultText: { type: String, default: '默认' },
      popoverWidth: { type: [String, Number], default: '' },
      boardHeight: { type: [String, Number], default: '' },
      presetShape: { type: String, default: 'square' }
    },
    emits: ['update:modelValue'],
    // Purpose: Initialize component state and exposed reactive data.
    data: function () {
      return {
        open: false,
        h: 340,
        s: 0.7,
        v: 1,
        a: 1,
        format: 'hex',
        inputText: '',
        dragging: null
      };
    },
    computed: {
      // Purpose: Handle rgb behavior.
      rgb: function () {
        return Hsv_To_Rgb(this.h, this.s, this.v);
      },
      // Purpose: Handle draft Text behavior.
      draftText: function () {
        if (this.format === 'rgba') {
          return 'rgba(' + this.rgb.r + ', ' + this.rgb.g + ', ' + this.rgb.b + ', ' + Alpha_Text(this.a) + ')';
        }
        return Rgb_To_Hex(this.rgb);
      },
      // Purpose: Handle swatch Style behavior.
      swatchStyle: function () {
        var value = this.modelValue || this.defaultValue || this.draftText;
        return { background: value || 'transparent' };
      },
      // Purpose: Handle panel Style behavior.
      panelStyle: function () {
        return { background: 'hsl(' + Math.round(this.h) + ', 100%, 50%)' };
      },
      // Purpose: Handle sat Pointer Style behavior.
      satPointerStyle: function () {
        return { left: (this.s * 100) + '%', top: ((1 - this.v) * 100) + '%' };
      },
      // Purpose: Handle hue Pointer Style behavior.
      huePointerStyle: function () {
        return { left: (this.h / 360 * 100) + '%' };
      },
      // Purpose: Handle alpha Pointer Style behavior.
      alphaPointerStyle: function () {
        return { left: (this.a * 100) + '%' };
      },
      // Purpose: Handle alpha Track Style behavior.
      alphaTrackStyle: function () {
        var rgb = this.rgb;
        return {
          background: 'linear-gradient(90deg, rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', 0), rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', 1))'
        };
      },
      // Purpose: Check is Inline state.
      isInline: function () {
        return this.mode === 'inline';
      },
      // Purpose: Handle panel Open behavior.
      panelOpen: function () {
        return this.isInline || this.open;
      },
      // Purpose: Handle color Class behavior.
      colorClass: function () {
        var size = ['small', 'medium', 'large'].indexOf(this.size) !== -1 ? this.size : 'medium';
        var shape = this.presetShape === 'circle' ? 'circle' : 'square';
        return {
          'is-open': this.panelOpen,
          'is-inline': this.isInline,
          'is-disabled': this.disabled,
          'is-small': size === 'small',
          'is-large': size === 'large',
          'has-circle-presets': shape === 'circle'
        };
      },
      // Purpose: Handle style Vars behavior.
      styleVars: function () {
        var out = {};
        if (this.popoverWidth) {
          out['--eva-color-popover-width'] = typeof this.popoverWidth === 'number' ? this.popoverWidth + 'px' : this.popoverWidth;
        }
        if (this.boardHeight) {
          out['--eva-color-board-height'] = typeof this.boardHeight === 'number' ? this.boardHeight + 'px' : this.boardHeight;
        }
        return out;
      },
      // Purpose: Handle allowed Formats behavior.
      allowedFormats: function () {
        var raw = this.formats && this.formats.length ? this.formats : [this.defaultFormat || 'hex', 'rgba'];
        var out = [];
        raw.forEach(function (item) {
          item = String(item || '').toLowerCase();
          if (item === 'hex' || item === 'rgba') { out.push(item); }
        });
        if (!this.alpha) { out = out.filter(function (item) { return item === 'hex'; }); }
        if (!out.length) { out.push('hex'); }
        return out.filter(function (item, index) { return out.indexOf(item) === index; });
      },
      // Purpose: Format format Options for display.
      formatOptions: function () {
        var out = {};
        this.allowedFormats.forEach(function (item) { out[item] = item.toUpperCase(); });
        return out;
      },
      // Purpose: Check can Select Format state.
      canSelectFormat: function () {
        return this.showFormat && this.allowedFormats.length > 1;
      },
      // Purpose: Normalize normalized Presets data.
      normalizedPresets: function () {
        var fallback = ['#FF4D7F', '#EF4444', '#F97316', '#FACC15', '#22C55E', '#38BDF8', '#3B82F6', '#8B5CF6', '#64748B'];
        return (this.presets && this.presets.length ? this.presets : fallback).filter(function (c) {
          return !!Parse_Color(c);
        });
      }
    },
    watch: {
      modelValue: {
        immediate: true,
        // Purpose: React to watched value changes.
        handler: function (value) {
          this.inputText = value || '';
          this.syncDraft(value || this.defaultValue);
        }
      },
      // Purpose: Handle alpha behavior.
      alpha: function (enabled) {
        if (!enabled && this.format === 'rgba') {
          this.format = 'hex';
          this.a = 1;
        }
      },
      // Purpose: Handle allowed Formats behavior.
      allowedFormats: function () {
        if (this.allowedFormats.indexOf(this.format) === -1) {
          this.format = this.allowedFormats[0] || 'hex';
        }
      }
    },
    // Purpose: Run component mount initialization.
    mounted: function () {
      document.addEventListener('mousedown', this.onDocumentDown, true);
      document.addEventListener('touchstart', this.onDocumentDown, true);
    },
    // Purpose: Clean up listeners, timers, or temporary state before unmount.
    beforeUnmount: function () {
      this.stopDrag();
      document.removeEventListener('mousedown', this.onDocumentDown, true);
      document.removeEventListener('touchstart', this.onDocumentDown, true);
    },
    methods: {
      // Purpose: Handle sync Draft behavior.
      syncDraft: function (value) {
        var parsed = Parse_Color(value);
        if (!parsed) {
          var desired = String(this.defaultFormat || this.format || 'hex').toLowerCase();
          this.format = this.allowedFormats.indexOf(desired) !== -1 ? desired : (this.allowedFormats[0] || 'hex');
          return;
        }
        this.h = parsed.h;
        this.s = parsed.s;
        this.v = parsed.v;
        this.a = this.alpha ? parsed.a : 1;
        this.format = this.allowedFormats.indexOf(parsed.format) !== -1 ? parsed.format : (this.allowedFormats[0] || 'hex');
      },
      // Purpose: Toggle toggle state.
      toggle: function () {
        if (this.disabled || this.isInline) { return; }
        this.open = !this.open;
        if (this.open) { this.syncDraft(this.modelValue || this.defaultValue); }
      },
      // Purpose: Close close UI or state.
      close: function () {
        this.open = false;
      },
      // Purpose: Handle on Document Down behavior.
      onDocumentDown: function (event) {
        if (this.isInline || !this.open || !this.$el || this.$el.contains(event.target)) { return; }
        this.close();
      },
      // Purpose: Handle commit Text behavior.
      commitText: function () {
        if (this.disabled) { return; }
        var parsed = Parse_Color(this.inputText);
        if (!parsed) {
          this.inputText = this.modelValue || '';
          return;
        }
        this.syncDraft(this.inputText);
        this.apply();
      },
      // Purpose: Handle reset behavior.
      reset: function () {
        if (this.disabled) { return; }
        var value = this.defaultValue || '';
        this.$emit('update:modelValue', value);
        this.inputText = value;
        this.syncDraft(value);
      },
      // Purpose: Handle clear behavior.
      clear: function () {
        if (this.disabled) { return; }
        this.$emit('update:modelValue', '');
        this.inputText = '';
        if (!this.isInline) { this.close(); }
      },
      // Purpose: Handle apply behavior.
      apply: function () {
        if (this.disabled) { return; }
        var value = this.draftText;
        this.$emit('update:modelValue', value);
        this.inputText = value;
        if (!this.isInline) { this.close(); }
      },
      // Purpose: Update set Format Value state.
      setFormatValue: function (value) {
        if (this.disabled) { return; }
        this.format = this.allowedFormats.indexOf(value) !== -1 ? value : (this.allowedFormats[0] || 'hex');
      },
      // Purpose: Update set Preset state.
      setPreset: function (color) {
        if (this.disabled) { return; }
        this.syncDraft(color);
      },
      // Purpose: Handle point behavior.
      point: function (event, el) {
        var e = event.touches && event.touches.length ? event.touches[0] : event;
        var rect = el.getBoundingClientRect();
        return {
          x: Clamp((e.clientX - rect.left) / rect.width, 0, 1),
          y: Clamp((e.clientY - rect.top) / rect.height, 0, 1)
        };
      },
      // Purpose: Update set Sv state.
      setSv: function (event) {
        var p = this.point(event, event.currentTarget || this.dragging.el);
        this.s = p.x;
        this.v = 1 - p.y;
      },
      // Purpose: Update set Hue state.
      setHue: function (event) {
        var p = this.point(event, event.currentTarget || this.dragging.el);
        this.h = p.x * 360;
      },
      // Purpose: Update set Alpha state.
      setAlpha: function (event) {
        if (!this.alpha) { return; }
        var p = this.point(event, event.currentTarget || this.dragging.el);
        this.a = p.x;
      },
      // Purpose: Handle start Drag behavior.
      startDrag: function (event, kind) {
        if (this.disabled) { return; }
        event.preventDefault();
        var el = event.currentTarget;
        var self = this;
        var move = function (e) {
          if (kind === 'sv') { self.setSvWithEl(e, el); }
          if (kind === 'hue') { self.setHueWithEl(e, el); }
          if (kind === 'alpha') { self.setAlphaWithEl(e, el); }
        };
        var up = function () { self.stopDrag(); };
        this.dragging = { move: move, up: up };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
        document.addEventListener('touchmove', move, { passive: false });
        document.addEventListener('touchend', up);
        move(event);
      },
      // Purpose: Update set Sv With El state.
      setSvWithEl: function (event, el) {
        var p = this.point(event, el);
        this.s = p.x;
        this.v = 1 - p.y;
      },
      // Purpose: Update set Hue With El state.
      setHueWithEl: function (event, el) {
        var p = this.point(event, el);
        this.h = p.x * 360;
      },
      // Purpose: Update set Alpha With El state.
      setAlphaWithEl: function (event, el) {
        if (!this.alpha) { return; }
        var p = this.point(event, el);
        this.a = p.x;
      },
      // Purpose: Handle stop Drag behavior.
      stopDrag: function () {
        if (!this.dragging) { return; }
        document.removeEventListener('mousemove', this.dragging.move);
        document.removeEventListener('mouseup', this.dragging.up);
        document.removeEventListener('touchmove', this.dragging.move);
        document.removeEventListener('touchend', this.dragging.up);
        this.dragging = null;
      }
    },
    template: [
      '<div class="eva-color" :class="colorClass" :style="styleVars">',
      '  <div class="eva-color-control">',
      '    <button type="button" class="eva-color-swatch" :disabled="disabled" :style="swatchStyle" @click="toggle" aria-label="选择颜色"></button>',
      '    <input v-if="showInput" class="eva-color-input" :disabled="disabled" :placeholder="placeholder || \'#FF4D7F\'" v-model="inputText" @change="commitText" @keydown.enter.prevent="commitText">',
      '    <div v-if="canSelectFormat" class="eva-color-format"><eva-select :options="formatOptions" :searchable="false" :model-value="format" @update:model-value="setFormatValue"></eva-select></div>',
      '    <button v-if="resettable" type="button" class="eva-color-reset" :disabled="disabled" @click="reset">{{ defaultText }}</button>',
      '  </div>',
      '  <div v-show="panelOpen" class="eva-color-popover">',
      '    <div class="eva-color-pop-head">',
      '      <span class="eva-color-pop-swatch" :style="{ background: draftText }"></span>',
      '      <strong>{{ draftText }}</strong>',
      '      <span>{{ format.toUpperCase() }}</span>',
      '    </div>',
      '    <div class="eva-color-board" :style="panelStyle" @mousedown="startDrag($event, \'sv\')" @touchstart="startDrag($event, \'sv\')">',
      '      <span class="eva-color-board-white"></span>',
      '      <span class="eva-color-board-black"></span>',
      '      <span class="eva-color-pointer" :style="satPointerStyle"></span>',
      '    </div>',
      '    <div class="eva-color-slider eva-color-hue" @mousedown="startDrag($event, \'hue\')" @touchstart="startDrag($event, \'hue\')">',
      '      <span class="eva-color-slider-point" :style="huePointerStyle"></span>',
      '    </div>',
      '    <div v-if="alpha" class="eva-color-slider eva-color-alpha" @mousedown="startDrag($event, \'alpha\')" @touchstart="startDrag($event, \'alpha\')">',
      '      <span class="eva-color-alpha-bg"></span>',
      '      <span class="eva-color-alpha-fill" :style="alphaTrackStyle"></span>',
      '      <span class="eva-color-slider-point" :style="alphaPointerStyle"></span>',
      '      <em>{{ Math.round(a * 100) }}%</em>',
      '    </div>',
      '    <div v-if="showPresets" class="eva-color-presets-wrap">',
      '      <div v-if="paletteLabel" class="eva-color-presets-title">{{ paletteLabel }}</div>',
      '      <div class="eva-color-presets">',
      '      <button v-for="preset in normalizedPresets" :key="preset" type="button" :style="{ background: preset }" @click="setPreset(preset)" :aria-label="preset"></button>',
      '      </div>',
      '    </div>',
      '    <div class="eva-color-actions">',
      '      <button v-if="clearable" type="button" class="eva-color-btn" :disabled="disabled" @click="clear">{{ clearText }}</button>',
      '      <button type="button" class="eva-color-btn is-primary" :disabled="disabled" @click="apply">{{ applyText }}</button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n')
  };
})();
