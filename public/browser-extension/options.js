const serviceInput = document.querySelector('#serviceUrl');
const enabledInput = document.querySelector('#enabled');
const captureDownloadsInput = document.querySelector('#captureDownloads');
const status = document.querySelector('#status');

chrome.storage.local.get({
  serviceUrl: 'http://127.0.0.1:3001',
  enabled: false,
  captureDownloads: false,
}, values => {
  serviceInput.value = values.serviceUrl;
  enabledInput.checked = values.enabled;
  captureDownloadsInput.checked = values.captureDownloads;
});

document.querySelector('#save').addEventListener('click', async () => {
  let service;
  try {
    service = new URL(serviceInput.value);
  } catch {
    status.textContent = 'Enter a valid local service URL.';
    status.style.color = '#b91c1c';
    return;
  }
  if (service.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(service.hostname)) {
    status.textContent = 'For security, the extension only connects to a local HTTP service.';
    status.style.color = '#b91c1c';
    return;
  }
  await chrome.storage.local.set({
    serviceUrl: service.origin,
    enabled: enabledInput.checked,
    captureDownloads: captureDownloadsInput.checked,
  });
  status.textContent = 'Settings saved.';
  status.style.color = '#15803d';
});

document.querySelector('#test').addEventListener('click', async () => {
  try {
    const response = await fetch(`${new URL(serviceInput.value).origin}/api/downloads`);
    if (!response.ok) throw new Error(`Service returned HTTP ${response.status}.`);
    status.textContent = 'Connected to the local downloader.';
    status.style.color = '#15803d';
  } catch (error) {
    status.textContent = error.message || 'Could not connect. Start the SDM local service first.';
    status.style.color = '#b91c1c';
  }
});
