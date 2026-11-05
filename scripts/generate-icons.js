import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Minimal PNG encoder for pure node without external binary dependencies
function createPNG(width, height, r, g, b, innerShape = 'circle') {
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel + 1; // 1 filter byte per line
  const buffer = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * stride;
    buffer[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * bytesPerPixel;
      
      const nx = (x / width) * 2 - 1;
      const ny = (y / height) * 2 - 1;
      const dist = Math.sqrt(nx * nx + ny * ny);

      // Squircle or rounded rect boundary
      const cornerRadius = 0.35;
      const inIcon = Math.abs(nx) < 0.9 && Math.abs(ny) < 0.9;
      
      // Scanner beam across center
      const inBeam = Math.abs(ny) < 0.03 && Math.abs(nx) < 0.75;
      // Barcode bars in center
      const inBarcodeArea = Math.abs(ny) < 0.35 && Math.abs(nx) < 0.55;
      const isBar = inBarcodeArea && (Math.floor((x / width) * 28) % 2 === 0);

      let pr = r;
      let pg = g;
      let pb = b;
      let pa = 255;

      if (inBeam) {
        pr = 52;
        pg = 211;
        pb = 153; // Emerald laser
      } else if (isBar) {
        pr = 255;
        pg = 255;
        pb = 255; // White bars
      } else if (dist > 0.85 && innerShape === 'circle') {
        pr = 10;
        pg = 10;
        pb = 10;
      }

      buffer[pixelOffset] = pr;
      buffer[pixelOffset + 1] = pg;
      buffer[pixelOffset + 2] = pb;
      buffer[pixelOffset + 3] = pa;
    }
  }

  const compressedData = zlib.deflateSync(buffer);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  function makeChunk(type, data) {
    const len = data.length;
    const chunk = Buffer.alloc(12 + len);
    chunk.writeUInt32BE(len, 0);
    chunk.write(type, 4);
    data.copy(chunk, 8);
    const crc = crc32(chunk.subarray(4, 8 + len));
    chunk.writeInt32BE(crc, 8 + len);
    return chunk;
  }

  // Fast CRC32
  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      let byte = buf[i];
      for (let j = 0; j < 8; j++) {
        if ((crc ^ byte) & 1) {
          crc = (crc >>> 1) ^ 0xedb88320;
        } else {
          crc = crc >>> 1;
        }
        byte = byte >>> 1;
      }
    }
    return (crc ^ -1) | 0;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate PWA icons with dark theme #0a0a0a and emerald accents
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192, 16, 24, 20));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512, 16, 24, 20));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, 16, 24, 20, 'square'));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, 16, 24, 20));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPNG(48, 48, 16, 24, 20));

console.log('PWA icons created successfully.');
