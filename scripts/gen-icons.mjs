// Renders the app icon (atom on teal) to PNG without any image libraries.
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const TEAL = [15, 118, 110], WHITE = [255, 255, 255], AMBER = [251, 191, 36]

function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

// Colour of a point in a unit square (0..1). `pad` shrinks the artwork for maskable safe zones.
function colourAt(x, y, { rounded, pad }) {
  if (rounded) {
    const r = 0.22, dx = Math.max(r - x, 0, x - (1 - r)), dy = Math.max(r - y, 0, y - (1 - r))
    if (dx * dx + dy * dy > r * r) return null
  }
  const s = 1 - 2 * pad
  const u = (x - 0.5) / s, v = (y - 0.5) / s
  if (u * u + v * v < 0.075 ** 2) return AMBER
  for (const ang of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
    const c = Math.cos(ang), sn = Math.sin(ang)
    const a = u * c + v * sn, b = -u * sn + v * c
    const d = Math.sqrt((a / 0.36) ** 2 + (b / 0.14) ** 2)
    if (Math.abs(d - 1) < 0.075) return WHITE
  }
  return TEAL
}

function png(size, opts) {
  const SS = 4
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const col = colourAt((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size, opts)
        if (col) { r += col[0]; g += col[1]; b += col[2]; a += 255 }
      }
      const n = SS * SS, o = y * (size * 4 + 1) + 1 + x * 4
      const cov = a / 255 || 1
      raw[o] = r / cov; raw[o + 1] = g / cov; raw[o + 2] = b / cov; raw[o + 3] = a / n
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync('public/icon-192.png', png(192, { rounded: true, pad: 0.08 }))
writeFileSync('public/icon-512.png', png(512, { rounded: true, pad: 0.08 }))
writeFileSync('public/icon-maskable-512.png', png(512, { rounded: false, pad: 0.2 }))
writeFileSync('public/apple-touch-icon.png', png(180, { rounded: false, pad: 0.12 }))
console.log('icons written')
