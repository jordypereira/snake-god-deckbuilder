const DEBUG_ENABLED = false;

export function debugLog(...args: unknown[]): void {
  if (DEBUG_ENABLED) {
    console.log(...args);
  }
}
