import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = join(__dirname, '../public/icons')

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

const favicon = { name: '../favicon.ico', size: 32 }

function generateIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, '#007aff')
  gradient.addColorStop(1, '#5856d6')

  // Rounded rectangle
  const radius = size * 0.1875 // ~96/512
  const padding = size * 0.03125 // ~16/512
  
  ctx.beginPath()
  ctx.roundRect(padding, padding, size - padding * 2, size - padding * 2, radius)
  ctx.fillStyle = gradient
  ctx.fill()

  // Emoji
  const fontSize = size * 0.55
  ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('📖', size / 2, size / 2 + size * 0.02)

  return canvas.toBuffer('image/png')
}

// Generate all icons
for (const { name, size } of sizes) {
  const buffer = generateIcon(size)
  const path = join(iconsDir, name)
  writeFileSync(path, buffer)
  console.log(`Generated ${name} (${size}x${size})`)
}

// Generate favicon (simple PNG, browsers accept it)
const faviconBuffer = generateIcon(favicon.size)
writeFileSync(join(iconsDir, favicon.name), faviconBuffer)
console.log(`Generated favicon.ico (${favicon.size}x${favicon.size})`)

console.log('\nDone!')
