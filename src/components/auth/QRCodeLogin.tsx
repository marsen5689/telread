import { createSignal, Show, onMount } from 'solid-js'

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
  onMount(async () => {
    if (props.qrUrl) {
      // Dynamically import QR code library for code splitting
      const QRCode = (await import('qrcode')).default
      const dataUrl = await QRCode.toDataURL(props.qrUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
      setQrDataUrl(dataUrl)
    }
  })

  return (
    <div class="space-y-6">
      <button onClick={props.onBack} class="pill">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
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
              <svg class="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
              </svg>
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
          <p class="text-sm text-[var(--danger)] text-center">{props.error}</p>
        </Show>
      </div>
    </div>
  )
}
