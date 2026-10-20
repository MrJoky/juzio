import { isIP } from 'node:net';

export function serverOptions(env = process.env) {
  const url = new URL(env.PUBLIC_URL);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash)
    throw new Error('PUBLIC_URL muss eine HTTPS-Origin ohne Pfad sein.');
  const cms = new URL(env.DIRECTUS_PUBLIC_URL);
  if (cms.protocol !== 'https:' || cms.username || cms.password || cms.pathname !== '/' || cms.search || cms.hash || cms.host === url.host)
    throw new Error('DIRECTUS_PUBLIC_URL muss eine eigene HTTPS-Origin für das CMS sein.');
  if (env.APP_SECURE_COOKIES !== 'true') throw new Error('Serverbetrieb erfordert APP_SECURE_COOKIES=true.');
  if (!isIP(env.TRUSTED_PROXY_IP)) throw new Error('TRUSTED_PROXY_IP muss die einzelne Proxy-IP enthalten.');
  return {
    acceptHost: host => host === url.host || host === 'localhost:3000',
    clientAddress(req) {
      const peer = req.socket.remoteAddress?.replace(/^::ffff:/, '');
      const forwarded = req.headers['x-real-ip'];
      return peer === env.TRUSTED_PROXY_IP && isIP(forwarded || '') ? forwarded : peer;
    }
  };
}
