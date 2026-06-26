/**
 * Eva 字段：color。
 *
 * 用途：
 * - 渲染 HEX / RGBA 颜色选择字段。
 * - 具体选择器交互委托给通用 UI 库 `<eva-color>`。
 *
 * 字段配置：
 * - `alpha`：是否允许 RGBA 透明度，默认 true。
 * - `presets`：预设色板数组。
 * - `default`：点击“默认”时恢复的颜色。
 */
(function () {
  window.EvaFields = window.EvaFields || {};
  window.EvaFields.color = {
    props: ['field', 'modelValue'],
    emits: ['update:modelValue'],
    template:
      '<eva-color :model-value="modelValue"' +
      ' :alpha="field.alpha !== false"' +
      ' :presets="field.presets || []"' +
      ' :placeholder="field.placeholder || \'#FF4D7F\'"' +
      ' :default-value="field.default || \'\'"' +
      ' @update:model-value="$emit(\'update:modelValue\', $event)"></eva-color>'
  };
})();
