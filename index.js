const {app, BrowserWindow, Tray, nativeImage, screen, ipcMain} = require('electron');
const path = require('path');
const {ContextMenu, ContextItem, ContextWindow} = require('./context')
// app.commandLine.appendSwitch('high-dpi-support', '1');
// app.commandLine.appendSwitch('force-device-scale-factor', '1');


let tray = null;
let ctx = null;
let currentInterval = null;

// Nodemon sends SIGTERM before respawning — clean up so the tray disappears
const cleanUp = () => {
    if (tray && !tray.isDestroyed()) tray.destroy();
    BrowserWindow.getAllWindows().forEach(w => {
        if (!w.isDestroyed()) w.destroy();
    });
    app.exit(0);
};

process.on('SIGTERM', cleanUp);
process.on('SIGINT', cleanUp);

app.whenReady().then(() => {
    const iconPath = path.join(__dirname, './tray_icon.png');
    const icon = nativeImage.createFromPath(iconPath).resize({
        width: 32,
        height: 32,
        quality: 'best'
    });

    tray = new Tray(icon);
    tray.setToolTip('E-Ctx');

    let contextMenu = new ContextMenu();
    tray.on('right-click', () => {
        const mem = process.memoryUsage();
        console.log(`RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`);

        contextMenu.clear();
        contextMenu.addItem(new ContextItem("File",
            [
                new ContextItem("New"),
                new ContextItem("Open",
                    [
                        new ContextItem("Recent",
                            [
                                new ContextItem("project_alpha"),
                                new ContextItem("project_beta"),
                                new ContextItem("project_gamma"),
                            ]),
                        new ContextItem("From URL"),
                        new ContextItem("From Disk"),
                    ]),
                new ContextItem("Save",
                    [
                        new ContextItem("Save As"),
                        new ContextItem("Save Copy"),
                        new ContextItem("Export",
                            [
                                new ContextItem("Export PDF"),
                                new ContextItem("Export PNG"),
                                new ContextItem("Export SVG"),
                            ]),
                    ]),
            ], () => console.log("File opened")));

        contextMenu.addItem(new ContextItem("Edit",
            [
                new ContextItem("Undo"),
                new ContextItem("Redo"),
                new ContextItem("Clipboard",
                    [
                        new ContextItem("Cut"),
                        new ContextItem("Copy"),
                        new ContextItem("Paste"),
                        new ContextItem("Paste Special"),
                    ]),
                new ContextItem("Find",
                    [
                        new ContextItem("Find in File"),
                        new ContextItem("Find in Project"),
                        new ContextItem("Replace"),
                    ]),
            ]));

        contextMenu.addItem(new ContextItem("View",
            [
                new ContextItem("Zoom",
                    [
                        new ContextItem("Zoom In"),
                        new ContextItem("Zoom Out"),
                        new ContextItem("Reset Zoom"),
                    ]),
                new ContextItem("Theme",
                    [
                        new ContextItem("Dark Mode"),
                        new ContextItem("Light Mode"),
                        new ContextItem("System Default"),
                    ]),
                new ContextItem("Layout",
                    [
                        new ContextItem("Sidebar Left"),
                        new ContextItem("Sidebar Right"),
                        new ContextItem("Fullscreen"),
                    ]),
            ]));

        contextMenu.addItem(new ContextItem("bra", null, null));
        contextMenu.addItem(new ContextItem("Quit", null, () => cleanUp()));

        contextMenu.showAsContext();
    });

    if (process.env.NODE_ENV === 'development') {
        const {watch} = require('fs');
        watch(path.join(__dirname, 'index.html'), () => {
            ctx.webContents.reload();
        });
    }

    ipcMain.on('kill', () => {
        app.quit();
    });
});

app.on('window-all-closed', () => {
    // Keep app alive in tray on macOS and production Windows
    if (process.platform !== 'darwin') app.quit();
});