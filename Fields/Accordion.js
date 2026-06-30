/**
 * Eva 字段：accordion。
 *
 * 用途：
 * - 把一组子字段按折叠面板组织，适合复杂配置分组。
 * - 返回值为对象/关联数组：{ section_id: { field_id: value } }。
 *
 * 字段配置：
 * - `sections`：面板数组，每项支持 id/title/desc/fields/disabled/badge。
 * - `multiple`：是否允许同时展开多个面板，默认 true。
 * - `default_open`：默认展开的面板 id 数组。
 * - `closed_icon/open_icon`：右侧折叠图标，可被单个 section 覆盖。
 */
(function () {
  window.EvaFields = window.EvaFields || {};

  // Purpose: Copy object values before mutating model state.
  function Clone(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) { return {}; }
    return Object.assign({}, value);
  }

  window.EvaFields.accordion = {
    props: ['field', 'modelValue'],
    emits: ['update:modelValue'],
    methods: {
      // Purpose: Handle tv behavior.
      tv: function (value) {
        return window.EvaI18n && window.EvaI18n.tv ? window.EvaI18n.tv(value) : (value || '');
      },
      // Purpose: Handle sections behavior.
      sections: function () {
        return Array.isArray(this.field.sections) ? this.field.sections : [];
      },
      // Purpose: Handle section Id behavior.
      sectionId: function (section, index) {
        return String(section.id || section.key || index);
      },
      // Purpose: Handle section Values behavior.
      sectionValues: function (section, index) {
        var all = Clone(this.modelValue);
        var id = this.sectionId(section, index);
        return all[id] && typeof all[id] === 'object' && !Array.isArray(all[id]) ? all[id] : {};
      },
      // Purpose: Handle child Value behavior.
      childValue: function (section, index, child) {
        var values = this.sectionValues(section, index);
        return Object.prototype.hasOwnProperty.call(values, child.id) ? values[child.id] : (child.default !== undefined ? child.default : '');
      },
      // Purpose: Update update Child state.
      updateChild: function (section, index, child, value) {
        var all = Clone(this.modelValue);
        var id = this.sectionId(section, index);
        var values = all[id] && typeof all[id] === 'object' && !Array.isArray(all[id]) ? Object.assign({}, all[id]) : {};
        values[child.id] = value;
        all[id] = values;
        this.$emit('update:modelValue', all);
      },
      // Purpose: Handle field Col behavior.
      fieldCol: function (field) {
        var map = {
          'full': 'eva-acc-col-12', '1': 'eva-acc-col-12', '1/1': 'eva-acc-col-12',
          '3/4': 'eva-acc-col-9', '2/3': 'eva-acc-col-8', '1/2': 'eva-acc-col-6',
          '1/3': 'eva-acc-col-4', '1/4': 'eva-acc-col-3'
        };
        return map[field.width || 'full'] || 'eva-acc-col-12';
      }
    },
    template: [
      '<eva-accordion :panels="sections()" :multiple="field.multiple !== false" :default-open="field.default_open || field.defaultOpen || []" :closed-icon="field.closed_icon || field.closedIcon || \'ri-arrow-down-s-line\'" :open-icon="field.open_icon || field.openIcon || \'ri-arrow-up-s-line\'" :disabled="field.disabled">',
      '  <template #default="{ panel, index }">',
      '    <p v-if="tv(panel.desc)" class="eva-accordion-desc">{{ tv(panel.desc) }}</p>',
      '    <div class="eva-accordion-fields">',
      '      <div v-for="child in (panel.fields || [])" :key="child.id" class="eva-accordion-field" :class="fieldCol(child)">',
      '        <div class="eva-accordion-meta"><span>{{ tv(child.title) }}</span><em v-if="tv(child.desc)">{{ tv(child.desc) }}</em></div>',
      '        <div class="eva-accordion-control"><eva-field :field="child" :model-value="childValue(panel, index, child)" @update:model-value="updateChild(panel, index, child, $event)"></eva-field></div>',
      '      </div>',
      '    </div>',
      '  </template>',
      '</eva-accordion>'
    ].join('\n')
  };
})();
