/**
 * Eva UI 库 · eva-media（媒体选择 / 上传）。
 *
 * 使用 WordPress REST API 拉取媒体库列表与上传文件，不依赖 wp.media 原生弹窗。
 */
(function () {
  if (typeof window === 'undefined') { return; }
  window.EvaUI = window.EvaUI || {};

  function cfg() { return (window.EvaFW && window.EvaFW.config) || {}; }
  function restBase() { return (cfg().restUrl || '/wp-json/').replace(/\/+$/, '') + '/'; }
  function isImage(item) {
    var url = item && item.url ? String(item.url) : String(item || '');
    return /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url) || /^image\//i.test(item && item.mime ? item.mime : '');
  }
  function fileName(url) {
    url = String(url || '');
    return decodeURIComponent((url.split('/').pop() || '').split('?')[0] || 'media');
  }
  function formatMediaItem(json) {
    var sizes = json.media_details && json.media_details.sizes ? json.media_details.sizes : {};
    var thumb = sizes.thumbnail && sizes.thumbnail.source_url ? sizes.thumbnail.source_url : '';
    var medium = sizes.medium && sizes.medium.source_url ? sizes.medium.source_url : '';
    return {
      id: json.id || '',
      url: json.source_url || '',
      thumb: thumb || medium || json.source_url || '',
      title: (json.title && json.title.rendered) || json.filename || fileName(json.source_url || ''),
      filename: json.filename || fileName(json.source_url || ''),
      mime: json.mime_type || '',
      width: json.media_details && json.media_details.width ? json.media_details.width : '',
      height: json.media_details && json.media_details.height ? json.media_details.height : '',
      size: json.filesizeHumanReadable || ''
    };
  }

  window.EvaUI.Media = {
    props: {
      modelValue: { type: [String, Number, Array, Object], default: '' },
      multiple: { type: Boolean, default: false },
      mime: { type: String, default: 'image' },
      title: { type: String, default: '选择图片' },
      buttonTitle: { type: String, default: '选择图片' },
      library: { type: String, default: '' },
      placeholder: { type: String, default: '点击或拖拽图片到此处' },
      returnType: { type: String, default: '' },
      maxSize: { type: [Number, String], default: 5 },
      preview: { type: Boolean, default: true },
      showDrop: { type: Boolean, default: true }
    },
    emits: ['update:modelValue'],
    data: function () {
      return {
        drag: false,
        uploading: false,
        error: '',
        browserOpen: false,
        browserLoading: false,
        browserError: '',
        browserQuery: '',
        browserPage: 1,
        browserTotalPages: 1,
        browserItems: [],
        browserPicked: []
      };
    },
    computed: {
      mode: function () {
        var lib = this.library || this.mime || 'image';
        return lib === 'media' ? 'image' : lib;
      },
      items: function () {
        var v = this.modelValue;
        if (!v) { return []; }
        if (Array.isArray(v)) {
          return v.map(this.normalizeItem).filter(Boolean);
        }
        return [this.normalizeItem(v)].filter(Boolean);
      },
      accept: function () {
        if (this.mode === 'image') { return 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml'; }
        return '';
      },
      maxBytes: function () {
        return Math.max(0, Number(this.maxSize || 0)) * 1024 * 1024;
      },
      selectedIds: function () {
        return this.browserPicked.map(function (item) { return String(item.id || item.url); });
      }
    },
    methods: {
      normalizeItem: function (value) {
        if (value && typeof value === 'object') {
          return {
            id: value.id || value.ID || '',
            url: value.url || value.source_url || '',
            thumb: value.thumb || value.thumbnail || value.url || value.source_url || '',
            title: value.title || value.filename || fileName(value.url || value.source_url || ''),
            filename: value.filename || fileName(value.url || value.source_url || ''),
            mime: value.mime || value.mime_type || '',
            width: value.width || '',
            height: value.height || '',
            size: value.size || ''
          };
        }
        if (typeof value === 'number' || /^[0-9]+$/.test(String(value))) {
          return { id: value, url: '', title: '#' + value, filename: '#' + value };
        }
        return { id: '', url: String(value), title: fileName(value), filename: fileName(value), mime: '' };
      },
      serializeItem: function (item) {
        var type = this.returnType || (this.multiple ? 'array' : 'url');
        if (type === 'id') { return item.id || ''; }
        if (type === 'array' || type === 'object') { return item; }
        return item.url || '';
      },
      emitItems: function (items) {
        if (this.multiple) {
          this.$emit('update:modelValue', items.map(this.serializeItem));
          return;
        }
        this.$emit('update:modelValue', items.length ? this.serializeItem(items[0]) : '');
      },
      openLibrary: function () {
        this.browserOpen = true;
        this.browserPicked = this.items.slice();
        this.browserPage = 1;
        this.loadLibrary();
      },
      closeLibrary: function () {
        this.browserOpen = false;
        this.browserError = '';
      },
      loadLibrary: function () {
        var self = this;
        if (!window.fetch) {
          this.browserError = '当前浏览器不支持媒体库接口。';
          return;
        }
        var params = new URLSearchParams();
        params.set('per_page', '24');
        params.set('page', String(this.browserPage));
        if (this.mode === 'image') { params.set('media_type', 'image'); }
        if (this.browserQuery.trim()) { params.set('search', this.browserQuery.trim()); }
        this.browserLoading = true;
        this.browserError = '';
        window.fetch(restBase() + 'wp/v2/media?' + params.toString(), {
          credentials: 'same-origin',
          headers: { 'X-WP-Nonce': cfg().restNonce || '' }
        }).then(function (res) {
          var pages = parseInt(res.headers.get('X-WP-TotalPages') || '1', 10);
          self.browserTotalPages = Math.max(1, pages || 1);
          return res.json().then(function (json) {
            if (!res.ok) { throw new Error(json && json.message ? json.message : '媒体库加载失败'); }
            self.browserItems = Array.isArray(json) ? json.map(formatMediaItem) : [];
          });
        }).catch(function (err) {
          self.browserItems = [];
          self.browserError = err && err.message ? err.message : '媒体库加载失败';
        }).finally(function () {
          self.browserLoading = false;
        });
      },
      searchLibrary: function () {
        this.browserPage = 1;
        this.loadLibrary();
      },
      setLibraryPage: function (page) {
        page = Math.min(this.browserTotalPages, Math.max(1, page));
        if (page === this.browserPage) { return; }
        this.browserPage = page;
        this.loadLibrary();
      },
      isPicked: function (item) {
        var key = String(item.id || item.url);
        return this.selectedIds.indexOf(key) !== -1;
      },
      togglePick: function (item) {
        var key = String(item.id || item.url);
        if (!this.multiple) {
          this.browserPicked = [item];
          return;
        }
        var next = this.browserPicked.slice();
        var idx = next.findIndex(function (picked) { return String(picked.id || picked.url) === key; });
        if (idx >= 0) { next.splice(idx, 1); } else { next.push(item); }
        this.browserPicked = next;
      },
      applyLibrary: function () {
        this.emitItems(this.browserPicked);
        this.closeLibrary();
      },
      chooseFile: function () {
        this.$refs.file && this.$refs.file.click();
      },
      onFileChange: function (event) {
        this.uploadFiles(event.target.files);
        event.target.value = '';
      },
      onDrop: function (event) {
        this.drag = false;
        this.uploadFiles(event.dataTransfer.files);
      },
      uploadFiles: function (files) {
        var self = this;
        files = Array.prototype.slice.call(files || []);
        if (!files.length) { return; }
        if (!window.fetch) {
          this.error = '当前浏览器不支持上传接口。';
          return;
        }
        if (!this.multiple) { files = files.slice(0, 1); }
        this.error = '';
        this.uploading = true;
        Promise.all(files.map(function (file) { return self.uploadFile(file); }))
          .then(function (uploaded) {
            uploaded = uploaded.filter(Boolean);
            self.emitItems(self.multiple ? self.items.concat(uploaded) : uploaded.slice(0, 1));
            if (self.browserOpen) {
              self.closeLibrary();
            }
          })
          .catch(function (err) {
            self.error = err && err.message ? err.message : '上传失败';
          })
          .finally(function () {
            self.uploading = false;
          });
      },
      uploadFile: function (file) {
        if (this.maxBytes && file.size > this.maxBytes) {
          return Promise.reject(new Error('文件大小超过限制：' + this.maxSize + 'MB'));
        }
        var headers = {
          'X-WP-Nonce': cfg().restNonce || '',
          'Content-Disposition': 'attachment; filename="' + encodeURIComponent(file.name) + '"'
        };
        if (file.type) { headers['Content-Type'] = file.type; }
        return window.fetch(restBase() + 'wp/v2/media', {
          method: 'POST',
          headers: headers,
          credentials: 'same-origin',
          body: file
        }).then(function (res) {
          return res.json().then(function (json) {
            if (!res.ok) { throw new Error(json && json.message ? json.message : '上传失败'); }
            var item = formatMediaItem(json);
            item.filename = item.filename || file.name;
            item.size = item.size || (Math.round(file.size / 1024) + ' KB');
            return item;
          });
        });
      },
      removeAt: function (index) {
        var next = this.items.slice();
        next.splice(index, 1);
        this.emitItems(next);
      },
      replaceAt: function (index) {
        this.removeAt(index);
        this.openLibrary();
      },
      metaText: function (item) {
        var parts = [];
        if (item.width && item.height) { parts.push(item.width + ' x ' + item.height); }
        if (item.size) { parts.push(item.size); }
        if (item.mime) { parts.push(item.mime.replace(/^image\//, '')); }
        return parts.join(' · ');
      },
      isImage: isImage
    },
    template: [
      '<div class="eva-media" :class="{ \'is-drag\': drag, \'is-uploading\': uploading, \'is-compact\': !showDrop }">',
      '  <input ref="file" class="eva-media-file" type="file" :accept="accept" :multiple="multiple" @change="onFileChange">',
      '  <div class="eva-media-list" v-if="items.length">',
      '    <div class="eva-media-item" v-for="(item, i) in items" :key="item.url || item.id || i">',
      '      <div class="eva-media-thumb">',
      '        <img v-if="preview && item.url && isImage(item)" :src="item.thumb || item.url" :alt="item.title || item.filename">',
      '        <i v-else class="ri-image-line"></i>',
      '      </div>',
      '      <div class="eva-media-info">',
      '        <strong>{{ item.title || item.filename }}</strong>',
      '        <span>{{ metaText(item) || item.url }}</span>',
      '      </div>',
      '      <div class="eva-media-actions">',
      '        <button type="button" @click="openLibrary"><i class="ri-image-edit-line"></i> 替换图片</button>',
      '        <button type="button" @click="removeAt(i)"><i class="ri-delete-bin-line"></i> 删除</button>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div v-else class="eva-media-empty">',
      '    <button type="button" class="eva-media-primary" @click="chooseFile"><i class="ri-upload-cloud-2-line"></i>{{ buttonTitle || \'选择图片\' }}</button>',
      '    <button type="button" class="eva-media-secondary" @click="openLibrary">从媒体库选择</button>',
      '  </div>',
      '  <div v-if="showDrop" class="eva-media-drop" @dragenter.prevent="drag = true" @dragover.prevent="drag = true" @dragleave.prevent="drag = false" @drop.prevent="onDrop">',
      '    <i class="ri-upload-cloud-2-line"></i>',
      '    <strong>{{ uploading ? \'正在上传...\' : placeholder }}</strong>',
      '    <span>支持 jpg、png、webp 格式，最大 {{ maxSize }}MB</span>',
      '    <button type="button" @click="chooseFile">从本地选择</button>',
      '  </div>',
      '  <div v-if="browserOpen" class="eva-media-browser" role="dialog" aria-modal="true">',
      '    <div class="eva-media-browser-panel">',
      '      <div class="eva-media-browser-head">',
      '        <div><strong>选择媒体</strong><span>从媒体库选择或搜索已有文件</span></div>',
      '        <button type="button" class="eva-media-browser-close" @click="closeLibrary"><i class="ri-close-line"></i></button>',
      '      </div>',
      '      <div class="eva-media-browser-toolbar">',
      '        <label class="eva-media-browser-search"><i class="ri-search-line"></i><input v-model="browserQuery" type="search" placeholder="搜索媒体..." @keydown.enter.prevent="searchLibrary"></label>',
      '        <button type="button" class="eva-media-secondary" @click="searchLibrary">搜索</button>',
      '        <button type="button" class="eva-media-primary" @click="chooseFile"><i class="ri-upload-cloud-2-line"></i>上传新文件</button>',
      '      </div>',
      '      <div class="eva-media-browser-body">',
      '        <div v-if="browserLoading" class="eva-media-browser-state">媒体库加载中...</div>',
      '        <div v-else-if="browserError" class="eva-media-browser-state is-error">{{ browserError }}</div>',
      '        <div v-else-if="!browserItems.length" class="eva-media-browser-state">没有找到媒体文件</div>',
      '        <div v-else class="eva-media-browser-grid">',
      '          <button v-for="item in browserItems" :key="item.id || item.url" type="button" class="eva-media-browser-card" :class="{ \'is-picked\': isPicked(item) }" @click="togglePick(item)">',
      '            <span class="eva-media-browser-thumb"><img v-if="item.url && isImage(item)" :src="item.thumb || item.url" :alt="item.title"><i v-else class="ri-file-line"></i></span>',
      '            <span class="eva-media-browser-name">{{ item.title || item.filename }}</span>',
      '            <em v-if="isPicked(item)" class="eva-media-browser-check"><i class="ri-check-line"></i></em>',
      '          </button>',
      '        </div>',
      '      </div>',
      '      <div class="eva-media-browser-foot">',
      '        <div class="eva-media-browser-pages">',
      '          <button type="button" :disabled="browserPage <= 1 || browserLoading" @click="setLibraryPage(browserPage - 1)">上一页</button>',
      '          <span>{{ browserPage }} / {{ browserTotalPages }}</span>',
      '          <button type="button" :disabled="browserPage >= browserTotalPages || browserLoading" @click="setLibraryPage(browserPage + 1)">下一页</button>',
      '        </div>',
      '        <div class="eva-media-browser-submit">',
      '          <span>已选 {{ browserPicked.length }} 个</span>',
      '          <button type="button" class="eva-media-primary" :disabled="!browserPicked.length" @click="applyLibrary">应用选择</button>',
      '        </div>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <p v-if="error" class="eva-media-error">{{ error }}</p>',
      '</div>'
    ].join('\n')
  };
})();
