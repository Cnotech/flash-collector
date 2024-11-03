import { app, BrowserWindow, shell } from "electron";
import { release } from "os";
import path from "path";
import bridge from "./bridge";
import cp from "child_process";
import { GameInfo } from "../class";

// Disable GPU Acceleration for Windows 7
if (release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}
process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";
app.commandLine.appendSwitch("ignore-certificate-errors");

let win: BrowserWindow | null = null,
  updateOnExit = false,
  latestVersion = version();

async function createWindow() {
  win = new BrowserWindow({
    title: "Launching...",
    width: 1400,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.cjs"),
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      plugins: true,
    },
    icon: "./retinue/favicon.ico",
  });
  win.removeMenu();

  if (app.isPackaged) {
    await win.loadFile(path.join(__dirname, "../renderer/index.html"));
  } else {
    // 🚧 Use ['ENV_NAME'] avoid vite:define plugin
    const url = `http://${process.env["VITE_DEV_SERVER_HOST"]}:${process.env["VITE_DEV_SERVER_PORT"]}`;

    await win.loadURL(url);
    win.webContents.openDevTools();
  }

  // Test active push message to Renderer-process
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  win = null;
  if (process.platform !== "darwin") {
    if (updateOnExit) update();
    app.quit();
  }
});

app.on("second-instance", () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on("activate", async () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    await createWindow();
  }
});

function toggleDevtool() {
  win?.webContents.toggleDevTools();
}

function restart() {
  if (app.isPackaged) cp.exec("flash-collector.exe");
  else cp.exec("electron .");
  app.exit();
}

function version() {
  return app.getVersion();
}

function enableUpdate(v: string) {
  if (app.isPackaged) {
    updateOnExit = true;
    latestVersion = v;
  } else {
    console.log("Reject update due to develop mode");
  }
}

function update() {
  cp.exec(`start cmd /c main.cmd ${latestVersion}`);
}

function isPackaged() {
  return app.isPackaged;
}

function logToRenderer(msg: any) {
  win?.webContents.send("logToRenderer", msg);
}

function realTimeSniffing(payload?: {
  url: string;
  method: "downloaded" | "cached" | "ignored" | "error";
  info: GameInfo;
}) {
  win?.webContents.send("realTimeSniffing", {
    display: payload != null,
    payload,
  });
}

bridge();
export {
  toggleDevtool,
  restart,
  version,
  enableUpdate,
  isPackaged,
  logToRenderer,
  realTimeSniffing,
};
