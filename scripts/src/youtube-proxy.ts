import { ProxyAgent } from "undici";

let proxyAgent: ProxyAgent | null | undefined;

export function getYouTubeFetchInit(): RequestInit {
  const proxyUrl =
    process.env.WEBSHARE_PROXY_URL ||
    process.env.YOUTUBE_PROXY_URL ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY;

  if (!proxyUrl) return {};

  if (proxyAgent === undefined) {
    proxyAgent = new ProxyAgent(proxyUrl);
    const host = safeProxyHost(proxyUrl);
    console.error(`Using YouTube search proxy${host ? `: ${host}` : ""}`);
  }

  return { dispatcher: proxyAgent } as RequestInit;
}

function safeProxyHost(proxyUrl: string): string | null {
  try {
    const parsed = new URL(proxyUrl);
    return parsed.host;
  } catch {
    return null;
  }
}
