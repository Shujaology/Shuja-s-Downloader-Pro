const MENU_ID = 'send-to-shuja-downloader';
const DEFAULT_SERVICE = 'http://127.0.0.1:3001';
const EXTENSION_ID = 'efcipbcdbpbjfkiednmoabcljcmpepae';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Download with Shuja Downloader Pro',
      contexts: ['link', 'video', 'audio'],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const url = info.linkUrl || info.srcUrl;
  if (url) void enqueue(url);
});

chrome.downloads.onCreated.addListener(download => {
  void captureBrowserDownload(download);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'sdm-enqueue' && typeof message.url === 'string') {
    enqueue(message.url).then(sendResponse);
    return true;
  }
  if (message?.type === 'sdm-status') {
    readStatus().then(sendResponse);
    return true;
  }
});

chrome.action.onClicked.addListener(async tab => {
  if (!tab.id) return;
  try {
    const [selection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString().trim() || '',
    });
    const selected = selection?.result || '';
    const url = /^https?:\/\//i.test(selected) ? selected : tab.url;
    if (url) await enqueue(url);
  } catch (error) {
    await setStatus({ error: `Could not read current tab URL: ${error.message}` });
  }
});

async function getSettings() {
  return new Promise(resolve => chrome.storage.local.get({
    enabled: false,
    captureDownloads: false,
    serviceUrl: DEFAULT_SERVICE,
  }, resolve));
}

async function setStatus(status) {
  await chrome.storage.local.set({ lastStatus: status });
  chrome.action.setBadgeText({ text: status.error ? '!' : 'OK' });
  chrome.action.setBadgeBackgroundColor({ color: status.error ? '#b91c1c' : '#15803d' });
  chrome.action.setTitle({ title: status.error || status.message || 'Shuja Downloader Pro' });
}

async function readStatus() {
  const settings = await getSettings();
  return {
    ...settings,
    ...(await chrome.storage.local.get('lastStatus')),
    extensionId: EXTENSION_ID,
  };
}

async function enqueue(rawUrl) {
  const settings = await getSettings();
  if (!settings.enabled) {
    const error = 'Enable download capture in the extension options before sending links.';
    await setStatus({ error });
    return { error };
  }
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    const error = 'Select a valid HTTP or HTTPS URL.';
    await setStatus({ error });
    return { error };
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    const error = 'Only HTTP and HTTPS URLs can be queued.';
    await setStatus({ error });
    return { error };
  }
  try {
    const serviceUrl = new URL(settings.serviceUrl || DEFAULT_SERVICE);
    if (!['127.0.0.1', 'localhost'].includes(serviceUrl.hostname)) {
      throw new Error('For security, the extension only connects to a loopback downloader service.');
    }
    const response = await fetch(`${serviceUrl.origin}/api/downloads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: `extension-${crypto.randomUUID()}`,
        url: url.href,
        title: isSupportedMediaUrl(url) ? '' : safeTitle(url),
        category: isSupportedMediaUrl(url) ? 'video' : 'programs',
        connections: 8,
        mediaExtractor: isSupportedMediaUrl(url),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Service responded with HTTP ${response.status}.`);
    const message = `Added ${result.title} to the local download queue.`;
    await setStatus({ message, title: result.title });
    return { ok: true, message, item: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not connect to the local download service.';
    await setStatus({ error: message });
    return { error: message };
  }
}

async function captureBrowserDownload(download) {
  if (!download.url || download.state === 'complete' || download.state === 'interrupted') return;
  const settings = await getSettings();
  if (!settings.enabled || !settings.captureDownloads) return;
  const result = await enqueue(download.url);
  if (!result.ok) return;
  try {
    await chrome.downloads.cancel(download.id);
    await setStatus({
      message: `Queued ${result.item.title} in Shuja Downloader Pro; canceled the browser copy.`,
      title: result.item.title,
    });
  } catch (error) {
    await setStatus({
      error: `Queued ${result.item.title}, but could not cancel the browser copy. Check for a duplicate download. ${error.message}`,
    });
  }
}

function isSupportedMediaUrl(url) {
  const hostname = url.hostname.toLowerCase();
  return [
    'youtube.com', 'youtu.be', 'vimeo.com', 'tiktok.com',
    'instagram.com', 'facebook.com', 'twitch.tv',
  ].some(host => hostname === host || hostname.endsWith(`.${host}`));
}

function safeTitle(url) {
  try {
    return decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || 'download.bin');
  } catch {
    return 'download.bin';
  }
}
