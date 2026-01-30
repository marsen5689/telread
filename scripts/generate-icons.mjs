import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = join(__dirname, '../public/icons')

// Read the source SVG
const svgPath = join(iconsDir, 'icon.svg')
const svg = readFileSync(svgPath, 'utf8')

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: '../favicon.ico', size: 32 },
]

for (const { name, size } of sizes) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
  })
  
  const pngData = resvg.render()
  const pngBuffer = pngData.asPng()
  
  const outPath = join(iconsDir, name)
  writeFileSync(outPath, pngBuffer)
  console.log(`Generated ${name} (${size}x${size})`)
}

console.log('\nDone!')
