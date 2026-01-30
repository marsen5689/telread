import { createSignal, Show, createEffect, onCleanup } from 'solid-js'
import { ChevronLeft, AlertCircle, Send } from 'lucide-solid'

interface QRCodeLoginProps {
  qrUrl?: string
  onBack: () => void
  isLoading?: boolean
  error?: string
}

/**
 * QR Code login component
 *
 * Displays a QR code that users can scan with their
 * Telegram mobile app to authenticate.
 */
export function QRCodeLogin(props: QRCodeLoginProps) {
  const [qrDataUrl, setQrDataUrl] = createSignal<string | null>(null)

  // Generate QR code image when URL changes
  // Uses createEffect to track qrUrl changes and properly cleanup async operations
  createEffect(() => {
    const url = props.qrUrl
    if (!url) return
    
    let cancelled = false
    
    ;(async () => {
      // Dynamically import QR code library for code splitting
      const QRCode = (await import('qrcode')).default
      if (cancelled) return
      
      const dataUrl = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
      
      if (cancelled) return
      setQrDataUrl(dataUrl)
    })()
    
    onCleanup(() => { cancelled = true })
  })

  return (
    <div class="space-y-6">
      <button type="button" onClick={props.onBack} class="pill">
        <ChevronLeft size={16} />
        Back
      </button>

      <div class="text-center space-y-2">
        <h2 class="text-2xl font-semibold text-primary">
          Login with QR Code
        </h2>
        <p class="text-secondary">
          Scan this QR code with your Telegram app
        </p>
      </div>

      <div class="flex flex-col items-center gap-6">
        {/* QR Code display */}
        <div class="relative">
          <div class="glass rounded-2xl p-4">
            <Show
              when={qrDataUrl()}
              fallback={
                <div class="w-64 h-64 flex items-center justify-center">
                  <div class="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
                </div>
              }
            >
              <img
                src={qrDataUrl()!}
                alt="QR Code for Telegram Login"
                class="w-64 h-64 rounded-xl"
              />
            </Show>
          </div>

          {/* Telegram logo overlay */}
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="w-12 h-12 rounded-full bg-[#0088cc] flex items-center justify-center shadow-lg">
              <Send size={28} class="text-white" />
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div class="space-y-3 text-sm">
          <div class="flex items-start gap-3">
            <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent)]/15 text-accent flex items-center justify-center text-xs font-medium">
              1
            </span>
            <span class="text-secondary">
              Open Telegram on your phone
            </span>
          </div>
          <div class="flex items-start gap-3">
            <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent)]/15 text-accent flex items-center justify-center text-xs font-medium">
              2
            </span>
            <span class="text-secondary">
              Go to Settings → Devices → Link Desktop Device
            </span>
          </div>
          <div class="flex items-start gap-3">
            <span class="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent)]/15 text-accent flex items-center justify-center text-xs font-medium">
              3
            </span>
            <span class="text-secondary">
              Point your phone at this screen to confirm login
            </span>
          </div>
        </div>

        <Show when={props.error}>
          <div class="flex items-center justify-center gap-2 text-sm">
            <AlertCircle size={16} class="flex-shrink-0" style="color: var(--danger)" />
            <span style="color: var(--danger)">{props.error}</span>
          </div>
        </Show>
      </div>
    </div>
  )
}
