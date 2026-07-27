import { BaseWindow, WebContentsView, WebContents, BrowserWindowConstructorOptions } from 'electron';

declare class MenuTemplate {
    path: string;
    constructor(path: string);
}

declare class ContextMenu {
    template: MenuTemplate;
    animationSpeed: number;
    windows: ContextWindow[];
    content: ContextItem[];
    _latestOverId: { depth: number; id: string }[];
    _initiated: boolean;

    constructor(template?: MenuTemplate, animationSpeed?: number);

    findDepth(target: ContextItem, currentDepth?: number, content?: ContextItem[]): number;
    calcDepth(): number;
    iterate(item: ContextItem, currentDepth: number): number;
    flatMap(content?: ContextItem[]): ContextItem[];
    findItem(id: string): ContextItem | undefined;
    blurAll(): void;
    initWindow(animate: boolean): ContextWindow;
    initIPC(): void;
    addItem(item: ContextItem): void;
    clear(): void;
    showAsContext(animate: boolean): Promise<void>;
}

declare class ContextWindow {
    menu: ContextMenu;
    window: MenuWindow;
    view: WebContentsView;
    currentInterval: ReturnType<typeof setInterval> | null;
    ready: boolean;
    suppressBlur: boolean;
    active: boolean;
    animate: boolean;

    constructor(menu: ContextMenu, animate: boolean);

    initiate(): void;
    hide(): void;
    setActive(active: boolean): void;
}

declare class MenuWindow extends BaseWindow {
    readonly view: WebContentsView;
    readonly webContents: WebContents;

    constructor(options?: BrowserWindowConstructorOptions);
}

declare class ContextItem {
    id: string;
    title: string;
    options: ContextItem[] | undefined;
    func: (() => void) | undefined;

    constructor(title: string, options?: ContextItem[], func?: () => void);
}

export { ContextItem, ContextMenu, ContextWindow, MenuTemplate, MenuWindow };
