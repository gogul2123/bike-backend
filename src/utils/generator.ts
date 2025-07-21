export function generateEpochId(prefix: string, length?: number): string {
  const now = Date.now();
  let ts = now.toString(36); // base36 encoding for compactness

  if (length != null) {
    const totalLen = prefix.length + ts.length;

    if (totalLen < length) {
      const padSize = length - totalLen;
      ts = ts.padStart(ts.length + padSize, "0");
    } else if (totalLen > length) {
      // truncate timestamp to fit
      const tsLengthAllowed = length - prefix.length;
      ts = ts.slice(-tsLengthAllowed);
    }
  }

  return `${prefix}${ts}`;
}
