// Builds every app icon from branding/logo.png (a rounded-square logo, any background around it).
// Run `npm run icons` after replacing the logo.
import { writeFileSync } from 'node:fs'
import sharp from 'sharp'

const SRC = 'branding/logo.png'
const OUT = 'public'
/** Corner radius of the logo square, as a share of its width (measured from the artwork, rounded up). */
const RADIUS = 0.275

// Find the coloured square: the rows with a long unbroken run of purple. This skips the white margin and any
// wordmark text under the icon (letters have gaps between them).
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const purple = (x, y) => {
  const i = (y * info.width + x) * 4
  return data[i + 3] > 200 && data[i + 2] - data[i + 1] > 40
}
const minRun = info.width * 0.15
let x0 = info.width, y0 = info.height, x1 = 0, y1 = 0
for (let y = 0; y < info.height; y++) {
  let start = -1
  for (let x = 0; x <= info.width; x++) {
    if (x < info.width && purple(x, y)) { if (start < 0) start = x; continue }
    if (start >= 0 && x - start >= minRun) { x0 = Math.min(x0, start); x1 = Math.max(x1, x - 1); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
    start = -1
  }
}
// The top and bottom rows of a rounded square are short runs, so take the true top/bottom from the centre column.
const cx = Math.round((x0 + x1) / 2)
while (y0 > 0 && purple(cx, y0 - 1)) y0--
while (y1 < info.height - 1 && purple(cx, y1 + 1)) y1++
// Trim the soft anti-aliased border so no white fringe shows.
const TRIM = 2
x0 += TRIM; y0 += TRIM; x1 -= TRIM; y1 -= TRIM
// Stretch to an exact square (source art is often a few pixels off square).
const side = Math.max(x1 - x0 + 1, y1 - y0 + 1)
const square = { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }
const logo = await sharp(SRC).extract(square).resize(side, side, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer()

/** Logo with transparent rounded corners (for browsers, the install prompt and in-app use). */
async function rounded(size) {
  const r = Math.round(size * RADIUS)
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" ry="${r}"/></svg>`)
  return sharp(logo).resize(size, size, { kernel: 'lanczos3' }).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
}

// Background colour along the logo's top and bottom edges (median, so bright artwork is ignored).
const { data: px } = await sharp(logo).removeAlpha().raw().toBuffer({ resolveWithObject: true })
function edgeColour(fy) {
  const y = Math.round(fy * (side - 1))
  const row = []
  for (let x = Math.round(side * 0.3); x <= Math.round(side * 0.7); x++) row.push((y * side + x) * 3)
  const med = (c) => row.map((i) => px[i + c]).sort((a, b) => a - b)[row.length >> 1]
  return [med(0), med(1), med(2)]
}
const [top, bottom] = [edgeColour(0.02), edgeColour(0.98)]

/**
 * Opaque, full-bleed version for platforms that cut their own shape (Android maskable icons, iOS home screen).
 * The whole logo sits on a top-to-bottom gradient of its own edge colours, so its rounded corners blend away.
 * `scale` shrinks the logo to keep the artwork inside Android's circular safe zone.
 */
async function fullBleed(size, scale) {
  const bg = await sharp(Buffer.from([...top, ...bottom]), { raw: { width: 1, height: 2, channels: 3 } })
    .resize(size, size, { kernel: 'linear', fit: 'fill' }).png().toBuffer()
  const art = Math.round(size * scale)
  const off = Math.round((size - art) / 2)
  return sharp(bg).composite([{ input: await rounded(art), left: off, top: off }]).flatten().png().toBuffer()
}

writeFileSync(`${OUT}/icon-192.png`, await rounded(192))
writeFileSync(`${OUT}/icon-512.png`, await rounded(512))
writeFileSync(`${OUT}/icon-maskable-512.png`, await fullBleed(512, 0.8))
writeFileSync(`${OUT}/apple-touch-icon.png`, await fullBleed(180, 1))
// favicon.svg keeps the existing <link>; the PNG inside is sharp at tab sizes.
const fav = (await rounded(64)).toString('base64')
writeFileSync(`${OUT}/favicon.svg`, `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 64 64"><image width="64" height="64" href="data:image/png;base64,${fav}" xlink:href="data:image/png;base64,${fav}"/></svg>\n`)
console.log(`Icons written from ${SRC} (logo square ${side}px at ${square.left},${square.top}).`)
