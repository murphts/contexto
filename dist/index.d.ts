import { BrowserWindow } from 'electron';

declare class ContextItem {
    id: string;
    title: string;
    options: ContextItem[] | undefined;
    func: (() => void) | undefined;

    constructor(title: string, options?: ContextItem[], func?: () => void);
}

declare class ContextWindow {
    menu: ContextMenu;
    window: BrowserWindow;
    currentInterval: ReturnType<typeof setInterval> | null;
    ready: boolean;
    suppressBlur: boolean;
    active: boolean;
    animate: boolean;

    constructor(menu: ContextMenu, animate: boolean);

    initiate(): void;
    hide(): void;
    setActive(b: boolean): void;
}

declare class ContextMenu {
    windows: ContextWindow[];
    content: ContextItem[];
    _latestOverId: { depth: number; id: string }[];
    _initiated: boolean;

    constructor();

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

export { ContextItem, ContextMenu, ContextWindow };
