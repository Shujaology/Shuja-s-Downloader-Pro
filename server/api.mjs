import { createServer } from 'node:http';
import { mkdir, open, readFile, readdir, rename, stat, writeFile, rm } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { StringDecoder } from 'node:string_decoder';
import { spawn } from 'node:child_process';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PORT || 3000);
const apiPort = Number(process.env.SDM_API_PORT || 3001);
const downloadsDir = resolve(process.env.SDM_DOWNLOAD_DIR || join(homedir(), 'Downloads', 'ShujaDownloader'));
const metadataDir = resolve(process.env.SDM_DATA_DIR || join(process.env.APPDATA || homedir(), '.shuja-downloader'));
const metadataFile = join(metadataDir, 'downloads.json');
const maxConnections = 16;
const mediaPlatformHosts = [
  'youtube.com', 'youtu.be', 'vimeo.com', 'tiktok.com',
  'instagram.com', 'facebook.com', 'twitch.tv',
];
const isSupportedMediaUrl = url => {
  const hostname = url.hostname.toLowerCase();
  return mediaPlatformHosts.some(host => hostname === host || hostname.endsWith(`.${host}`));
};
const items = new Map();
const activeRuns = new Map();
const activeExtractors = new Map();
const mediaMetadata = new Map();
let saveQueue = Promise.resolve();

const cleanFilename = value => {
  const cleaned = basename(String(value || 'download.bin'))
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/[. ]+$/g, '')
    .slice(0, 180);
  return cleaned || 'download.bin';
};

const uniqueDestination = async filename => {
  const extension = extname(filename);
  const stem = filename.slice(0, filename.length - extension.length);
  let candidateName = filename;
  let suffix = 1;
  while (true) {
    const candidate = join(downloadsDir, candidateName);
    if (await stat(candidate).catch(() => null)) {
      candidateName = `${stem} (${suffix++})${extension}`;
      continue;
    }
    try {
      const reserved = await open(`${candidate}.part`, 'wx');
      await reserved.close();
      return candidate;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      candidateName = `${stem} (${suffix++})${extension}`;
    }
  }
};

const filenameFromHeaders = headers => {
  const disposition = headers.get('content-disposition') || '';
  const extended = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const regular = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  if (extended) {
    try {
      return decodeURIComponent(extended);
    } catch {
      return regular;
    }
  }
  return regular;
};

const waitForThrottle = (delayMs, signal) => new Promise((resolve, reject) => {
  const onAbort = () => {
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
    reject(new DOMException('Download paused.', 'AbortError'));
  };
  const timer = setTimeout(() => {
    signal.removeEventListener('abort', onAbort);
    resolve();
  }, delayMs);
  signal.addEventListener('abort', onAbort, { once: true });
  if (signal.aborted) onAbort();
});

const serialize = item => ({
  id: item.id,
  title: item.title,
  url: item.url,
  category: item.category,
  queue: item.queue,
  progress: item.progress,
  totalBytes: item.totalBytes,
  downloadedBytes: item.downloadedBytes,
  speed: item.speed,
  speedBps: item.speedBps,
  timeLeft: item.timeLeft,
  status: item.status,
  dateAdded: item.dateAdded,
  savePath: item.savePath,
  connections: item.connections,
  segments: item.segments,
  resumeSupported: item.resumeSupported,
  errorMessage: item.errorMessage,
  mediaExtractor: Boolean(item.mediaExtractor),
  mediaFormatId: item.mediaFormatId,
  fileBlobUrl: item.status === 'completed' ? `/api/downloads/${item.id}/file` : undefined,
});

const ytDlpCommand = process.env.SDM_YTDLP_PATH || 'yt-dlp';

const runYtDlp = (args, { signal, timeoutMs = 120000, maxOutput = 12 * 1024 * 1024, onStderr } = {}) =>
  new Promise((resolve, reject) => {
    let child;
    const defaultFlags = ['--js-runtimes', 'node', '--remote-components', 'ejs:github'];
    const mergedArgs = [...defaultFlags.filter(f => !args.includes(f)), ...args];
    try {
      child = spawn(ytDlpCommand, mergedArgs, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      reject(new Error(`Could not start yt-dlp (${ytDlpCommand}): ${error.message}`));
      return;
    }
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;
    let timeout;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
      if (error) reject(error);
      else resolve(result);
    };
    const onAbort = () => child.kill('SIGINT');
    timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) onAbort();
    child.stdout.setEncoding('utf8').on('data', chunk => {
      stdout = (stdout + chunk).slice(-maxOutput);
    });
    child.stderr.setEncoding('utf8').on('data', chunk => {
      stderr = (stderr + chunk).slice(-16000);
      try {
        onStderr?.(chunk);
      } catch (error) {
        child.kill();
        finish(error);
      }
    });
    child.once('error', error => {
      const message = error.code === 'ENOENT'
        ? 'yt-dlp is not installed. Install it with `python -m pip install -U yt-dlp`, then restart SDM.'
        : `Could not start yt-dlp: ${error.message}`;
      finish(new Error(message));
    });
    child.once('close', code => {
      if (signal?.aborted) {
        finish(new DOMException('Extraction paused.', 'AbortError'));
      } else if (timedOut) {
        finish(new Error('yt-dlp took too long to respond.'));
      } else if (code !== 0) {
        finish(new Error(stderr.trim() || `yt-dlp exited with code ${code}.`));
      } else {
        finish(null, { stdout, stderr });
      }
    });
  });

