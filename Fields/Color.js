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
 * - `mode`：popover / inline；`size`：small / medium / large。
 * - `format` / `formats`：默认输出格式与允许切换的格式。
 * - `show_input` / `show_format` / `show_presets` / `clearable` / `resettable`：控制 UI 显示项。
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
      ' :mode="field.mode || \'popover\'"' +
      ' :size="field.size || \'medium\'"' +
      ' :default-format="field.format || \'hex\'"' +
      ' :formats="field.formats || []"' +
      ' :show-input="field.show_input !== false && field.showInput !== false"' +
      ' :show-format="field.show_format !== false && field.showFormat !== false"' +
      ' :show-presets="field.show_presets !== false && field.showPresets !== false"' +
      ' :clearable="field.clearable !== false"' +
      ' :resettable="field.resettable !== false"' +
      ' :disabled="!!field.disabled"' +
      ' :palette-label="field.palette_label || field.paletteLabel || \'\'"' +
      ' :clear-text="field.clear_text || field.clearText || \'清除\'"' +
      ' :apply-text="field.apply_text || field.applyText || \'应用\'"' +
      ' :default-text="field.default_text || field.defaultText || \'默认\'"' +
      ' :popover-width="field.popover_width || field.popoverWidth || \'\'"' +
      ' :board-height="field.board_height || field.boardHeight || \'\'"' +
      ' :preset-shape="field.preset_shape || field.presetShape || \'square\'"' +
      ' @update:model-value="$emit(\'update:modelValue\', $event)"></eva-color>'
  };
})();
