# Shuja's Downloader Pro

A fast, multi-connection download manager that runs entirely in the browser.

- **Parallel ranged downloads**: files are split across up to 32 connections when the server supports HTTP range requests, with automatic fallback to a single stream.
- **Pause and resume, even after a reload**: received bytes are stored in IndexedDB, so interrupted downloads come back paused at the same point.
- **Bandwidth limit** across all downloads, a download queue with configurable concurrency, and a start/stop scheduler.
- **Live connection map** showing each segment's progress and speed, plus real speed and time-left figures.
- Light, dark and system themes, search, sorting, multi-select, drag-and-drop or paste links anywhere, keyboard shortcuts, and desktop notifications.

## Limitations

Downloads use `fetch`, so the remote server must allow cross-origin requests (CORS). Links to servers that don't will be rejected when you add them. Video sites such as YouTube need a server-side extractor and aren't supported.

## Development

Requires Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm test
npm run build      # type-checks, then builds to dist/
```

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `N` | New download |
| `Ctrl` + `K` | Search |
| `Space` | Pause / resume selected |
| `Del` | Remove selected |
| `Ctrl` + `A` | Select all |
| `Ctrl` + `V` | Paste links to download |
| `,` | Settings |
