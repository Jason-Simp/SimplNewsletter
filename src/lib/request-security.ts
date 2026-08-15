export function isTrustedMutationOrigin(
  origin: string,
  requestOrigin: string,
  forwardedHost: string | null,
  host: string | null,
  forwardedProto: string | null
) {
  try {
    const supplied = new URL(origin);
    const direct = new URL(requestOrigin);
    if (supplied.origin === direct.origin) return true;

    const expectedHost = forwardedHost?.split(",")[0]?.trim() || host?.trim();
    const expectedProto = forwardedProto?.split(",")[0]?.trim() || direct.protocol.replace(":", "");
    return Boolean(expectedHost && supplied.host === expectedHost && supplied.protocol === `${expectedProto}:`);
  } catch {
    return false;
  }
}
