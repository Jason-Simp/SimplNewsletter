import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain"]);

export async function assertSafePublicHttpsUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("Callback URL is invalid.");
  }

  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new Error("Callback URL must be a public HTTPS URL without credentials or a custom port.");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("Callback URL does not resolve to a public host.");
  }

  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true });

  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error("Callback URL does not resolve exclusively to public addresses.");
  }

  return url.toString();
}

export function isPublicAddress(address: string) {
  if (address.includes(":")) {
    const normalized = address.toLowerCase();
    if (normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd")) return false;
    if (/^fe[89ab]/.test(normalized) || normalized.startsWith("ff")) return false;
    if (normalized.startsWith("::ffff:")) return isPublicAddress(normalized.slice(7));
    return true;
  }

  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = octets;
  return !(
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  );
}