const inspectMedia = async url => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Enter a valid video URL.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only HTTP and HTTPS media URLs are supported.');
  const { stdout } = await runYtDlp([
    '--dump-single-json', '--no-warnings', '--no-playlist', '--skip-download', parsed.href,
  ]);
  let info;
  try {
    info = JSON.parse(stdout);
  } catch {
    throw new Error('yt-dlp returned invalid media information.');
  }
  const formats = (info.formats || [])
    .filter(format => format.format_id && !format.has_drm && format.protocol !== 'mhtml')
    .map(format => ({
      formatId: String(format.format_id),
      extension: format.ext || 'media',
      resolution: format.resolution || (format.height ? `${format.height}p` : format.acodec !== 'none' ? 'Audio' : 'Unknown quality'),
      size: Number(format.filesize || format.filesize_approx || 0),
      note: [format.format_note, format.vcodec !== 'none' ? format.vcodec : '', format.acodec !== 'none' ? format.acodec : ''].filter(Boolean).join(' · '),
    }));
  const uniqueFormats = [...new Map(formats.map(format => [format.formatId, format])).values()].slice(0, 100);
  if (!uniqueFormats.length) throw new Error('No downloadable formats were found for this URL.');
  return {
    title: cleanFilename(info.title || 'media-download'),
    thumbnailUrl: info.thumbnail,
    duration: Number(info.duration || 0),
    formats: uniqueFormats,
  };
};

const runMediaDownload = async item => {
  const controller = new AbortController();
  activeExtractors.set(item.id, controller);
  item.status = 'downloading';
  item.errorMessage = undefined;
  item.timeLeft = 'Extracting media...';
  item.speedSampleAt = Date.now();
  item.speedSampleBytes = 0;
  await persist();
  const outputTemplate = join(downloadsDir, `.sdm-${item.id}.%(ext)s`);
  let progressBuffer = '';
  try {
    const { stdout } = await runYtDlp([
      '--no-warnings', '--no-playlist', '--newline', '--continue',
      '--progress-template', 'download:SDM_PROGRESS:%(progress.downloaded_bytes)s:%(progress.total_bytes_estimate)s:%(progress.speed)s:%(progress.eta)s',
      '--format', item.mediaFormatId || 'best',
      '--output', outputTemplate,
      '--print', 'after_move:SDM_FILE:%(filepath)s',
      item.url,
    ], {
      signal: controller.signal,
      timeoutMs: 24 * 60 * 60 * 1000,
      maxOutput: 2 * 1024 * 1024,
      onStderr: chunk => {
        const lines = (progressBuffer + chunk).split(/[\r\n]+/);
        progressBuffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('SDM_PROGRESS:')) continue;
          const [, downloaded, total, speed, eta] = line.split(':');
          const downloadedBytes = Number(downloaded) || 0;
          const totalBytes = Number(total) || item.totalBytes || 0;
          item.downloadedBytes = downloadedBytes;
          if (totalBytes) item.totalBytes = totalBytes;
          item.progress = totalBytes ? Math.min(99.9, Number(((downloadedBytes / totalBytes) * 100).toFixed(1))) : 0;
          item.speedBps = Number(speed) || 0;
          item.speed = item.speedBps ? `${(item.speedBps / 1048576).toFixed(2)} MB/s` : 'Receiving...';
          item.timeLeft = Number.isFinite(Number(eta)) ? `${Number(eta)} sec` : 'Calculating...';
          item.segments = [{
            id: 1, startByte: 0, endByte: Math.max(0, item.totalBytes - 1),
            downloadedBytes, progress: item.progress, currentSpeed: item.speed, status: 'active',
          }];
        }
      },
    });

    for (const line of stdout.split(/\r?\n/)) {
      if (!line.startsWith('SDM_FILE:')) continue;
      const actualPath = resolve(line.slice('SDM_FILE:'.length).trim());
      if (!actualPath.startsWith(`${downloadsDir}\\`) && !actualPath.startsWith(`${downloadsDir}/`)) {
        throw new Error('yt-dlp produced a file outside the configured download folder.');
      }
      const extension = extname(actualPath);
      const desired = await uniqueDestination(extname(item.title) ? item.title : `${item.title}${extension}`);
      await rename(actualPath, desired);
      await rm(`${desired}.part`, { force: true });
      item.savePath = desired;
      item.title = basename(desired);
    }
    if (!item.savePath || item.savePath.includes('.sdm-')) {
      const files = await readdir(downloadsDir);
      const found = files.find(file => file.startsWith(`.sdm-${item.id}.`) && !file.endsWith('.part'));
      if (!found) throw new Error('yt-dlp finished without producing a media file.');
      const source = join(downloadsDir, found);
      const desired = await uniqueDestination(extname(item.title) ? item.title : `${item.title}${extname(found)}`);
      await rename(source, desired);
      await rm(`${desired}.part`, { force: true });
      item.savePath = desired;
      item.title = basename(desired);
    }
    const fileInfo = await stat(item.savePath);
    item.totalBytes = fileInfo.size;
    item.downloadedBytes = fileInfo.size;
    item.progress = 100;
    item.speed = 'Complete';
    item.speedBps = 0;
    item.timeLeft = 'Finished';
    item.status = 'completed';
    item.segments = [{
      id: 1, startByte: 0, endByte: Math.max(0, fileInfo.size - 1),
      downloadedBytes: fileInfo.size, progress: 100, currentSpeed: 'Done', status: 'done',
    }];
  } catch (error) {
    if (controller.signal.aborted || error?.name === 'AbortError') {
      item.status = 'paused';
      item.speed = 'Paused';
      item.speedBps = 0;
      item.timeLeft = 'Paused';
    } else {
      item.status = 'error';
      item.speed = 'Download failed';
      item.speedBps = 0;
      item.timeLeft = 'Failed';
      item.errorMessage = error instanceof Error ? error.message : 'Media extraction failed.';
    }
  } finally {
    activeExtractors.delete(item.id);
    await persist();
  }
};

