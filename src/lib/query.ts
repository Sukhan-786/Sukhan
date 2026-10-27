export function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}
export function pageNumber(value: string | string[] | undefined) {
  return Math.min(
    10000,
    Math.max(1, Math.floor(Number(firstParam(value)) || 1)),
  );
}
