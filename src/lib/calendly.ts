const CALENDLY_ROOT_HOST = "calendly.com";

function isCalendlyHost(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase();
  return normalizedHost === CALENDLY_ROOT_HOST || normalizedHost.endsWith(`.${CALENDLY_ROOT_HOST}`);
}

export function isCalendlyHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && isCalendlyHost(url.hostname);
  } catch {
    return false;
  }
}

export function isCalendlyMessageOrigin(origin: string): boolean {
  return isCalendlyHttpsUrl(origin);
}
