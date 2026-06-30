/**
 * Eva 字段：select。
 *
 * 用途：
 * - 渲染单选下拉字段，外观与交互委托给通用 UI 库 `<eva-select>`。
 * - 只负责把 Eva 字段 schema 转换成 eva-select 所需 props，并转发 v-model 更新事件。
 *
 * 字段配置：
 * - `options`：选项表，支持数组、键值对象、分组对象。
 * - `placeholder`：未选择时的占位文案。
 * - `searchable`：是否启用下拉内搜索；未指定时由 eva-select 根据选项数量自动判断。
 * - `empty_message`：搜索无结果时显示的空状态文案。
 * - `multiple`：是否多选；`sortable`：多选值是否允许拖拽排序。
 * - `ajax`：true 时启用 CSF 风格远程查找，复用 ajax_select 实现。
 */
(function () {
  window.EvaFields = window.EvaFields || {};
  window.EvaFields.select = {
    props: ['field', 'modelValue'],
    emits: ['update:modelValue'],
    computed: {
      // Purpose: Handle ajax Component behavior.
      ajaxComponent: function () {
        return window.EvaFields && window.EvaFields.ajax_select ? window.EvaFields.ajax_select : null;
      }
    },
    methods: { t: function (k) { return window.EvaI18n.t(k); } },
    template: [
      '<component v-if="field.ajax && ajaxComponent" :is="ajaxComponent" :field="field" :model-value="modelValue" @update:model-value="$emit(\'update:modelValue\', $event)"></component>',
      '<eva-select v-else :options="field.options" :placeholder="field.placeholder || t(\'please_select\')"',
      ' :searchable="field.searchable"',
      ' :empty-message="field.empty_message"',
      ' :multiple="field.multiple"',
      ' :sortable="field.sortable"',
      ' :model-value="modelValue"',
      ' @update:model-value="$emit(\'update:modelValue\', $event)"></eva-select>'
    ].join('\n')
  };
})();
