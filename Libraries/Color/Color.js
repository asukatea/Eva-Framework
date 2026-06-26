/**
 * Eva UI 库 · eva-color（颜色选择器）。
 *
 * 支持 HEX / RGBA 输出、透明度、预设色板和拖拽选择。组件只负责 UI 与字符串值，
 * 字段包装层负责把 Eva field schema 转成 props。
 */
(function () {
  if (typeof window === 'undefined') { return; }
  window.EvaUI = window.EvaUI || {};

  function clamp(n, min, max) {
    n = Number(n);
    if (Number.isNaN(n)) { n = min; }
    return Math.min(max, Math.max(min, n));
  }

  function padHex(n) {
    var s = clamp(Math.round(n), 0, 255).toString(16).toUpperCase();
    return s.length === 1 ? '0' + s : s;
  }

  function rgbToHex(rgb) {
    return '#' + padHex(rgb.r) + padHex(rgb.g) + padHex(rgb.b);
  }

  function hexToRgb(hex) {
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

  function rgbToHsv(rgb) {
    var r = clamp(rgb.r, 0, 255) / 255;
    var g = clamp(rgb.g, 0, 255) / 255;
    var b = clamp(rgb.b, 0, 255) / 255;
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

  function hsvToRgb(h, s, v) {
    h = ((clamp(h, 0, 360) % 360) + 360) % 360;
    s = clamp(s, 0, 1);
    v = clamp(v, 0, 1);
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

  function parseColor(value) {
    var raw = String(value || '').trim();
    var rgb = null;
    var alpha = 1;
    var format = /^rgba/i.test(raw) ? 'rgba' : 'hex';
    var m = raw.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i);
    if (m) {
      rgb = {
        r: clamp(parseFloat(m[1]), 0, 255),
        g: clamp(parseFloat(m[2]), 0, 255),
        b: clamp(parseFloat(m[3]), 0, 255)
      };
      alpha = m[4] === undefined ? 1 : clamp(parseFloat(m[4]), 0, 1);
    } else {
      rgb = hexToRgb(raw);
    }
    if (!rgb) { return null; }
    var hsv = rgbToHsv(rgb);
    return { h: hsv.h, s: hsv.s, v: hsv.v, a: alpha, format: format };
  }

  function alphaText(a) {
    return String(Math.round(clamp(a, 0, 1) * 1000) / 1000).replace(/0+$/, '').replace(/\.$/, '');
  }

  window.EvaUI.Color = {
    props: {
      modelValue: { type: String, default: '' },
      alpha: { type: Boolean, default: true },
      presets: { type: Array, default: function () { return []; } },
      placeholder: { type: String, default: '' },
      defaultValue: { type: String, default: '' }
    },
    emits: ['update:modelValue'],
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
      rgb: function () {
        return hsvToRgb(this.h, this.s, this.v);
      },
      draftText: function () {
        if (this.format === 'rgba') {
          return 'rgba(' + this.rgb.r + ', ' + this.rgb.g + ', ' + this.rgb.b + ', ' + alphaText(this.a) + ')';
        }
        return rgbToHex(this.rgb);
      },
      swatchStyle: function () {
        var value = this.modelValue || this.defaultValue || this.draftText;
        return { background: value || 'transparent' };
      },
      panelStyle: function () {
        return { background: 'hsl(' + Math.round(this.h) + ', 100%, 50%)' };
      },
      satPointerStyle: function () {
        return { left: (this.s * 100) + '%', top: ((1 - this.v) * 100) + '%' };
      },
      huePointerStyle: function () {
        return { left: (this.h / 360 * 100) + '%' };
      },
      alphaPointerStyle: function () {
        return { left: (this.a * 100) + '%' };
      },
      alphaTrackStyle: function () {
        var rgb = this.rgb;
        return {
          background: 'linear-gradient(90deg, rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', 0), rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', 1))'
        };
      },
      formatOptions: function () {
        return this.alpha ? { hex: 'HEX', rgba: 'RGBA' } : { hex: 'HEX' };
      },
      normalizedPresets: function () {
        var fallback = ['#FF4D7F', '#EF4444', '#F97316', '#FACC15', '#22C55E', '#38BDF8', '#3B82F6', '#8B5CF6', '#64748B'];
        return (this.presets && this.presets.length ? this.presets : fallback).filter(function (c) {
          return !!parseColor(c);
        });
      }
    },
    watch: {
      modelValue: {
        immediate: true,
        handler: function (value) {
          this.inputText = value || '';
          this.syncDraft(value || this.defaultValue);
        }
      },
      alpha: function (enabled) {
        if (!enabled && this.format === 'rgba') {
          this.format = 'hex';
          this.a = 1;
        }
      }
    },
    mounted: function () {
      document.addEventListener('mousedown', this.onDocumentDown, true);
      document.addEventListener('touchstart', this.onDocumentDown, true);
    },
    beforeUnmount: function () {
      this.stopDrag();
      document.removeEventListener('mousedown', this.onDocumentDown, true);
      document.removeEventListener('touchstart', this.onDocumentDown, true);
    },
    methods: {
      syncDraft: function (value) {
        var parsed = parseColor(value);
        if (!parsed) { return; }
        this.h = parsed.h;
        this.s = parsed.s;
        this.v = parsed.v;
        this.a = this.alpha ? parsed.a : 1;
        this.format = (this.alpha && parsed.format === 'rgba') ? 'rgba' : 'hex';
      },
      toggle: function () {
        this.open = !this.open;
        if (this.open) { this.syncDraft(this.modelValue || this.defaultValue); }
      },
      close: function () {
        this.open = false;
      },
      onDocumentDown: function (event) {
        if (!this.open || !this.$el || this.$el.contains(event.target)) { return; }
        this.close();
      },
      commitText: function () {
        var parsed = parseColor(this.inputText);
        if (!parsed) {
          this.inputText = this.modelValue || '';
          return;
        }
        this.syncDraft(this.inputText);
        this.apply();
      },
      reset: function () {
        var value = this.defaultValue || '';
        this.$emit('update:modelValue', value);
        this.inputText = value;
        this.syncDraft(value);
      },
      clear: function () {
        this.$emit('update:modelValue', '');
        this.inputText = '';
        this.close();
      },
      apply: function () {
        var value = this.draftText;
        this.$emit('update:modelValue', value);
        this.inputText = value;
        this.close();
      },
      setFormatValue: function (value) {
        this.format = value === 'rgba' && this.alpha ? 'rgba' : 'hex';
      },
      setPreset: function (color) {
        this.syncDraft(color);
      },
      point: function (event, el) {
        var e = event.touches && event.touches.length ? event.touches[0] : event;
        var rect = el.getBoundingClientRect();
        return {
          x: clamp((e.clientX - rect.left) / rect.width, 0, 1),
          y: clamp((e.clientY - rect.top) / rect.height, 0, 1)
        };
      },
      setSv: function (event) {
        var p = this.point(event, event.currentTarget || this.dragging.el);
        this.s = p.x;
        this.v = 1 - p.y;
      },
      setHue: function (event) {
        var p = this.point(event, event.currentTarget || this.dragging.el);
        this.h = p.x * 360;
      },
      setAlpha: function (event) {
        if (!this.alpha) { return; }
        var p = this.point(event, event.currentTarget || this.dragging.el);
        this.a = p.x;
      },
      startDrag: function (event, kind) {
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
      setSvWithEl: function (event, el) {
        var p = this.point(event, el);
        this.s = p.x;
        this.v = 1 - p.y;
      },
      setHueWithEl: function (event, el) {
        var p = this.point(event, el);
        this.h = p.x * 360;
      },
      setAlphaWithEl: function (event, el) {
        if (!this.alpha) { return; }
        var p = this.point(event, el);
        this.a = p.x;
      },
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
      '<div class="eva-color" :class="{ \'is-open\': open }">',
      '  <div class="eva-color-control">',
      '    <button type="button" class="eva-color-swatch" :style="swatchStyle" @click="toggle" aria-label="选择颜色"></button>',
      '    <input class="eva-color-input" :placeholder="placeholder || \'#FF4D7F\'" v-model="inputText" @change="commitText" @keydown.enter.prevent="commitText">',
      '    <div class="eva-color-format"><eva-select :options="formatOptions" :searchable="false" :model-value="format" @update:model-value="setFormatValue"></eva-select></div>',
      '    <button type="button" class="eva-color-reset" @click="reset">默认</button>',
      '  </div>',
      '  <div v-show="open" class="eva-color-popover">',
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
      '    <div class="eva-color-presets">',
      '      <button v-for="preset in normalizedPresets" :key="preset" type="button" :style="{ background: preset }" @click="setPreset(preset)" :aria-label="preset"></button>',
      '    </div>',
      '    <div class="eva-color-actions">',
      '      <button type="button" class="eva-color-btn" @click="clear">清除</button>',
      '      <button type="button" class="eva-color-btn is-primary" @click="apply">应用</button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n')
  };
})();
