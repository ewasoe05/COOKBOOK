import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public");

const TERRACOTTA = [180, 87, 47, 255];
const CREAM = [248, 242, 231, 255];

function crc32(buffer) {
  let crc = ~0;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j += 1) {
      const take = crc & 1;
      crc >>>= 1;
      if (take) crc ^= 0xedb88320;
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function encodePng(size, paint) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = paint(x, y, size);
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function paintIcon(x, y, size) {
  const cx = (size - 1) / 2;
  const nyPlate = (y - size * 0.54) / (size * 0.21);
  const nxPlate = (x - cx) / (size * 0.29);
  const plate = nxPlate * nxPlate + nyPlate * nyPlate;

  let color = TERRACOTTA;
  if (plate < 1) color = CREAM;
  if (plate < 1.08 && plate > 0.82 && y > size * 0.42) color = TERRACOTTA;
  const nyBowl = (y - size * 0.46) / (size * 0.045);
  const nxBowl = (x - cx) / (size * 0.17);
  if (nxBowl * nxBowl + nyBowl * nyBowl < 1 && y < size * 0.5) color = TERRACOTTA;
  return color;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "icon-192.png"), encodePng(192, paintIcon));
writeFileSync(join(OUT, "icon-512.png"), encodePng(512, paintIcon));
writeFileSync(join(OUT, "apple-touch-icon.png"), encodePng(180, paintIcon));
console.log("wrote public icons");
