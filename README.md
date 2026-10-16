# Shuja's Downloader Pro

A locally hosted React/Vite download manager with a Node.js download service.

## Run locally

**Prerequisite:** Node.js 20 or later.

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`. The dev command starts both the Vite UI and the local download service. To stop both, press **Ctrl+C**.

To run the browser UI regression tests, keep the dev server running in one terminal and run this in another:

```powershell
npm test
```

Build and run the production version locally:

```powershell
npm run build
npm start
```

Downloads are saved under `Downloads\ShujaDownloader` in your Windows user folder. Set `SDM_DOWNLOAD_DIR` to change that location, or `SDM_DATA_DIR` to change where download history is stored.

The optional Gemini video-summary feature reads `GEMINI_API_KEY` from `.env.local`. The app runs without it.

## Optional media extraction

Platform-page extraction uses the external `yt-dlp` program. Install Python 3 and then run:

```powershell
python -m pip install -U yt-dlp
```

Restart SDM after installation. You can override the executable with `SDM_YTDLP_PATH`. Merging separate video and audio streams may also require `ffmpeg` on `PATH`. Extraction is supported for common YouTube, Vimeo, TikTok, Instagram, Facebook, and Twitch URLs; availability still depends on the site and its access rules. The downloader does not bypass logins, DRM, or other access controls.

## Optional Chromium extension

In Chrome or Edge, open the Extensions page, enable **Developer mode**, select **Load unpacked**, and choose `public\browser-extension`. Open the extension's options page, save the local service URL (`http://127.0.0.1:3001` by default), and enable link sending. Use the right-click menu on a link or the toolbar button to enqueue it.

Automatic browser-download capture is a separate, disabled-by-default opt-in setting. When enabled, the extension first submits the URL to the local service and then cancels the browser's copy. It cannot transfer browser cookies or custom request headers; authenticated downloads may fail. This capture is experimental and does not provide a universal interception guarantee.

## Download capabilities and limitations

- Direct HTTP/HTTPS file downloads are streamed to disk, avoiding the browser-memory buffering used by the earlier prototype.
- The downloader probes for byte-range support and, when available, splits the file into parallel connections (1–16; configure in Options). Parallel connections can improve throughput on some hosts, but cannot exceed source-server or network limits and may be slower if a host throttles them.
- Pause/resume state and partial files are stored locally. Resume across app restarts works when the server supports byte ranges. If it does not, resuming restarts that file from the beginning.
- Removing a completed entry from the app's list leaves the finished file in your download folder.
- Direct HTTP/HTTPS files and supported media-platform URLs use different download paths; platform extraction requires the optional `yt-dlp` install above.
- The local service listens on loopback only. Browser integration is optional and only has the permissions described above.

This is a local download manager, not a claim of being faster or more capable than IDM in every situation.
