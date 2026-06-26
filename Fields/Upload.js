/**
 * Eva 字段：upload。
 *
 * 用途：
 * - 上传/选择单个媒体文件，常用于封面图、Logo、缩略图。
 * - 具体媒体库、拖拽上传和预览交互委托给 `<eva-media>`。
 *
 * 字段配置：
 * - `library`：媒体类型，默认 image。
 * - `button_title`：按钮文案。
 * - `placeholder`：拖拽区提示。
 * - `return_type`：url / id / array，默认单图返回 url。
 * - `preview`：是否显示图片预览，默认 true。
 */
(function () {
  window.EvaFields = window.EvaFields || {};
  window.EvaFields.upload = {
    props: ['field', 'modelValue'],
    emits: ['update:modelValue'],
    template:
      '<eva-media :model-value="modelValue"' +
      ' :multiple="!!field.multiple"' +
      ' :mime="field.library || field.mime || \'image\'"' +
      ' :library="field.library || field.mime || \'image\'"' +
      ' :title="field.title || \'选择图片\'"' +
      ' :button-title="field.button_title || \'选择图片\'"' +
      ' :placeholder="field.placeholder || \'点击或拖拽图片到此处\'"' +
      ' :return-type="field.return_type || field.returnType || \'url\'"' +
      ' :max-size="field.max_size || field.maxSize || 5"' +
      ' :preview="field.preview !== false"' +
      ' @update:model-value="$emit(\'update:modelValue\', $event)"></eva-media>'
  };
})();
