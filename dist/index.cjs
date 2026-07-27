var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// index.js
var index_exports = {};
__export(index_exports, {
  ContextItem: () => ContextItem,
  ContextMenu: () => ContextMenu,
  ContextWindow: () => ContextWindow,
  MenuTemplate: () => MenuTemplate,
  MenuWindow: () => MenuWindow
});
module.exports = __toCommonJS(index_exports);

// node_modules/tsup/assets/cjs_shims.js
var getImportMetaUrl = () => typeof document === "undefined" ? new URL(`file:${__filename}`).href : document.currentScript && document.currentScript.tagName.toUpperCase() === "SCRIPT" ? document.currentScript.src : new URL("main.js", document.baseURI).href;
var importMetaUrl = /* @__PURE__ */ getImportMetaUrl();

// index.js
var import_electron = require("electron");
var import_node_path = __toESM(require("path"), 1);
var import_node_url = require("url");
var import_meta = {};
var pkgDir;
if (typeof require !== "undefined" && require.resolve) {
  const packageName = "@murphts/contexto/package.json";
  pkgDir = import_node_path.default.dirname(require.resolve(packageName));
} else {
  try {
    const packageName = "@murphts/contexto/package.json";
    const resolvedPath = (0, import_node_url.fileURLToPath)(import_meta.resolve(packageName));
    pkgDir = import_node_path.default.dirname(resolvedPath);
  } catch {
    const __dirname = import_node_path.default.dirname((0, import_node_url.fileURLToPath)(importMetaUrl));
    pkgDir = import_node_path.default.resolve(__dirname, "..");
  }
}
var WIN_WIDTH = 235;
var WIN_HEIGHT = 205;
function sendMessage(window, eventName, value) {
  window.webContents.send("asynchronous-reply", { event: eventName, value });
}
function waitUntil(condition, interval = 100) {
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      if (condition()) {
        clearInterval(timer);
        resolve();
      }
    }, interval);
  });
}
var MenuTemplate = class {
  constructor(path2) {
    this.path = path2;
  }
};
var ContextMenu = class {
  constructor(template = null, animationSpeed = 100) {
    this.template = template;
    this.animationSpeed = animationSpeed;
    this.windows = [];
    this.content = [];
    this._latestOverId = [];
    this._initiated = false;
    this.initTemplate();
    this.initIPC();
  }
  /**
   * @param {ContextItem} target
   * @param {number} currentDepth
   * @param {ContextItem[]} content
   * @returns {number}
   */
  findDepth(target, currentDepth = 0, content = this.content) {
    for (const item of content) {
      if (item === target) return currentDepth;
      if (item.options) {
        const found = this.findDepth(target, currentDepth + 1, item.options);
        if (found !== -1) return found;
      }
    }
    return -1;
  }
  /** @returns {number} */
  calcDepth() {
    let maxDepth = 0;
    for (const item of this.content) {
      const depth = this.iterate(item, 0);
      if (depth > maxDepth) maxDepth = depth;
    }
    return maxDepth;
  }
  /**
   * @param {ContextItem} item
   * @param {number} currentDepth
   * @returns {number}
   */
  iterate(item, currentDepth) {
    if (!item.options || item.options.length === 0) {
      return currentDepth;
    }
    let maxChildDepth = currentDepth;
    for (const option of item.options) {
      const childDepth = this.iterate(option, currentDepth + 1);
      if (childDepth > maxChildDepth) maxChildDepth = childDepth;
    }
    return maxChildDepth;
  }
  /**
   * @param {ContextItem[]} content
   * @returns {ContextItem[]}
   */
  flatMap(content = this.content) {
    return content.flatMap((item) => [
      item,
      ...this.flatMap(item.options ?? [])
    ]);
  }
  /** @param {string} id */
  findItem(id) {
    return this.flatMap().find((item) => item.id === id);
  }
  blurAll() {
    this.windows.forEach((window) => window.hide());
  }
  /** @returns {ContextWindow} */
  initWindow(animate) {
    return new ContextWindow(this, animate);
  }
  initTemplate() {
    if (this.template == null) {
      this.template = new MenuTemplate(import_node_path.default.join(pkgDir, `index.html`));
    }
  }
  initIPC() {
    import_electron.ipcMain.on("@murphts/on-context-menu-item-click", (e, id) => {
      var _a;
      const item = this.findItem(id);
      if (item && (item.options == null || item.options.length === 0)) {
        this.blurAll();
        (_a = item == null ? void 0 : item.func) == null ? void 0 : _a.call(item);
      }
    });
    import_electron.ipcMain.on("@murphts/on-context-menu-item-over", (e, data) => {
      const item = this.findItem(data.id);
      const depth = this.findDepth(item) + 1;
      if (item.options != null && item.options.length > 0) {
        const rootWindow = this.windows[depth - 1];
        const contextWindow = this.windows[depth];
        if (rootWindow == null || rootWindow.active) {
          if (!this._latestOverId.some((x) => x.depth === depth && x.id === data.id))
            sendMessage(contextWindow.window, "@murphts/on-show-context-menu", {
              options: item.options,
              rect: data.rect
            });
        }
        this.windows.forEach((window, i) => {
          if (i > depth) {
            window.hide();
          }
        });
      } else {
        this.windows.forEach((window, i) => {
          if (i >= depth) {
            window.hide();
          }
        });
      }
      this._latestOverId.forEach((x, i) => {
        if (i >= depth)
          x.id = "";
      });
      const overId = this._latestOverId.find((x) => x.depth === depth);
      if (overId != null)
        overId.id = data.id;
      else this._latestOverId.push({ depth, id: data.id });
    });
    import_electron.ipcMain.on("@murphts/on-context-menu-item-leave", (e, id) => {
    });
    import_electron.ipcMain.on("@murphts/on-resolve-context-menu", (e, data) => {
      WIN_WIDTH = Math.round(data.rect.width);
      WIN_HEIGHT = Math.round(data.rect.height);
      let { x, y } = import_electron.screen.getCursorScreenPoint();
      const { bounds } = import_electron.screen.getPrimaryDisplay();
      WIN_HEIGHT = Math.min(WIN_HEIGHT, bounds.height);
      if (data.offset != null) {
        x = data.offset.x + data.offset.width;
        y = data.offset.y + data.offset.height;
      }
      const outOfBounds = x + WIN_WIDTH - data.rect.extraRight > bounds.width || x - data.rect.extraLeft < 0;
      console.log(outOfBounds, x, y);
      if (data.offset != null) {
        if (outOfBounds) {
          x = data.offset.x - data.offset.width;
          y = data.offset.y + data.offset.height;
        }
      }
      console.log("...");
      console.log(outOfBounds, x, y);
      let posX = x + WIN_WIDTH - data.rect.extraRight > bounds.width ? x - WIN_WIDTH + data.rect.extraRight : x - data.rect.extraLeft < 0 ? -data.rect.extraLeft : x - data.rect.extraLeft;
      let posY = y - WIN_HEIGHT - data.rect.extraBottom < 0 ? y - data.rect.extraTop : y > bounds.height ? bounds.height - WIN_HEIGHT - data.rect.extraBottom : y - WIN_HEIGHT + data.rect.extraBottom;
      const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
      posY = clamp(posY, 0, clamp(0, bounds.height - WIN_HEIGHT - data.rect.extraBottom, bounds.height));
      console.log("...");
      console.log(posX, posY, WIN_WIDTH, WIN_HEIGHT, bounds.width, bounds.height);
      let contextWindow = this.windows[data.id];
      let window = contextWindow.window;
      contextWindow.setActive(true);
      window.setOpacity(0);
      window.setBounds({
        x: posX,
        y: posY,
        width: WIN_WIDTH,
        height: WIN_HEIGHT
      }, false);
      window.show();
      window.focus();
      sendMessage(window, "@murphts/on-load-context-menu", {
        offsetRect: { x: posX, y: posY, width: WIN_WIDTH, height: WIN_HEIGHT },
        sh: bounds.height
      });
      if (contextWindow.animate) {
        const ANIMATION_FPS = 60;
        const intervalMs = 1e3 / ANIMATION_FPS;
        const totalSteps = this.animationSpeed / 1e3 * ANIMATION_FPS;
        const opacityStep = 1 / totalSteps;
        let opacity = 0;
        clearInterval(contextWindow.currentInterval);
        contextWindow.currentInterval = setInterval(() => {
          if (window == null || window.isDestroyed()) {
            clearInterval(contextWindow.currentInterval);
            return;
          }
          opacity += opacityStep;
          window.setOpacity(opacity);
          if (opacity >= 1) clearInterval(contextWindow.currentInterval);
        }, intervalMs);
      } else {
        window.setOpacity(1);
      }
    });
  }
  /** @param {ContextItem} item */
  addItem(item) {
    this.content.push(item);
  }
  clear() {
    this.content = [];
  }
  async showAsContext(animate = true) {
    if (!this._initiated) {
      const depth = this.calcDepth() + 1;
      const initialWindows = [];
      for (let i = 0; i < depth; i++) {
        initialWindows.push(this.initWindow(animate));
      }
      this._initiated = true;
      await waitUntil(() => initialWindows.every((x) => x.ready));
      const options = this.content.map((item) => {
        var _a;
        return {
          id: item.id,
          title: item.title,
          options: (_a = item.options) == null ? void 0 : _a.map((option) => ({
            title: option.title
          }))
        };
      });
      sendMessage(this.windows[0].window, "@murphts/on-show-context-menu", {
        offsetRect: {},
        options
      });
    } else {
      const options = this.content.map((item) => {
        var _a;
        return {
          id: item.id,
          title: item.title,
          options: (_a = item.options) == null ? void 0 : _a.map((option) => ({
            title: option.title
          }))
        };
      });
      sendMessage(this.windows[0].window, "@murphts/on-show-context-menu", {
        offsetRect: {},
        options
      });
    }
  }
};
var ContextWindow = class {
  /** @param {ContextMenu} menu
   * @param {boolean} animate
   */
  constructor(menu, animate) {
    this.menu = menu;
    this.currentInterval = null;
    this.ready = false;
    this.suppressBlur = false;
    this.active = false;
    this.animate = animate;
    this.window = new MenuWindow({
      width: WIN_WIDTH,
      height: WIN_HEIGHT,
      frame: false,
      resizable: false,
      show: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      transparent: true,
      thickFrame: false,
      roundedCorners: false,
      hasShadow: false,
      backgroundColor: "#00000000",
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: import_node_path.default.join(pkgDir, "preload.js"),
        devTools: true
      }
    });
    this.window.webContents.loadFile(menu.template.path);
    this.initiate();
  }
  initiate() {
    const window = this.window;
    const webContents = window.webContents;
    webContents.on("did-finish-load", () => {
      webContents.executeJavaScript(`
                const s = document.createElement('script');
                s.src = 'file://${import_node_path.default.join(pkgDir, "renderer.js").replace(/\\/g, "/")}';
                document.head.appendChild(s);
            `);
    });
    import_electron.ipcMain.on("@murphts/on-context-menu-ready", (event) => {
      if (event.sender !== webContents) return;
      const { bounds } = import_electron.screen.getPrimaryDisplay();
      window.setOpacity(0);
      window.showInactive();
      window.setSize(WIN_WIDTH, WIN_HEIGHT);
      window.setPosition(bounds.width + 1, 0);
      const contextID = this.menu.windows.length;
      sendMessage(this.window, "@murphts/on-resolve-context-id", contextID);
      this.ready = true;
      this.menu.windows.push(this);
    });
    window.on("blur", () => {
      if (!this.suppressBlur) {
        for (let cw of this.menu.windows) {
          if (cw.window.isFocused() && cw.window !== window) {
            return;
          }
        }
      }
      this.suppressBlur = false;
      this.menu.blurAll();
    });
  }
  hide() {
    const window = this.window;
    const { bounds } = import_electron.screen.getPrimaryDisplay();
    if (this.animate) {
      const ANIMATION_FPS = 60;
      const intervalMs = 1e3 / ANIMATION_FPS;
      const totalSteps = this.menu.animationSpeed / 1e3 * ANIMATION_FPS;
      const opacityStep = 1 / totalSteps;
      let opacity = 1;
      clearInterval(this.currentInterval);
      this.currentInterval = setInterval(() => {
        if (window == null || window.isDestroyed()) {
          clearInterval(this.currentInterval);
          return;
        }
        opacity -= opacityStep;
        window.setOpacity(opacity);
        if (opacity <= 0) {
          clearInterval(this.currentInterval);
          window.setOpacity(0);
          window.setPosition(bounds.width + 1, 0);
        }
      }, intervalMs);
    } else {
      window.setOpacity(0);
      window.setPosition(bounds.width + 1, 0);
    }
  }
  /** @param {boolean} active */
  setActive(active) {
    this.active = active;
  }
};
var MenuWindow = class extends import_electron.BaseWindow {
  constructor(options = null) {
    super(options);
    this.view = new import_electron.WebContentsView({
      webPreferences: options.webPreferences
    });
    this.view.setBackgroundColor(options.backgroundColor);
    this.contentView = this.view;
    this.webContents = this.view.webContents;
  }
};
var ContextItem = class {
  constructor(title, options, func) {
    this.id = crypto.randomUUID();
    this.title = title;
    this.options = options;
    this.func = func;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ContextItem,
  ContextMenu,
  ContextWindow,
  MenuTemplate,
  MenuWindow
});
