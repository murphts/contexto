const { BrowserWindow, screen, ipcMain } = require('electron');
const path = require("path");

let WIN_WIDTH = 235;
let WIN_HEIGHT = 205;

function sendMessage(win, eventName, value) {
    win.webContents.send('asynchronous-reply', { event: eventName, value: value });
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

class ContextMenu {
    constructor() {
        /** @type {ContextWindow[]} */
        this.windows = [];
        /** @type {ContextItem[]} */
        this.content = [];
        /** @type {{ depth: number, id: string }[]} */
        this._latestOverId = [];
        /** @type {boolean} */
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
        return content.flatMap(item => [
            item,
            ...this.flatMap(item.options ?? [])
        ]);
    }

    /** @param {string} id */
    findItem(id) {
        return this.flatMap().find(item => item.id === id);
    }

    blurAll() {
        this.windows.forEach(window => window.hide());
    }

    /** @returns {ContextWindow} */
    initWindow(animate) {
        return new ContextWindow(this, animate);
    }

    initIPC() {
        ipcMain.on('ctx-menu', (e, id) => {
            const item = this.findItem(id);
            const depth = this.findDepth(item);

            if (item && (item.options == null || item.options.length === 0)) {
                this.blurAll();
                item?.func?.();
            }
        });

        ipcMain.on('ctx-over', (e, data) => {
            const item = this.findItem(data.id);
            const depth = this.findDepth(item) + 1;

            if (item.options != null && item.options.length > 0) {
                const rootWindow = this.windows[depth - 1];
                const contextWindow = this.windows[depth];

                if (rootWindow == null || rootWindow.active) {
                    if (!this._latestOverId.some(x => x.depth == depth && x.id == data.id))
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

            const overId = this._latestOverId.find(x => x.depth == depth);

            if (overId != null)
                overId.id = data.id;
            else this._latestOverId.push({ depth: depth, id: data.id });
        });

        ipcMain.on('ctx-leave', (e, id) => {
            // xtraCtx.blur()
        });

        ipcMain.on('resolve-ctx', (e, data) => {
            WIN_WIDTH = Math.round(data.rect.width);
            WIN_HEIGHT = Math.round(data.rect.height);

            let { x, y } = screen.getCursorScreenPoint();
            const { bounds } = screen.getPrimaryDisplay();

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

            let posX = x + WIN_WIDTH - data.rect.extraRight > bounds.width ? x - WIN_WIDTH + data.rect.extraRight :
                (x - data.rect.extraLeft < 0 ? -data.rect.extraLeft : x - data.rect.extraLeft);
            let posY = y - WIN_HEIGHT - data.rect.extraBottom < 0 ? y - data.rect.extraTop :
                (y > bounds.height ? bounds.height - WIN_HEIGHT - data.rect.extraBottom : y - WIN_HEIGHT + data.rect.extraBottom);

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
                    opacity += 0.1;
                    window.setOpacity(opacity);
                    if (opacity >= 1) clearInterval(contextWindow.currentInterval);
                }, 10);
            }
            else {
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

            await waitUntil(() => initialWindows.every(x => x.ready));

            const options = this.content.map(item => ({
                id: item.id,
                title: item.title,
                options: item.options?.map(option => ({
                    title: option.title
                }))
            }));

            sendMessage(this.windows[0].window, "ctx-menu", {
                offsetRect: {},
                options: options
            });
        } else {
            const options = this.content.map(item => ({
                id: item.id,
                title: item.title,
                options: item.options?.map(option => ({
                    title: option.title
                }))
            }));

            sendMessage(this.windows[0].window, "ctx-menu", {
                offsetRect: {},
                options: options
            });
        }
    }
}

class ContextWindow {
    /** @param {ContextMenu} menu */
    constructor(menu, animate) {
        /** @type {ContextMenu} */
        this.menu = menu;
        /** @type {BrowserWindow} */
        this.window = new BrowserWindow({
            width: WIN_WIDTH,
            height: WIN_HEIGHT,
            frame: false,
            resizable: false,
            show: false,
            alwaysOnTop: true,
            skipTaskbar: true,
            transparent: true,
            thickFrame: false,
            backgroundColor: '#00000000',
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                preload: path.join(__dirname, 'preload.js'),
            }
        });

        /** @type {ReturnType<typeof setInterval> | null} */
        this.currentInterval = null;
        /** @type {boolean} */
        this.ready = false;
        /** @type {boolean} */
        this.suppressBlur = false;
        /** @type {boolean} */
        this.active = false;
        /** @type {boolean} */
        this.animate = animate;

        // this.window.loadFile('index.html');
        this.window.loadFile(path.join(__dirname, `index.html`));
        this.initiate();
    }

    initiate() {
        const window = this.window;
        window.once('ready-to-show', () => {
            const { bounds } = screen.getPrimaryDisplay();

            window.setOpacity(0);
            window.showInactive();
            window.setSize(WIN_WIDTH, WIN_HEIGHT);
            window.setPosition(bounds.width + 1, 0);

            const contextID = this.menu.windows.length;
            sendMessage(window, "ctx-id", contextID);

            this.ready = true;

            this.menu.windows.push(this);
        });

        window.on('blur', () => {
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
        const { bounds } = screen.getPrimaryDisplay();

        if (this.animate)
        {
            let opacity = 1;

            clearInterval(this.currentInterval);
            this.currentInterval = setInterval(() => {
                opacity -= 0.1;
                window.setOpacity(opacity);
                if (opacity <= 0) {
                    clearInterval(this.currentInterval);
                    window.setOpacity(0);
                    window.setPosition(bounds.width + 1, 0);
                }
            }, 10);
        }
        else {
            window.setOpacity(0);
            window.setPosition(bounds.width + 1, 0);
        }
    }

    /** @param {boolean} b */
    setActive(b) {
        this.active = b;
    }
}

class ContextItem {
    constructor(title, options, func) {
        /** @type {string} */
        this.id = crypto.randomUUID();
        /** @type {string} */
        this.title = title;
        /** @type {ContextItem[] | undefined} */
        this.options = options;
        /** @type {(() => void) | undefined} */
        this.func = func;
    }
}

module.exports = { ContextMenu, ContextItem, ContextWindow };