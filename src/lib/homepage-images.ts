export function homepageImageType(
  bytes: Uint8Array,
  type: string,
): "png" | "jpg" | "webp" | "avif" | null {
  if (bytes.length < 12) return null;
  if (
    type === "image/png" &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
  )
    return "png";
  if (
    type === "image/jpeg" &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    return "jpg";
  const text = (a: number, b: number) =>
    String.fromCharCode(...bytes.slice(a, b));
  if (type === "image/webp" && text(0, 4) === "RIFF" && text(8, 12) === "WEBP")
    return "webp";
  if (
    type === "image/avif" &&
    text(4, 8) === "ftyp" &&
    ["avif", "avis"].includes(text(8, 12))
  )
    return "avif";
  return null;
}
