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
  ContextWindow: () => ContextWindow
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
function sendMessage(win, eventName, value) {
  win.webContents.send("asynchronous-reply", { event: eventName, value });
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
var ContextMenu = class {
  constructor() {
    this.windows = [];
    this.content = [];
    this._latestOverId = [];
    this._initiated = false;
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
  initIPC() {
    import_electron.ipcMain.on("ctx-menu", (e, id) => {
      var _a;
      const item = this.findItem(id);
      const depth = this.findDepth(item);
      if (item && (item.options == null || item.options.length === 0)) {
        this.blurAll();
        (_a = item == null ? void 0 : item.func) == null ? void 0 : _a.call(item);
      }
    });
    import_electron.ipcMain.on("ctx-over", (e, data) => {
      const item = this.findItem(data.id);
      const depth = this.findDepth(item) + 1;
      if (item.options != null && item.options.length > 0) {
        const rootWindow = this.windows[depth - 1];
        const contextWindow = this.windows[depth];
        if (rootWindow == null || rootWindow.active) {
          if (!this._latestOverId.some((x) => x.depth == depth && x.id == data.id))
            sendMessage(contextWindow.window, "ctx-menu", {
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
      const overId = this._latestOverId.find((x) => x.depth == depth);
      if (overId != null)
        overId.id = data.id;
      else this._latestOverId.push({ depth, id: data.id });
    });
    import_electron.ipcMain.on("ctx-leave", (e, id) => {
    });
    import_electron.ipcMain.on("resolve-ctx", (e, data) => {
      WIN_WIDTH = Math.round(data.rect.width);
      WIN_HEIGHT = Math.round(data.rect.height);
      let { x, y } = import_electron.screen.getCursorScreenPoint();
      const { bounds } = import_electron.screen.getPrimaryDisplay();
      if (data.offset != null) {
        x = data.offset.x + data.offset.width;
        y = data.offset.y + data.offset.height;
      }
      const outOfBounds = x + WIN_WIDTH - data.rect.extraRight > bounds.width || x - data.rect.extraLeft < 0;
      if (data.offset != null) {
        if (outOfBounds) {
          x = data.offset.x - data.offset.width;
          y = data.offset.y + data.offset.height;
        }
      }
      let posX = x + WIN_WIDTH - data.rect.extraRight > bounds.width ? x - WIN_WIDTH + data.rect.extraRight : x - data.rect.extraLeft < 0 ? -data.rect.extraLeft : x - data.rect.extraLeft;
      let posY = y - WIN_HEIGHT - data.rect.extraBottom < 0 ? y - data.rect.extraTop : y > bounds.height ? bounds.height - WIN_HEIGHT - data.rect.extraBottom : y - WIN_HEIGHT + data.rect.extraBottom;
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
      sendMessage(window, "init-ctx-menu", {
        offsetRect: { x: posX, y: posY, width: WIN_WIDTH, height: WIN_HEIGHT }
      });
      if (contextWindow.animate) {
        let opacity = 0;
        clearInterval(contextWindow.currentInterval);
        contextWindow.currentInterval = setInterval(() => {
          if (window == null || window.isDestroyed()) {
            clearInterval(this.currentInterval);
            return;
          }
          opacity += 0.1;
          window.setOpacity(opacity);
          if (opacity >= 1) clearInterval(contextWindow.currentInterval);
        }, 10);
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
      sendMessage(this.windows[0].window, "ctx-menu", {
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
      sendMessage(this.windows[0].window, "ctx-menu", {
        offsetRect: {},
        options
      });
    }
  }
};
var ContextWindow = class {
  /** @param {ContextMenu} menu */
  constructor(menu, animate) {
    this.menu = menu;
    this.window = new import_electron.BrowserWindow({
      width: WIN_WIDTH,
      height: WIN_HEIGHT,
      frame: false,
      resizable: false,
      show: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      transparent: true,
      thickFrame: false,
      backgroundColor: "#00000000",
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: import_node_path.default.join(pkgDir, "preload.js")
      }
    });
    this.currentInterval = null;
    this.ready = false;
    this.suppressBlur = false;
    this.active = false;
    this.animate = animate;
    this.window.loadFile(import_node_path.default.join(pkgDir, `index.html`));
    this.initiate();
  }
  initiate() {
    const window = this.window;
    window.once("ready-to-show", () => {
      const { bounds } = import_electron.screen.getPrimaryDisplay();
      window.setOpacity(0);
      window.showInactive();
      window.setSize(WIN_WIDTH, WIN_HEIGHT);
      window.setPosition(bounds.width + 1, 0);
      const contextID = this.menu.windows.length;
      sendMessage(window, "ctx-id", contextID);
      this.ready = true;
      this.menu.windows.push(this);
    });
    window.on("blur", () => {
      if (!this.suppressBlur) {
        for (let w of this.menu.windows) {
          if (w.window.isFocused() && w.window != window) {
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
      let opacity = 1;
      clearInterval(this.currentInterval);
      this.currentInterval = setInterval(() => {
        if (window == null || window.isDestroyed()) {
          clearInterval(this.currentInterval);
          return;
        }
        opacity -= 0.1;
        window.setOpacity(opacity);
        if (opacity <= 0) {
          clearInterval(this.currentInterval);
          window.setOpacity(0);
          window.setPosition(bounds.width + 1, 0);
        }
      }, 10);
    } else {
      window.setOpacity(0);
      window.setPosition(bounds.width + 1, 0);
    }
  }
  /** @param {boolean} b */
  setActive(b) {
    this.active = b;
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
  ContextWindow
});
