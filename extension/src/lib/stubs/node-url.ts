export function pathToFileURL(value: string): URL {
  return new URL(value, "file://");
}
