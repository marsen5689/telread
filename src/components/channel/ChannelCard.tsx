import { Show, createMemo, createResource, createSignal, createEffect } from 'solid-js'
import { Motion } from 'solid-motionone'
import { ChannelAvatar, GlassButton } from '@/components/ui'
import { downloadProfilePhoto, isClientReady } from '@/lib/telegram'
import type { ChannelFullInfo } from '@/lib/telegram'

interface ChannelCardProps {
  channel: ChannelFullInfo
  onUnsubscribe?: () => void
  isUnsubscribing?: boolean
  class?: string
}

/**
 * Extract dominant color from image using canvas sampling
 * Returns HSL color for easy manipulation
 */
function extractDominantColor(imageUrl: string): Promise<{ h: number; s: number; l: number } | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }

        // Sample at small size for performance
        const size = 50
        canvas.width = size
        canvas.height = size
        ctx.drawImage(img, 0, 0, size, size)

        const imageData = ctx.getImageData(0, 0, size, size).data
        let r = 0, g = 0, b = 0, count = 0

        // Sample pixels, skip very dark/light ones
        for (let i = 0; i < imageData.length; i += 16) { // Sample every 4th pixel
          const pr = imageData[i]
          const pg = imageData[i + 1]
          const pb = imageData[i + 2]
          const brightness = (pr + pg + pb) / 3

          // Skip very dark or very light pixels
          if (brightness > 30 && brightness < 225) {
            r += pr
            g += pg
            b += pb
            count++
          }
        }

        if (count === 0) {
          resolve(null)
          return
        }

        r = Math.round(r / count)
        g = Math.round(g / count)
        b = Math.round(b / count)

        // Convert RGB to HSL
        const rNorm = r / 255
        const gNorm = g / 255
        const bNorm = b / 255
        const max = Math.max(rNorm, gNorm, bNorm)
        const min = Math.min(rNorm, gNorm, bNorm)
        let h = 0
        let s = 0
        const l = (max + min) / 2

        if (max !== min) {
          const d = max - min
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
          switch (max) {
            case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break
            case gNorm: h = ((bNorm - rNorm) / d + 2) / 6; break
            case bNorm: h = ((rNorm - gNorm) / d + 4) / 6; break
          }
        }

        resolve({ h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) })
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = imageUrl
  })
}

/**
 * ChannelCard - Twitter-style profile card for Telegram channels
 *
 * Features:
 * - Glassmorphism design with dynamic gradient from avatar
 * - Large avatar with verification badge
 * - Channel stats (subscribers, online)
 * - Description
 * - Action buttons
 */
