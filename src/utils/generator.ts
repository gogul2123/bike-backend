let lastTimestamp = 0;
let counter = 0;

/**
 * Generate a numeric-only ID: prefix + epoch timestamp + counter padded.
 */
export function generateNumericEpochId(
  prefix: string,
  totalLength?: number
): string {
  const now = Date.now(); // milliseconds since Unix epoch
  if (now === lastTimestamp) {
    counter++;
  } else {
    lastTimestamp = now;
    counter = 0;
  }

  // construct: prefix + timestamp (ms) + counter (3 digits)
  const idCore = `${now}${counter.toString().padStart(3, "0")}`;
  let result = `${prefix}${idCore}`;

  if (totalLength != null) {
    if (result.length < totalLength) {
      result = result.padEnd(totalLength, "0");
    } else if (result.length > totalLength) {
      result = result.slice(0, totalLength);
    }
  }

  return result;
}
