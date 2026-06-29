/**
 * Eva 字段：color_group。
 *
 * 用途：
 * - 管理一组颜色值，返回值为颜色字符串数组。
 * - 内容区样式按文档图中的颜色组字段预览实现。
 */
(function () {
  window.EvaFields = window.EvaFields || {};

  function list(value) {
    return Array.isArray(value) ? value.slice() : [];
  }

  function validHex(value) {
    var v = String(value || '').trim();
    return /^#([0-9a-fA-F]{6})$/.test(v) ? v.toUpperCase() : '#FF4D7F';
  }

  window.EvaFields.color_group = {
    props: ['field', 'modelValue'],
    emits: ['update:modelValue'],
    data: function () {
      return { dragIndex: null };
    },
    computed: {
      colors: function () {
        return list(this.modelValue);
      },
      presets: function () {
        return Array.isArray(this.field.presets) && this.field.presets.length
          ? this.field.presets
          : ['#FF4D7F', '#FF6B6B', '#FFD166', '#06D6A0', '#4D96FF', '#9B5DE5'];
      },
      maxColors: function () {
        return Math.max(0, Number(this.field.max_colors || this.field.maxColors || 0));
      },
      canAdd: function () {
        return !this.maxColors || this.colors.length < this.maxColors;
      }
    },
    methods: {
      tv: function (value) {
        return window.EvaI18n && window.EvaI18n.tv ? window.EvaI18n.tv(value) : (value || '');
      },
      emit: function (colors) {
        this.$emit('update:modelValue', colors);
      },
      title: function () {
        return this.tv(this.field.group_title || this.field.groupTitle || this.field.title || '品牌色组');
      },
      desc: function () {
        return this.tv(this.field.group_desc || this.field.groupDesc || this.field.desc || '用于主题配色、图表颜色或模块强调色配置。');
      },
      validHex: validHex,
      addColor: function () {
        if (!this.canAdd) { return; }
        var next = this.colors;
        var color = this.presets.filter(function (preset) { return next.indexOf(preset) === -1; })[0] || '#FF4D7F';
        next.push(color);
        this.emit(next);
      },
      updateColor: function (index, value) {
        var next = this.colors;
        next[index] = validHex(value);
        this.emit(next);
      },
      removeColor: function (index) {
        var next = this.colors;
        next.splice(index, 1);
        this.emit(next);
      },
      dragStart: function (index) {
        if (!this.field.sortable) { return; }
        this.dragIndex = index;
      },
      dropColor: function (index) {
        if (this.dragIndex === null || this.dragIndex === index) { this.dragIndex = null; return; }
        var next = this.colors;
        var item = next.splice(this.dragIndex, 1)[0];
        next.splice(index, 0, item);
        this.dragIndex = null;
        this.emit(next);
      }
    },
    template: [
      '<div class="eva-color-group" :class="{ \'is-empty\': !colors.length }">',
      '  <div class="eva-cg-head"><strong>{{ title() }}<i v-if="field.required">*</i></strong></div>',
      '  <div class="eva-cg-palette">',
      '    <div v-for="(color, index) in colors" :key="color + index" class="eva-cg-chip" :class="{ \'is-dragging\': dragIndex === index }" :draggable="!!field.sortable" @dragstart="dragStart(index)" @dragover.prevent @drop="dropColor(index)" :style="{ background: color }">',
      '      <input type="color" :value="validHex(color)" @input="updateColor(index, $event.target.value)" :aria-label="color">',
      '      <button type="button" class="eva-cg-remove" @click.stop="removeColor(index)" aria-label="删除颜色">×</button>',
      '    </div>',
      '    <button v-if="canAdd" type="button" class="eva-cg-add" @click="addColor">+ 添加颜色</button>',
      '  </div>',
      '  <p>{{ desc() }}</p>',
      '</div>'
    ].join('\n')
  };
})();