export function ChannelCard(props: ChannelCardProps) {
  const [dominantColor, setDominantColor] = createSignal<{ h: number; s: number; l: number } | null>(null)

  // Load large avatar for banner blur effect
  const [bannerUrl] = createResource(
    () => ({ id: props.channel.id, ready: isClientReady() }),
    async ({ id, ready }) => {
      if (!id || !ready) return null
      try {
        return await downloadProfilePhoto(id, 'big')
      } catch {
        return null
      }
    }
  )

  // Extract dominant color when banner loads
  createEffect(() => {
    const url = bannerUrl()
    if (url) {
      extractDominantColor(url).then(setDominantColor)
    }
  })

  // Generate gradient style based on dominant color
  const gradientStyle = createMemo(() => {
    const color = dominantColor()
    if (!color) {
      return { background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent) 50%, hsl(var(--accent-h) var(--accent-s) 30%) 100%)' }
    }
    // Create a vibrant gradient using the dominant color
    const { h, s, l } = color
    const satBoost = Math.min(s + 20, 90) // Boost saturation for vibrancy
    return {
      background: `linear-gradient(135deg, hsl(${h} ${satBoost}% ${Math.min(l + 15, 60)}%) 0%, hsl(${h} ${satBoost}% ${l}%) 50%, hsl(${(h + 30) % 360} ${satBoost}% ${Math.max(l - 10, 25)}%) 100%)`
    }
  })

  const formattedSubscribers = createMemo(() => {
    const count = props.channel.participantsCount
    if (!count) return null
    if (count < 1000) return count.toString()
    if (count < 1000000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`
    return `${(count / 1000000).toFixed(2).replace(/\.00$/, '').replace(/0$/, '')}M`
  })

  const formattedOnline = createMemo(() => {
    const count = props.channel.onlineCount
    if (!count) return null
    if (count < 1000) return count.toString()
    return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`
  })

  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, easing: 'ease-out' }}
      class={`relative overflow-hidden rounded-3xl ${props.class ?? ''}`}
    >
      {/* Banner with blurred avatar background */}
      <div class="relative h-28 overflow-hidden">
        {/* Dynamic gradient based on avatar color */}
        <div class="absolute inset-0 transition-all duration-700" style={gradientStyle()} />

        {/* Blurred avatar as banner */}
        <Show when={bannerUrl()}>
          {(url) => (
            <img
              src={url()}
              alt=""
              class="absolute inset-0 w-full h-full object-cover scale-150 blur-2xl opacity-60"
            />
          )}
        </Show>

        {/* Glass overlay for depth */}
        <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg-primary)]/80" />

        {/* Badges in top-right */}
        <div class="absolute top-3 right-3 flex items-center gap-2">
          <Show when={props.channel.isVerified}>
            <div class="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/90 text-white text-xs font-medium shadow-lg">
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
              Verified
            </div>
          </Show>
          <Show when={props.channel.isProtected}>
            <div class="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/90 text-white text-xs font-medium shadow-lg">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
              </svg>
              Protected
            </div>
          </Show>
          <Show when={props.channel.isScam}>
            <div class="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/90 text-white text-xs font-medium shadow-lg">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              Scam
            </div>
          </Show>
        </div>
      </div>

      {/* Content card with glass effect */}
      <div class="relative glass-card -mt-8 mx-3 mb-3 p-4">
        {/* Avatar - positioned to overlap banner */}
        <div class="flex items-end gap-4 -mt-14 mb-3">
          <div class="relative">
            <div class="ring-4 ring-[var(--bg-primary)] rounded-full">
              <ChannelAvatar
                channelId={props.channel.id}
                name={props.channel.title}
                size="xl"
                class="w-20 h-20"
              />
            </div>
            {/* Online indicator dot */}
            <Show when={props.channel.onlineCount && props.channel.onlineCount > 0}>
              <div class="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-500 ring-2 ring-[var(--bg-primary)]" />
            </Show>
          </div>

          {/* Action buttons aligned right */}
          <div class="flex-1 flex justify-end gap-2">
            <Show when={props.channel.username}>
              <a
                href={`https://t.me/${props.channel.username}`}
                target="_blank"
                rel="noopener noreferrer"
                class="glass-btn px-3 py-1.5 text-sm font-medium text-primary rounded-xl flex items-center gap-1.5"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.015-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.752-.244-1.349-.374-1.297-.789.027-.216.324-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.099.154.232.17.325.015.094.034.31.019.478z" />
                </svg>
                Open
              </a>
            </Show>
            <Show when={props.onUnsubscribe}>
              <GlassButton
                variant="danger"
                size="sm"
                onClick={props.onUnsubscribe}
                loading={props.isUnsubscribing}
              >
                Unsubscribe
              </GlassButton>
            </Show>
          </div>
        </div>

        {/* Channel info */}
        <div class="space-y-3">
          {/* Name and username */}
          <div>
            <h1 class="text-xl font-bold text-primary flex items-center gap-2">
              {props.channel.title}
              <Show when={props.channel.isVerified}>
                <svg class="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </Show>
            </h1>
            <Show when={props.channel.username}>
              <p class="text-sm text-secondary">@{props.channel.username}</p>
            </Show>
          </div>

          {/* Description */}
          <Show when={props.channel.description}>
            <p class="text-sm text-primary leading-relaxed whitespace-pre-wrap">
              {props.channel.description}
            </p>
          </Show>

          {/* Stats row */}
          <div class="flex items-center gap-4 pt-2">
            <Show when={formattedSubscribers()}>
              <div class="flex items-center gap-1.5">
                <svg class="w-4 h-4 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span class="text-sm">
                  <span class="font-semibold text-primary">{formattedSubscribers()}</span>
                  <span class="text-tertiary ml-1">subscribers</span>
                </span>
              </div>
            </Show>

            <Show when={formattedOnline()}>
              <div class="flex items-center gap-1.5">
                <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span class="text-sm">
                  <span class="font-semibold text-primary">{formattedOnline()}</span>
                  <span class="text-tertiary ml-1">online</span>
                </span>
              </div>
            </Show>

            <Show when={props.channel.slowmodeSeconds && props.channel.slowmodeSeconds > 0}>
              <div class="flex items-center gap-1.5">
                <svg class="w-4 h-4 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-sm text-tertiary">
                  Slowmode {formatSlowmode(props.channel.slowmodeSeconds!)}
                </span>
              </div>
            </Show>
          </div>

        </div>
      </div>
    </Motion.div>
  )
}

function formatSlowmode(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  return `${Math.floor(seconds / 3600)}h`
}
