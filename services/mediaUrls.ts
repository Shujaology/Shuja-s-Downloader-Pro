const MEDIA_HOSTS = [
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'tiktok.com',
  'instagram.com',
  'facebook.com',
  'twitch.tv',
];

export const isSupportedMediaUrl = (rawUrl: string): boolean => {
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase();
    return MEDIA_HOSTS.some(host => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
};
