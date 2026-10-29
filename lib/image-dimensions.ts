/**
 * Minimal, dependency-free image dimension probing.
 *
 * We only need this to reject obviously broken uploads (for example a 1x1
 * placeholder image that would be stretched into a solid colour block when
 * rendered as a company logo). Unknown formats return null and are allowed.
 */
export type ImageDimensions = { width: number; height: number };

function pngDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 24) return null;
  if (buffer.readUInt32BE(0) !== 0x89504e47) return null;
  if (buffer.readUInt32BE(4) !== 0x0d0a1a0a) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function jpegDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    // Standalone markers without a length field.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }

    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;

    const isStartOfFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;

    if (isStartOfFrame) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + length;
  }

  return null;
}

function gifDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 10) return null;
  const header = buffer.toString("ascii", 0, 6);
  if (header !== "GIF87a" && header !== "GIF89a") return null;
  return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
}

function webpDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 30) return null;
  if (buffer.toString("ascii", 0, 4) !== "RIFF") return null;
  if (buffer.toString("ascii", 8, 12) !== "WEBP") return null;

  const chunk = buffer.toString("ascii", 12, 16);

  if (chunk === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }

  if (chunk === "VP8 ") {
    if (buffer.length < 30 || buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) {
      return null;
    }
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  if (chunk === "VP8L") {
    if (buffer.length < 25 || buffer[20] !== 0x2f) return null;
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  return null;
}

function parseSvgLength(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.trim().match(/^([0-9]*\.?[0-9]+)\s*(px)?$/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function svgDimensions(buffer: Buffer): ImageDimensions | null {
  const text = buffer.toString("utf8", 0, Math.min(buffer.length, 16 * 1024));
  const tag = text.match(/<svg\b[^>]*>/i)?.[0];
  if (!tag) return null;

  const readAttr = (name: string) => {
    const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"));
    return match?.[1];
  };

  const width = parseSvgLength(readAttr("width"));
  const height = parseSvgLength(readAttr("height"));
  if (width && height) return { width, height };

  const viewBox = readAttr("viewBox");
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }

  return null;
}

export function readImageDimensions(buffer: Buffer): ImageDimensions | null {
  return (
    pngDimensions(buffer) ??
    jpegDimensions(buffer) ??
    gifDimensions(buffer) ??
    webpDimensions(buffer) ??
    svgDimensions(buffer)
  );
}
