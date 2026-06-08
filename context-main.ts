import {BrowserWindow, screen, ipcMain} from "electron";
import path from "path";
import * as crypto from "node:crypto";

let WIN_WIDTH = 235;
let WIN_HEIGHT = 205;

function sendMessage(win: BrowserWindow, eventName: string, value: any) {
    win.webContents.send('asynchronous-reply', {event: eventName, value: value});
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
    windows: ContextWindow[] = [];
    content: ContextItem[] = [];
    _latestOverId: {
        depth: number;
        id: string;
    }[] = [];
    _initiated: boolean = false;

    constructor() {
        // this.initWindow();
        this.initIPC();
    }

    findDepth(target: ContextItem, currentDepth: number = 0, content: ContextItem[] = this.content): number {
        for (const item of content) {
            if (item === target) return currentDepth;

            if (item.options) {
                const found = this.findDepth(target, currentDepth + 1, item.options);
                if (found !== -1) return found;
            }
        }

        return -1;
    }
    
    calcDepth(): number {
        let maxDepth = 0;

        for (const item of this.content) {
            const depth = this.iterate(item, 0);
            if (depth > maxDepth) maxDepth = depth;
        }

        return maxDepth;
    }

    iterate(item: ContextItem, currentDepth: number): number {
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

    flatMap(content: ContextItem[] = this.content): ContextItem[] {
        return content.flatMap(item => [
            item,
            ...this.flatMap(item.options ?? [])
        ]);
    }

    findItem(id: string) {
        return this.flatMap().find(item => item.id === id);
    }

    blurAll() {
        this.windows.forEach(window => window.hide());
    }

    initWindow() {
        return new ContextWindow(this);
    }

    initIPC() {
        ipcMain.on('ctx-menu', (e, id) => {
            const item = this.findItem(id);
            const depth = this.findDepth(item);

            if (item) {
                this.blurAll();
                // this.windows[depth].blur();
                item?.func?.();
            }
        });

        ipcMain.on('ctx-over', (e, data) => {
            const hasOption = data.hasOption;
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
                        window.hide()
                    }
                });
            } else {
                this.windows.forEach((window, i) => {
                    if (i >= depth) {
                        window.hide()
                    }
                });
            }

            this._latestOverId.forEach((x, i) => {
                if (i >= depth)
                    x.id = "";
            })

            const overId = this._latestOverId.find(x => x.depth == depth);
            
            if (overId != null)
                overId.id = data.id;
            else this._latestOverId.push({depth: depth, id: data.id})
        });

        ipcMain.on('ctx-leave', (e, id) => {
            // xtraCtx.blur()
            // console.log("leave", id)
        });

        ipcMain.on('resolve-ctx', (e, data) => {
            WIN_WIDTH = Math.round(data.rect.width);
            WIN_HEIGHT = Math.round(data.rect.height);

            let {x, y} = screen.getCursorScreenPoint();
            const {bounds} = screen.getPrimaryDisplay();

            if (data.offset != null) {
                x = data.offset.x + data.offset.width;
                y = data.offset.y + data.offset.height;
            }

            const outOfBounds = x + WIN_WIDTH - data.rect.extraRight > bounds.width || x - data.rect.extraLeft < 0;
            
            
            // if (data.offset != null) {
            //     if (outOfBounds) {
            //         x = data.offset.x - data.offset.width;
            //         y = data.offset.y + data.offset.height;
            //     }
            //     else {
            //         x = data.offset.x + data.offset.width;
            //         y = data.offset.y + data.offset.height;
            //     }
            // }

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
            
            const pureHeight = WIN_HEIGHT - data.rect.extraTop - data.rect.extraBottom;
            
            // posY -= (outOfBounds ? (pureHeight ?? 0) : 0);
            // posY -= (outOfBounds ? (data.offset?.height ?? 0) : 0);

            sendMessage(window, "init-ctx-menu", {
                offsetRect: {x: posX, y: posY, width: WIN_WIDTH, height: WIN_HEIGHT}
            });

            let opacity = 0;
            clearInterval(contextWindow.currentInterval);
            contextWindow.currentInterval = setInterval(() => {
                opacity += 0.1;
                window.setOpacity(opacity);
                if (opacity >= 1) clearInterval(contextWindow.currentInterval);
            }, 10);
        })
    }

    addItem(item: ContextItem) {
        this.content.push(item);
    }

    clear() {
        this.content = [];
    }

    async showAsContext() {
        if (!this._initiated) {
            const depth = this.calcDepth() + 1;
            const initialWindows = [];
            for (let i = 0; i < depth; i++) {
                initialWindows.push(this.initWindow());
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
    menu: ContextMenu;
    window: BrowserWindow;
    currentInterval = null;
    ready: boolean = false;
    suppressBlur: boolean = false;
    active: boolean = false;

    constructor(menu: ContextMenu) {
        this.menu = menu;
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

        this.window.loadFile('index.html');
        this.initiate();
    }

    // blur() {
    //     this.suppressBlur = true;
    //     this.window.blur();
    //     this.setActive(false);
    // }

    initiate() {
        const window = this.window;
        window.once('ready-to-show', () => {
            const {bounds} = screen.getPrimaryDisplay();

            window.setOpacity(0);
            window.showInactive();
            window.setSize(WIN_WIDTH, WIN_HEIGHT);
            window.setPosition(bounds.width + 1, 0);

            const contextID = this.menu.windows.length;
            sendMessage(window, "ctx-id", contextID);

            // window?.webContents.on("console-message", (event) => {
            //     console.log(
            //         `[Renderer:${contextID}:${event.level}] ${event.message} (${event.sourceId}:${event.lineNumber})`
            //     );
            // });

            this.ready = true;

            this.menu.windows.push(this)
        });
        window.on('blur', () => {
            if (!this.suppressBlur) {
                for (let w of this.menu.windows) {
                    if (w.window.isFocused() && w.window != window) {
                        return;
                    }
                }
            } else {
                // if (this.menu.windows.filter(x => x != this).every(x => !x.window.isFocused()))
                // {
                //     this.menu.windows.forEach((w) => {
                //         if (w != this)
                //             w.blur();
                //     });
                //    
                //     return;
                // }
            }

            this.suppressBlur = false;
            this.menu.blurAll();
        });
    }

    hide() {
        const window = this.window;
        const {bounds} = screen.getPrimaryDisplay();
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

    setActive(b: boolean) {
        this.active = b;
    }
}

class ContextItem {
    id = crypto.randomUUID();
    title: string;
    func: () => void;
    options: ContextItem[];

    constructor(title: string, options?: ContextItem[], func?: () => void) {
        this.title = title;
        this.options = options;
        this.func = func;
    }
}

module.exports = {ContextMenu, ContextItem, ContextWindow};