const startMediaItem = async body => {
  let parsed;
  try {
    parsed = new URL(body.url);
  } catch {
    throw new Error('Enter a valid media URL.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only HTTP and HTTPS media URLs are supported.');
  const metadata = mediaMetadata.get(parsed.href) || await inspectMedia(parsed.href);
  const selectedFormatId = String(body.mediaFormatId || '');
  const format = selectedFormatId
    ? metadata.formats.find(candidate => candidate.formatId === selectedFormatId)
    : undefined;
  if (selectedFormatId && !format) {
    throw new Error('The selected media format is no longer available. Inspect the URL again and choose another format.');
  }
  const id = String(body.id || randomUUID());
  if (items.has(id)) throw new Error('A download with this ID already exists.');
  const requestedTitle = String(body.title || '');
  const title = cleanFilename(!requestedTitle || requestedTitle === 'media-download'
    ? metadata.title
    : requestedTitle);
  const item = {
    id, title, url: parsed.href, category: body.category || 'video', queue: 'main',
    progress: 0, totalBytes: format?.size || 0, downloadedBytes: 0, speed: 'Connecting...',
    speedBps: 0, timeLeft: 'Calculating...', status: 'paused',
    dateAdded: new Date().toISOString().replace('T', ' ').slice(0, 16),
    savePath: join(downloadsDir, `.sdm-${id}.%(ext)s`),
    connections: 1, segments: createSegments(format?.size || 0, 1),
    resumeSupported: true, rangeSupported: false, mediaExtractor: true,
    mediaFormatId: format?.formatId || 'bestvideo+bestaudio/best',
    errorMessage: undefined,
  };
  await mkdir(downloadsDir, { recursive: true });
  items.set(id, item);
  await persist();
  void runMediaDownload(item);
  return item;
};

const persist = () => {
  const snapshot = JSON.stringify([...items.values()].map(item => ({
    ...item,
    speed: item.status === 'downloading' ? 'Paused' : item.speed,
    speedBps: 0,
    status: item.status === 'downloading' ? 'paused' : item.status,
    timeLeft: item.status === 'downloading' ? 'Paused' : item.timeLeft,
  })));
  saveQueue = saveQueue
    .then(async () => {
      await mkdir(metadataDir, { recursive: true });
      const temporaryFile = `${metadataFile}.tmp`;
      await writeFile(temporaryFile, snapshot);
      await rename(temporaryFile, metadataFile);
    })
    .catch(error => console.error('Could not persist download metadata:', error));
  return saveQueue;
};

const restore = async () => {
  await mkdir(downloadsDir, { recursive: true });
  await mkdir(metadataDir, { recursive: true });
  try {
    const saved = JSON.parse(await readFile(metadataFile, 'utf8'));
    for (const item of saved) {
      if (!item || typeof item.id !== 'string' || typeof item.url !== 'string') continue;
      const fileName = cleanFilename(basename(item.savePath || item.title));
      if (item.mediaExtractor) {
        item.title = cleanFilename(item.title);
        item.savePath = join(downloadsDir, `.sdm-${item.id}.%(ext)s`);
        const partials = (await readdir(downloadsDir)).filter(file => file.startsWith(`.sdm-${item.id}.`));
        item.downloadedBytes = 0;
        for (const partial of partials) {
          const partialInfo = await stat(join(downloadsDir, partial));
          item.downloadedBytes += partialInfo.size;
        }
      } else {
        item.title = fileName;
        item.savePath = join(downloadsDir, fileName);
      }
      item.status = item.status === 'completed' ? 'completed' : item.status === 'error' ? 'error' : 'paused';
      item.speed = item.status === 'completed' ? 'Complete' : item.status === 'error' ? 'Download failed' : 'Paused';
      item.speedBps = 0;
      item.timeLeft = item.status === 'completed' ? 'Finished' : item.status === 'error' ? 'Failed' : 'Paused';
      item.errorMessage = item.status === 'error' ? item.errorMessage : undefined;
      item.resumeSupported = Boolean(item.resumeSupported);
      item.connections = Math.max(1, Math.min(maxConnections, Number(item.connections) || 1));
      try {
        const completedInfo = await stat(item.savePath).catch(() => null);
        if (completedInfo && (!item.totalBytes || completedInfo.size === item.totalBytes)) {
          item.totalBytes = completedInfo.size;
          item.downloadedBytes = completedInfo.size;
          item.progress = 100;
          item.status = 'completed';
          item.speed = 'Complete';
          item.timeLeft = 'Finished';
          item.segments = (item.segments || []).map(segment => ({
            ...segment,
            downloadedBytes: segment.endByte - segment.startByte + 1,
            progress: 100,
            currentSpeed: 'Done',
            status: 'done',
          }));
          items.set(item.id, item);
          continue;
        }
        const fileInfo = await stat(`${item.savePath}.part`);
        const rangedBytes = item.rangeSupported && item.segments?.length
          ? item.segments.reduce((sum, segment) => sum + segment.downloadedBytes, 0)
          : 0;
        const isCompleteFile = item.totalBytes > 0 && fileInfo.size >= item.totalBytes &&
          (item.rangeSupported ? rangedBytes >= item.totalBytes : fileInfo.size >= item.totalBytes);
        if (isCompleteFile) {
          await rename(`${item.savePath}.part`, item.savePath);
          item.status = 'completed';
          item.downloadedBytes = item.totalBytes;
          item.progress = 100;
          item.speed = 'Complete';
          item.timeLeft = 'Finished';
        } else if (item.rangeSupported && item.segments?.length) {
          item.downloadedBytes = rangedBytes;
          item.progress = item.totalBytes > 0
            ? Math.min(99.9, Number(((item.downloadedBytes / item.totalBytes) * 100).toFixed(1)))
            : 0;
        } else if (!item.rangeSupported && fileInfo.size > 0) {
          item.downloadedBytes = fileInfo.size;
        }
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      items.set(item.id, item);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await persist();
};

const updateProgress = item => {
  const now = Date.now();
  const elapsed = (now - item.speedSampleAt) / 1000;
  if (elapsed >= 0.5) {
    item.speedBps = Math.round((item.downloadedBytes - item.speedSampleBytes) / elapsed);
    item.speed = `${(item.speedBps / 1048576).toFixed(2)} MB/s`;
    item.speedSampleAt = now;
    item.speedSampleBytes = item.downloadedBytes;
    const remaining = Math.max(0, item.totalBytes - item.downloadedBytes);
    item.timeLeft = item.speedBps > 0 ? `${Math.floor(remaining / item.speedBps)} sec` : 'Calculating...';
  }
  item.progress = item.totalBytes > 0
    ? Math.min(99.9, Number(((item.downloadedBytes / item.totalBytes) * 100).toFixed(1)))
    : 0;
  item.segments = item.segments.map(segment => ({
    ...segment,
    currentSpeed: item.speed,
  }));
};

const probe = async url => {
  const response = await fetch(url, { headers: { Range: 'bytes=0-0' }, redirect: 'follow' });
  if (!response.ok && response.status !== 206) {
    await response.body?.cancel();
    throw new Error(`The source returned HTTP ${response.status} ${response.statusText}.`);
  }
  const range = response.headers.get('content-range')?.match(/^bytes 0-0\/(\d+)$/i);
  const acceptsRanges = response.status === 206 && Boolean(range);
  const length = acceptsRanges ? Number(range[1]) : Number(response.headers.get('content-length')) || 0;
  const fileName = filenameFromHeaders(response.headers);
  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  await response.body?.cancel();
  return { acceptsRanges, length, fileName, contentType };
};

const createSegments = (length, count) => {
  if (!length) return [{ id: 1, startByte: 0, endByte: 0, downloadedBytes: 0, progress: 0, currentSpeed: 'Connecting...', status: 'active' }];
  const total = Math.max(1, Math.min(count, length));
  const chunk = Math.ceil(length / total);
  return Array.from({ length: total }, (_, index) => {
    const startByte = index * chunk;
    const endByte = Math.min(length - 1, startByte + chunk - 1);
    return { id: index + 1, startByte, endByte, downloadedBytes: 0, progress: 0, currentSpeed: 'Connecting...', status: 'active' };
  });
};

const writeSegment = async (item, segment, signal) => {
  const start = segment.startByte + segment.downloadedBytes;
  const headers = item.rangeSupported
    ? { Range: `bytes=${start}-${segment.endByte}` }
    : {};
  const response = await fetch(item.url, { headers, signal, redirect: 'follow' });
  if (!response.ok) throw new Error(`The source returned HTTP ${response.status} ${response.statusText}.`);
  if (item.rangeSupported) {
    const contentRange = response.headers.get('content-range')?.match(/^bytes (\d+)-(\d+)\/(\d+)$/i);
    if (response.status !== 206 || !contentRange || Number(contentRange[1]) !== start ||
        Number(contentRange[2]) > segment.endByte || Number(contentRange[3]) !== item.totalBytes) {
      throw new Error('The server stopped honoring byte-range requests. The download was paused to protect file integrity.');
    }
  }
  if (!response.body) throw new Error('The source response has no readable body.');

  const output = createWriteStream(`${item.savePath}.part`, { flags: 'r+', start });
  try {
    for await (const chunk of Readable.fromWeb(response.body)) {
      if (signal.aborted) throw new DOMException('Download paused.', 'AbortError');
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      if (!output.write(buffer)) await once(output, 'drain');
      segment.downloadedBytes += buffer.length;
      item.downloadedBytes += buffer.length;
      segment.progress = Math.min(100, Math.floor((segment.downloadedBytes / (segment.endByte - segment.startByte + 1)) * 100));
      updateProgress(item);
      if (item.speedLimiterEnabled && item.speedLimitKbps > 0) {
        item.throttleNextAvailable = Math.max(item.throttleNextAvailable, Date.now()) +
          (buffer.length / (item.speedLimitKbps * 1024)) * 1000;
        const delayMs = item.throttleNextAvailable - Date.now();
        if (delayMs > 0) await waitForThrottle(delayMs, signal);
      }
      if (Date.now() - item.lastPersistAt >= 1000) {
        item.lastPersistAt = Date.now();
        void persist();
      }
    }
    output.end();
    await once(output, 'finish');
    if (item.rangeSupported && segment.downloadedBytes !== segment.endByte - segment.startByte + 1) {
      throw new Error(`Connection ${segment.id} ended before all requested bytes arrived.`);
    }
    segment.status = 'done';
    segment.progress = 100;
    segment.currentSpeed = 'Done';
  } catch (error) {
    const closed = once(output, 'close').catch(() => undefined);
    output.destroy();
    await closed;
    throw error;
  }
};

const runDownload = async item => {
  const controllers = item.segments.map(() => new AbortController());
  activeRuns.set(item.id, controllers);
  item.status = 'downloading';
  item.errorMessage = undefined;
  item.speedSampleAt = Date.now();
  item.speedSampleBytes = item.downloadedBytes;
  item.throttleNextAvailable = Date.now();
  item.lastPersistAt = Date.now();
  await persist();
  try {
    let failure;
    await Promise.all(item.segments.map(async (segment, index) => {
      const segmentLength = segment.endByte - segment.startByte + 1;
      if (item.rangeSupported && segment.downloadedBytes >= segmentLength) {
        segment.status = 'done';
        segment.progress = 100;
        segment.currentSpeed = 'Done';
        return;
      }
      try {
        await writeSegment(item, segment, controllers[index].signal);
      } catch (error) {
        if (!controllers[index].signal.aborted) {
          failure ||= error;
          controllers.forEach(controller => controller.abort());
        }
      }
    }));
    if (failure) throw failure;
    if (controllers.some(controller => controller.signal.aborted)) {
      item.status = 'paused';
      item.speed = 'Paused';
      item.speedBps = 0;
      item.timeLeft = 'Paused';
      item.segments.forEach(segment => {
        if (segment.status !== 'done') segment.status = 'idle';
      });
      return;
    }
    if (item.totalBytes === 0) {
      item.totalBytes = item.downloadedBytes;
      item.segments[0].startByte = 0;
      item.segments[0].endByte = Math.max(0, item.totalBytes - 1);
    }
    if (item.downloadedBytes !== item.totalBytes) {
      throw new Error(`Received ${item.downloadedBytes} of ${item.totalBytes} bytes; refusing to mark an incomplete file as complete.`);
    }
    await rename(`${item.savePath}.part`, item.savePath);
    item.progress = 100;
    item.status = 'completed';
    item.speed = 'Complete';
    item.speedBps = 0;
    item.timeLeft = 'Finished';
    item.segments.forEach(segment => {
      segment.status = 'done';
      segment.progress = 100;
      segment.currentSpeed = 'Done';
    });
  } catch (error) {
    if (controllers.some(controller => controller.signal.aborted) && !error) {
      item.status = 'paused';
      item.speed = 'Paused';
      item.speedBps = 0;
      item.timeLeft = 'Paused';
      item.segments.forEach(segment => {
        if (segment.status !== 'done') segment.status = 'idle';
      });
    } else if (controllers.some(controller => controller.signal.aborted) && error?.name === 'AbortError') {
      item.status = 'paused';
      item.speed = 'Paused';
      item.speedBps = 0;
      item.timeLeft = 'Paused';
      item.segments.forEach(segment => {
        if (segment.status !== 'done') segment.status = 'idle';
      });
    } else {
      item.status = 'error';
      item.speed = 'Download failed';
      item.speedBps = 0;
      item.timeLeft = 'Failed';
      item.errorMessage = error instanceof Error ? error.message : 'The download failed for an unknown reason.';
    }
  } finally {
    activeRuns.delete(item.id);
    await persist();
  }
};

// --- Site grabber -----------------------------------------------------------
const GRAB_LIMITS = {
  maxPages: 40,
  maxQueued: 120,
  maxFiles: 300,
  maxDepth: 3,
  pageTimeoutMs: 10000,
  totalTimeoutMs: 60000,
  maxHtmlBytes: 2 * 1024 * 1024,
};

const grabExtensionKinds = {
  video: ['mp4', 'm4v', 'mkv', 'webm', 'avi', 'mov', 'flv', 'wmv', 'mpg', 'mpeg', 'm2ts', 'ts', '3gp', 'ogv'],
  audio: ['mp3', 'm4a', 'aac', 'opus', 'ogg', 'oga', 'wav', 'flac', 'wma', 'aiff'],
  document: ['pdf', 'epub', 'mobi', 'azw3', 'djvu', 'txt', 'doc', 'docx', 'rtf', 'csv', 'xls', 'xlsx', 'ppt', 'pptx'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso'],
  program: ['exe', 'msi', 'apk', 'deb', 'rpm', 'dmg', 'pkg', 'appimage'],
};

const grabKindByExtension = new Map(
  Object.entries(grabExtensionKinds).flatMap(([kind, list]) => list.map(extension => [extension, kind]))
);

const grabTypeKinds = {
  video: ['video'],
  audio: ['audio'],
  documents: ['document', 'archive'],
  all: ['video', 'audio', 'document', 'archive', 'program'],
};

const GRAB_ATTRIBUTE = /\b(?:href|src|data-src|data-url|data-href|data-file|poster|data-video|data-mp4|data-webm|srcset)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`]+))/gi;
const GRAB_EMBEDDED = /https?:\\?\/\\?\/[^\s"'`<>\\]{6,400}?\.(?:mp4|m4v|webm|mkv|mov|avi|flv|mp3|m4a|aac|opus|ogg|oga|wav|flac)(?:\?[^\s"'`<>\\]*)?/gi;

const grabExtensionOf = rawUrl => {
  try {
    const match = decodeURIComponent(new URL(rawUrl).pathname).toLowerCase().match(/\.([a-z0-9]{2,5})$/);
    return match ? match[1] : '';
  } catch {
    return '';
  }
};

const grabKindOf = rawUrl => grabKindByExtension.get(grabExtensionOf(rawUrl)) || '';

const grabNameOf = rawUrl => {
  try {
    const last = decodeURIComponent(new URL(rawUrl).pathname.split('/').filter(Boolean).pop() || '');
    return cleanFilename(last || 'file');
  } catch {
    return 'file';
  }
};

const readLimitedText = async response => {
  const reader = response.body?.getReader();
  if (!reader) return (await response.text()).slice(0, GRAB_LIMITS.maxHtmlBytes);
  const decoder = new StringDecoder('utf8');
  let text = '';
  try {
    while (text.length < GRAB_LIMITS.maxHtmlBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.write(Buffer.from(value));
    }
    text += decoder.end();
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return text;
};

const extractGrabTargets = (html, pageUrl) => {
  const pages = [];
  const files = [];
  const push = raw => {
    const trimmed = String(raw || '').trim();
    if (!trimmed || trimmed.length > 1000) return;
    if (trimmed.startsWith('#') || /^(?:javascript|mailto|tel|data|blob|about):/i.test(trimmed)) return;
    let resolved;
    try {
      resolved = new URL(trimmed.replace(/&amp;/g, '&'), pageUrl);
    } catch {
      return;
    }
    if (!['http:', 'https:'].includes(resolved.protocol)) return;
    resolved.hash = '';
    if (grabKindOf(resolved.href)) files.push(resolved.href);
    else pages.push(resolved.href);
  };
  for (const match of html.matchAll(GRAB_ATTRIBUTE)) {
    const value = match[1] ?? match[2] ?? match[3] ?? '';
    value.split(',').forEach(entry => push(entry.trim().split(/\s+/)[0]));
  }
  for (const match of html.matchAll(GRAB_EMBEDDED)) push(match[0].replace(/\\\//g, '/'));
  return { pages, files };
};

const crawlSite = async ({ url, depth, type }) => {
  let startUrl;
  try {
    startUrl = new URL(String(url || '').trim());
  } catch {
    throw new Error('Enter a valid start page address.');
  }
  if (!['http:', 'https:'].includes(startUrl.protocol)) {
    throw new Error('Only HTTP and HTTPS start pages are supported.');
  }
  const maxDepth = Math.max(1, Math.min(GRAB_LIMITS.maxDepth, Number(depth) || 1));
  const allowedKinds = new Set(grabTypeKinds[type] || grabTypeKinds.all);
  const host = startUrl.hostname.toLowerCase();
  const deadline = Date.now() + GRAB_LIMITS.totalTimeoutMs;
  const visited = new Set([startUrl.href]);
  const queue = [{ url: startUrl.href, depth: 0 }];
  const files = new Map();
  const warnings = [];
  let pagesVisited = 0;
  let truncated = false;

  while (queue.length) {
    if (Date.now() >= deadline) {
      truncated = true;
      break;
    }
    const { url: pageUrl, depth: level } = queue.shift();
    if (level >= maxDepth) continue;
    if (pagesVisited >= GRAB_LIMITS.maxPages) {
      truncated = true;
      break;
    }

    let html;
    try {
      const response = await fetch(pageUrl, {
        redirect: 'follow',
        headers: { Accept: 'text/html,application/xhtml+xml' },
        signal: AbortSignal.timeout(Math.max(1000, Math.min(GRAB_LIMITS.pageTimeoutMs, deadline - Date.now()))),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (contentType && !/(?:text\/html|application\/xhtml|text\/plain)/.test(contentType)) continue;
      html = await readLimitedText(response);
      pagesVisited += 1;
    } catch (error) {
      warnings.push(`${pageUrl} - ${error instanceof Error ? error.message : 'could not be read'}`);
      continue;
    }

    const { pages, files: found } = extractGrabTargets(html, pageUrl);

    for (const fileUrl of found) {
      if (files.size >= GRAB_LIMITS.maxFiles) {
        truncated = true;
        break;
      }
      if (files.has(fileUrl)) continue;
      const kind = grabKindOf(fileUrl);
      if (!allowedKinds.has(kind)) continue;
      files.set(fileUrl, {
        url: fileUrl,
        name: grabNameOf(fileUrl),
        extension: grabExtensionOf(fileUrl),
        kind,
        depth: level + 1,
        fromPage: pageUrl,
      });
    }

    for (const nextUrl of pages) {
      if (queue.length >= GRAB_LIMITS.maxQueued) {
        truncated = true;
        break;
      }
      let hostname;
      try {
        hostname = new URL(nextUrl).hostname.toLowerCase();
      } catch {
        continue;
      }
      if (hostname !== host && !hostname.endsWith(`.${host}`)) continue;
      if (visited.has(nextUrl)) continue;
      visited.add(nextUrl);
      queue.push({ url: nextUrl, depth: level + 1 });
    }
  }

  const shownWarnings = warnings.slice(0, 12);
  if (warnings.length > shownWarnings.length) {
    shownWarnings.push(`...and ${warnings.length - shownWarnings.length} more pages could not be read`);
  }

  return {
    startUrl: startUrl.href,
    pagesVisited,
    filesFound: files.size,
    truncated,
    warnings: shownWarnings,
    files: [...files.values()],
  };
};

const json = (response, status, data) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(data));
};

const parseBody = async request => {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 65536) throw new Error('Request body is too large.');
  }
  return body ? JSON.parse(body) : {};
};

const handleApi = async (request, response, pathname) => {
  if (request.method === 'GET' && pathname === '/api/downloads') {
    return json(response, 200, [...items.values()].map(serialize));
  }

  if (request.method === 'POST' && pathname === '/api/media/inspect') {
    const body = await parseBody(request);
    const metadata = await inspectMedia(body.url);
    mediaMetadata.set(new URL(body.url).href, metadata);
    return json(response, 200, metadata);
  }

  if (request.method === 'POST' && pathname === '/api/grab') {
    const body = await parseBody(request);
    return json(response, 200, await crawlSite(body));
  }

  if (request.method === 'POST' && pathname === '/api/downloads') {
    const body = await parseBody(request);
    let url;
    try {
      url = new URL(body.url);
    } catch {
      throw new Error('Enter a valid HTTP or HTTPS download URL.');
    }
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS URLs are supported.');
    if (body.mediaExtractor || isSupportedMediaUrl(url)) {
      const item = await startMediaItem({ ...body, url: url.href });
      return json(response, 201, serialize(item));
    }
    const connectionCount = Math.max(1, Math.min(maxConnections, Number(body.connections) || 8));
    const id = String(body.id || randomUUID());
    if (items.has(id)) throw new Error('A download with this ID already exists.');
    const source = await probe(url.href);
    const title = cleanFilename(body.title || source.fileName || decodeURIComponent(basename(url.pathname)) || 'download.bin');
    const destination = await uniqueDestination(title);
    const segments = createSegments(source.acceptsRanges ? source.length : 0, source.acceptsRanges ? connectionCount : 1);
    if (!source.acceptsRanges) {
      segments[0].startByte = 0;
      segments[0].endByte = Math.max(0, source.length - 1);
    }
    const item = {
      id, title, url: url.href, category: body.category || 'programs', queue: 'main',
      progress: 0, totalBytes: source.length, downloadedBytes: 0, speed: 'Connecting...',
      speedBps: 0, timeLeft: 'Calculating...', status: 'paused',
      dateAdded: new Date().toISOString().replace('T', ' ').slice(0, 16),
      savePath: destination, connections: segments.length, segments,
      resumeSupported: source.acceptsRanges, rangeSupported: source.acceptsRanges,
      speedLimiterEnabled: Boolean(body.speedLimiterEnabled),
      speedLimitKbps: Math.max(1, Number(body.speedLimitKbps) || 1),
      errorMessage: undefined, speedSampleAt: Date.now(), speedSampleBytes: 0,
    };
    if (!source.acceptsRanges) item.totalBytes = source.length;
    await mkdir(downloadsDir, { recursive: true });
    const file = await open(`${destination}.part`, 'r+');
    if (source.acceptsRanges) await file.truncate(source.length);
    await file.close();
    items.set(item.id, item);
    await persist();
    void runDownload(item);
    return json(response, 201, serialize(item));
  }

  const match = pathname.match(/^\/api\/downloads\/([^/]+)(?:\/(pause|resume|file))?$/);
  if (!match) return json(response, 404, { error: 'API route not found.' });
  const item = items.get(decodeURIComponent(match[1]));
  if (!item) return json(response, 404, { error: 'Download not found.' });
  const action = match[2];

  if (request.method === 'GET' && !action) {
    return json(response, 200, serialize(item));
  }

  if (request.method === 'POST' && action === 'pause') {
    if (item.mediaExtractor) {
      activeExtractors.get(item.id)?.abort();
      while (activeExtractors.has(item.id)) await new Promise(resolve => setTimeout(resolve, 25));
      return json(response, 200, serialize(item));
    }
    activeRuns.get(item.id)?.forEach(controller => controller.abort());
    while (activeRuns.has(item.id)) await new Promise(resolve => setTimeout(resolve, 25));
    return json(response, 200, serialize(item));
  }

  if (request.method === 'POST' && action === 'resume') {
    if (item.status === 'completed') return json(response, 200, serialize(item));
    if (item.status === 'downloading') return json(response, 200, serialize(item));
    if (item.mediaExtractor) {
      void runMediaDownload(item);
      return json(response, 200, serialize(item));
    }
    const info = await stat(`${item.savePath}.part`).catch(() => null);
    if (!info) throw new Error('Partial download file is missing. Start a new download instead.');
    if (item.rangeSupported && info.size !== item.totalBytes) {
      throw new Error('Partial file size does not match the source. Delete and restart this download.');
    }
    if (!item.rangeSupported && info.size > 0) {
      const file = await open(`${item.savePath}.part`, 'r+');
      await file.truncate(0);
      await file.close();
      item.downloadedBytes = 0;
      item.progress = 0;
      item.segments = createSegments(item.totalBytes, 1);
    }
    item.downloadedBytes = item.segments.reduce((sum, segment) => sum + segment.downloadedBytes, 0);
    void runDownload(item);
    return json(response, 200, serialize(item));
  }

  if (request.method === 'DELETE' && !action) {
    activeExtractors.get(item.id)?.abort();
    activeRuns.get(item.id)?.forEach(controller => controller.abort());
    while (activeRuns.has(item.id) || activeExtractors.has(item.id)) {
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    if (item.mediaExtractor) {
      const prefix = `.sdm-${item.id}.`;
      const temporaryFiles = (await readdir(downloadsDir)).filter(file => file.startsWith(prefix));
      await Promise.all(temporaryFiles.map(file => rm(join(downloadsDir, file), { force: true })));
    } else {
      await rm(`${item.savePath}.part`, { force: true });
    }
    items.delete(item.id);
    await persist();
    return json(response, 200, { ok: true });
  }

  if (request.method === 'GET' && action === 'file' && item.status === 'completed') {
    const fileInfo = await stat(item.savePath);
    response.writeHead(200, {
      'Content-Length': fileInfo.size,
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(item.title)}"`,
    });
    return pipeline(createReadStream(item.savePath), response);
  }
  return json(response, 409, { error: 'Action is not valid for this download.' });
};

import { createReadStream } from 'node:fs';

const createHandler = (serveUi, allowedOrigins) => async (request, response) => {
  const origin = request.headers.origin;
  const extensionOrigin = 'chrome-extension://efcipbcdbpbjfkiednmoabcljcmpepae';
  if (request.method === 'OPTIONS') {
    if (!allowedOrigins.includes(origin) && origin !== extensionOrigin) {
      return json(response, 403, { error: 'Request origin is not allowed.' });
    }
    response.writeHead(204, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    });
    return response.end();
  }
  if (origin && !allowedOrigins.includes(origin) && origin !== extensionOrigin) {
    return json(response, 403, { error: 'Request origin is not allowed.' });
  }
  if (origin === extensionOrigin) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }
  const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      return await handleApi(request, response, url.pathname);
    }
    if (serveUi) {
      const dist = resolve(projectRoot, 'dist');
      const requested = resolve(dist, `.${decodeURIComponent(url.pathname)}`);
      const filePath = requested.startsWith(`${dist}\\`) || requested.startsWith(`${dist}/`)
        ? requested
        : join(dist, 'index.html');
      const path = url.pathname === '/' ? join(dist, 'index.html') : filePath;
      try {
        const content = await readFile(path);
        const type = extname(path) === '.js' ? 'text/javascript' : extname(path) === '.css' ? 'text/css' : extname(path) === '.json' ? 'application/json' : 'text/html';
        response.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
        return response.end(content);
      } catch {
        const content = await readFile(join(dist, 'index.html'));
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return response.end(content);
      }
    }
    return json(response, 404, { error: 'Not found.' });
  } catch (error) {
    console.error('Local download service error:', error);
    return json(response, error instanceof SyntaxError ? 400 : 500, {
      error: error instanceof Error ? error.message : 'An unknown server error occurred.',
    });
  }
};

export const startApiServer = async () => {
  await restore();
  const server = createServer(createHandler(false, [`http://localhost:${port}`, `http://127.0.0.1:${port}`]));
  server.listen(apiPort, '127.0.0.1', () => {
    console.log(`Downloader service listening at http://127.0.0.1:${apiPort}`);
    console.log(`Files are saved to ${downloadsDir}`);
  });
  server.on('error', error => console.error('Downloader service server error:', error));
  return server;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await restore();
  const server = createServer(createHandler(true, [`http://localhost:${port}`, `http://127.0.0.1:${port}`]));
  server.listen(port, '127.0.0.1', () => {
    console.log(`Shuja's Downloader Pro running at http://localhost:${port}`);
    console.log(`Files are saved to ${downloadsDir}`);
  });
  server.on('error', error => {
    console.error('Downloader server error:', error);
    process.exitCode = 1;
  });
}
