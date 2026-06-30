/**
 * Eva 字段：builder（页面构建器 · 三栏外壳）。
 *
 * 布局：
 * - 左：模块库。数据源 = window.EvaModules（用户自行注册，框架内置一个 hero 示例）。
 * - 中：画布预览。遍历实例数组，调 EvaModules[type].render(values) 输出 HTML；可选中 / 上移下移 / 复制 / 删除。
 * - 右：参数面板。取选中模块的 fields，逐个用 <eva-field> 渲染（复用现有 window.EvaFields 体系）。
 *
 * 保存值（modelValue）= 模块实例数组：
 *   [ { uid: 'm1', type: 'hero', values: { 标题: '...', ... } } ]
 *
 * 扩展：用户在自己的脚本里 `window.EvaModules.xxx = { label, icon, fields, render }` 即可新增模块。
 */
(function () {
  window.EvaFields = window.EvaFields || {};
  window.EvaModules = window.EvaModules || {};

  var UID_SEED = 0;

  // 功能：生成模块实例唯一 id。
  function genUid() {
    UID_SEED += 1;
    return 'm' + Date.now().toString(36) + UID_SEED.toString(36);
  }

  // 功能：深拷贝纯数据（实例值均可 JSON 序列化）。
  function clone(value) {
    if (value === null || value === undefined) { return value; }
    try { return JSON.parse(JSON.stringify(value)); } catch (e) { return value; }
  }

  // 功能：判断对象自有属性。
  function hasOwn(obj, key) {
    return obj && Object.prototype.hasOwnProperty.call(obj, key);
  }

  // ---------------------------------------------------------------------------
  // 内置示例模块：展示「如何用字段组合出一个模块」。用户可照此注册自己的模块。
  // ---------------------------------------------------------------------------
  if (!window.EvaModules.hero) {
    window.EvaModules.hero = {
      label: '英雄区 Hero',
      icon: 'ri-layout-top-line',
      // 该模块由哪些字段组成（直接复用 EvaFields 的字段声明）。
      fields: [
        { id: 'title', type: 'text', title: '主标题', default: '欢迎来到 Eva' },
        { id: 'subtitle', type: 'textarea', title: '副标题', default: '用字段组合出你的页面模块' },
        { id: 'bg', type: 'color', title: '背景色', default: '#0EA5E9', alpha: true },
        { id: 'color', type: 'color', title: '文字颜色', default: '#FFFFFF' },
        { id: 'image', type: 'upload', title: '配图', library: 'image', return_type: 'url', preview: true },
        { id: 'center', type: 'switcher', title: '居中显示', default: true }
      ],
      // 预览渲染：字段值 -> HTML 字符串（无构建风格）。
      render: function (v) {
        v = v || {};
        var align = v.center ? 'center' : 'left';
        var img = v.image ? '<img src="' + v.image + '" style="max-width:100%;border-radius:12px;margin-top:16px" />' : '';
        return '<section style="background:' + (v.bg || '#0EA5E9') + ';color:' + (v.color || '#fff') + ';padding:40px;border-radius:12px;text-align:' + align + '">'
          + '<h1 style="margin:0 0 8px;font-size:26px;line-height:1.2">' + (v.title || '') + '</h1>'
          + '<p style="margin:0;opacity:.9;white-space:pre-line">' + (v.subtitle || '') + '</p>'
          + img
          + '</section>';
      }
    };
  }

  // 功能：注入一次构建器样式（无构建环境下随组件自带样式）。
  function injectStyle() {
    if (typeof document === 'undefined' || document.getElementById('eva-pb-style')) { return; }
    var css = [
      '.eva-pb{display:flex;gap:12px;min-height:460px;border:1px solid var(--eva-border,#e5e7eb);border-radius:12px;background:var(--eva-bg,#f8fafc);overflow:hidden}',
      '.eva-pb-left,.eva-pb-right{width:240px;flex:0 0 240px;background:#fff;display:flex;flex-direction:column;overflow:hidden}',
      '.eva-pb-left{border-right:1px solid #eef0f3}.eva-pb-right{border-left:1px solid #eef0f3}',
      '.eva-pb-canvas{flex:1 1 auto;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:12px}',
      '.eva-pb-left-head,.eva-pb-right-head{padding:12px 14px;font-weight:600;font-size:13px;color:#0f172a;border-bottom:1px solid #eef0f3;display:flex;align-items:center;gap:6px}',
      '.eva-pb-modules{padding:10px;display:flex;flex-direction:column;gap:8px;overflow:auto}',
      '.eva-pb-mod{display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;cursor:pointer;font-size:13px;color:#0f172a;text-align:left;transition:.15s}',
      '.eva-pb-mod:hover{border-color:#38bdf8;box-shadow:0 1px 6px rgba(56,189,248,.18);transform:translateY(-1px)}',
      '.eva-pb-mod i{font-size:16px;color:#0ea5e9}',
      '.eva-pb-item{border:2px solid transparent;border-radius:12px;background:#fff;box-shadow:0 1px 4px rgba(15,23,42,.06);overflow:hidden;cursor:pointer;transition:.15s}',
      '.eva-pb-item.is-active{border-color:#0ea5e9;box-shadow:0 4px 16px rgba(14,165,233,.22)}',
      '.eva-pb-item-bar{display:flex;align-items:center;justify-content:space-between;padding:7px 10px;background:#f1f5f9;font-size:12px;color:#475569}',
      '.eva-pb-item-name{display:flex;align-items:center;gap:6px;font-weight:600}',
      '.eva-pb-item-tools{display:flex;gap:4px}',
      '.eva-pb-item-tools button{border:none;background:transparent;cursor:pointer;width:24px;height:24px;border-radius:6px;color:#64748b;font-size:14px}',
      '.eva-pb-item-tools button:hover{background:#e2e8f0;color:#0f172a}',
      '.eva-pb-item-tools button:disabled{opacity:.35;cursor:not-allowed}',
      '.eva-pb-render{padding:12px}',
      '.eva-pb-empty{margin:auto;color:#94a3b8;font-size:14px;border:2px dashed #cbd5e1;border-radius:12px;padding:40px;text-align:center;width:100%}',
      '.eva-pb-empty-sm{color:#94a3b8;font-size:12px;padding:14px;text-align:center}',
      '.eva-pb-fields{padding:12px;display:flex;flex-direction:column;gap:14px;overflow:auto}',
      '.eva-pb-field{display:flex;flex-direction:column;gap:6px}',
      '.eva-pb-field-label{font-size:12px;font-weight:600;color:#334155}'
    ].join('');
    var style = document.createElement('style');
    style.id = 'eva-pb-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  window.EvaFields.builder = {
    props: ['field', 'modelValue'],
    emits: ['update:modelValue'],
    data: function () {
      return { selectedUid: '' };
    },
    mounted: function () {
      injectStyle();
    },
    methods: {
      // 功能：i18n 兜底取值。
      tv: function (value) {
        return window.EvaI18n && window.EvaI18n.tv ? window.EvaI18n.tv(value) : (value || '');
      },
      // 功能：模块注册表。
      registry: function () {
        return window.EvaModules || {};
      },
      // 功能：左侧模块清单。
      moduleList: function () {
        var reg = this.registry();
        return Object.keys(reg).map(function (key) {
          return { type: key, label: reg[key].label || key, icon: reg[key].icon || 'ri-layout-line' };
        });
      },
      // 功能：模块展示名 / 图标。
      moduleLabel: function (type) {
        var reg = this.registry();
        return reg[type] && reg[type].label ? reg[type].label : type;
      },
      moduleIcon: function (type) {
        var reg = this.registry();
        return reg[type] && reg[type].icon ? reg[type].icon : 'ri-layout-line';
      },
      // 功能：当前页面实例数组（读取用，保持响应式）。
      items: function () {
        return Array.isArray(this.modelValue) ? this.modelValue : [];
      },
      // 功能：发出更新。
      emitItems: function (next) {
        this.$emit('update:modelValue', next);
      },
      // 功能：按模块定义生成默认值。
      defaultsFor: function (type) {
        var reg = this.registry();
        var fields = (reg[type] && Array.isArray(reg[type].fields)) ? reg[type].fields : [];
        var values = {};
        fields.forEach(function (f) {
          if (!f || !f.id) { return; }
          values[f.id] = f.default !== undefined ? clone(f.default) : '';
        });
        return values;
      },
      // 功能：从左侧加入一个模块实例。
      addModule: function (type) {
        var next = clone(this.items());
        var uid = genUid();
        next.push({ uid: uid, type: type, values: this.defaultsFor(type) });
        this.emitItems(next);
        this.selectedUid = uid;
      },
      // 功能：选中某实例。
      select: function (uid) {
        this.selectedUid = uid;
      },
      // 功能：选中实例对象。
      selectedItem: function () {
        var uid = this.selectedUid;
        return this.items().filter(function (it) { return it.uid === uid; })[0] || null;
      },
      // 功能：选中实例的字段定义。
      selectedFields: function () {
        var it = this.selectedItem();
        if (!it) { return []; }
        var reg = this.registry();
        return (reg[it.type] && Array.isArray(reg[it.type].fields)) ? reg[it.type].fields : [];
      },
      // 功能：取选中实例某字段值。
      childValue: function (f) {
        var it = this.selectedItem();
        if (!it || !it.values) { return f.default !== undefined ? f.default : ''; }
        return hasOwn(it.values, f.id) ? it.values[f.id] : (f.default !== undefined ? f.default : '');
      },
      // 功能：更新选中实例某字段值。
      updateChild: function (f, value) {
        var uid = this.selectedUid;
        var next = clone(this.items());
        for (var i = 0; i < next.length; i++) {
          if (next[i].uid === uid) {
            next[i].values = next[i].values || {};
            next[i].values[f.id] = value;
            break;
          }
        }
        this.emitItems(next);
      },
      // 功能：删除实例。
      removeItem: function (uid) {
        var next = this.items().filter(function (it) { return it.uid !== uid; });
        this.emitItems(clone(next));
        if (this.selectedUid === uid) { this.selectedUid = ''; }
      },
      // 功能：上移 / 下移实例（dir = -1 / 1）。
      moveItem: function (uid, dir) {
        var next = clone(this.items());
        var idx = -1;
        for (var i = 0; i < next.length; i++) { if (next[i].uid === uid) { idx = i; break; } }
        var target = idx + dir;
        if (idx < 0 || target < 0 || target >= next.length) { return; }
        var tmp = next[idx];
        next[idx] = next[target];
        next[target] = tmp;
        this.emitItems(next);
      },
      // 功能：复制实例。
      duplicateItem: function (uid) {
        var next = clone(this.items());
        var idx = -1;
        for (var i = 0; i < next.length; i++) { if (next[i].uid === uid) { idx = i; break; } }
        if (idx < 0) { return; }
        var copy = clone(next[idx]);
        copy.uid = genUid();
        next.splice(idx + 1, 0, copy);
        this.emitItems(next);
        this.selectedUid = copy.uid;
      },
      // 功能：渲染实例预览 HTML。
      renderHtml: function (item) {
        var reg = this.registry();
        var m = reg[item.type];
        if (m && typeof m.render === 'function') {
          try {
            return m.render(item.values || {});
          } catch (e) {
            return '<div style="color:#b91c1c;font-size:12px">模块「' + item.type + '」渲染出错：' + (e && e.message ? e.message : e) + '</div>';
          }
        }
        return '<div style="opacity:.5;font-size:12px">未注册模块「' + item.type + '」的 render</div>';
      }
    },
    template: [
      '<div class="eva-pb">',
      '  <aside class="eva-pb-left">',
      '    <div class="eva-pb-left-head"><i class="ri-apps-2-line"></i><span>模块</span></div>',
      '    <div class="eva-pb-modules">',
      '      <button type="button" class="eva-pb-mod" v-for="m in moduleList()" :key="m.type" @click="addModule(m.type)">',
      '        <i :class="m.icon"></i><span>{{ tv(m.label) }}</span>',
      '      </button>',
      '      <p v-if="!moduleList().length" class="eva-pb-empty-sm">未注册模块。用 window.EvaModules 注册后出现在这里。</p>',
      '    </div>',
      '  </aside>',
      '  <section class="eva-pb-canvas">',
      '    <div v-if="!items().length" class="eva-pb-empty">从左侧点击模块，开始搭建页面</div>',
      '    <div v-for="(item, idx) in items()" :key="item.uid" class="eva-pb-item" :class="{ \'is-active\': item.uid === selectedUid }" @click="select(item.uid)">',
      '      <div class="eva-pb-item-bar">',
      '        <span class="eva-pb-item-name"><i :class="moduleIcon(item.type)"></i>{{ tv(moduleLabel(item.type)) }}</span>',
      '        <span class="eva-pb-item-tools">',
      '          <button type="button" @click.stop="moveItem(item.uid, -1)" :disabled="idx === 0" title="上移"><i class="ri-arrow-up-line"></i></button>',
      '          <button type="button" @click.stop="moveItem(item.uid, 1)" :disabled="idx === items().length - 1" title="下移"><i class="ri-arrow-down-line"></i></button>',
      '          <button type="button" @click.stop="duplicateItem(item.uid)" title="复制"><i class="ri-file-copy-line"></i></button>',
      '          <button type="button" @click.stop="removeItem(item.uid)" title="删除"><i class="ri-delete-bin-line"></i></button>',
      '        </span>',
      '      </div>',
      '      <div class="eva-pb-render" v-html="renderHtml(item)"></div>',
      '    </div>',
      '  </section>',
      '  <aside class="eva-pb-right">',
      '    <template v-if="selectedItem()">',
      '      <div class="eva-pb-right-head"><i :class="moduleIcon(selectedItem().type)"></i><span>{{ tv(moduleLabel(selectedItem().type)) }} · 参数</span></div>',
      '      <div class="eva-pb-fields">',
      '        <div class="eva-pb-field" v-for="f in selectedFields()" :key="f.id">',
      '          <label class="eva-pb-field-label">{{ tv(f.title || f.id) }}</label>',
      '          <eva-field :field="f" :model-value="childValue(f)" @update:model-value="updateChild(f, $event)"></eva-field>',
      '        </div>',
      '        <p v-if="!selectedFields().length" class="eva-pb-empty-sm">该模块未定义 fields。</p>',
      '      </div>',
      '    </template>',
      '    <div v-else class="eva-pb-empty-sm"><i class="ri-cursor-line"></i> 选中中间的模块，在此编辑参数</div>',
      '  </aside>',
      '</div>'
    ].join('\n')
  };
})();
