export interface PlatformBrowserConfig {
  projectId?: string;
  oauthPortalUrl?: string;
  apiUrl?: string;
  apiBrowserKey?: string;
}

let mapsPromise: Promise<boolean> | undefined;

export function loadMaps(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.google?.maps) return Promise.resolve(true);
  if (mapsPromise) return mapsPromise;

  const { apiUrl, apiBrowserKey } = window.__MANUS_CONFIG__ ?? {};
  if (!apiUrl || !apiBrowserKey) return Promise.resolve(false);

  mapsPromise = new Promise(resolve => {
    const script = document.createElement("script");
    const base = apiUrl.replace(/\/$/, "");
    script.src = `${base}/v1/maps/proxy/maps/api/js?key=${encodeURIComponent(apiBrowserKey)}&libraries=geometry&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(Boolean(window.google?.maps));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return mapsPromise;
}
