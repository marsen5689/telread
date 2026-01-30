import { For, createMemo } from 'solid-js'
import type { JSX } from 'solid-js'
import type { MessageEntity } from '@/lib/telegram'

interface PostContentProps {
  text: string
  entities?: MessageEntity[]
  class?: string
  truncate?: boolean
  maxLines?: number
}

interface TextSegment {
  start: number
  end: number
  entities: MessageEntity[]
}

/**
 * Renders post text with Telegram entities (formatting)
 *
 * Supports overlapping entities - e.g., bold + italic on same text.
 * Uses interval-based algorithm to handle multiple formatting on same characters.
 */
export function PostContent(props: PostContentProps) {
  const segments = createMemo(() => {
    if (!props.text) return []
    if (!props.entities || props.entities.length === 0) {
      return [{ start: 0, end: props.text.length, entities: [] as MessageEntity[] }]
    }

    // Collect all unique boundary points
    const points = new Set<number>([0, props.text.length])
    for (const entity of props.entities) {
      points.add(entity.offset)
      points.add(entity.offset + entity.length)
    }

    // Sort points
    const sortedPoints = [...points].sort((a, b) => a - b)

    // Create segments between consecutive points
    const result: TextSegment[] = []
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const start = sortedPoints[i]
      const end = sortedPoints[i + 1]

      if (start >= end) continue

      // Find all entities that cover this segment
      const activeEntities = props.entities.filter(
        (e) => e.offset <= start && e.offset + e.length >= end
      )

      result.push({ start, end, entities: activeEntities })
    }

    return result
  })

  // Wrap content with entity formatting (supports nesting)
  const wrapWithEntities = (content: string, entities: MessageEntity[]): JSX.Element => {
    if (entities.length === 0) {
      return <>{content}</>
    }

    // Sort entities by priority for consistent nesting order
    // Links should be outermost, then text styles
    const priorityOrder: Record<string, number> = {
      link: 0,
      mention: 1,
      hashtag: 2,
      email: 3,
      phone: 4,
      spoiler: 5,
      pre: 6,
      code: 7,
      bold: 8,
      italic: 9,
      underline: 10,
      strikethrough: 11,
    }

    const sorted = [...entities].sort(
      (a, b) => (priorityOrder[a.type] ?? 99) - (priorityOrder[b.type] ?? 99)
    )

    // Build nested structure from outside in
    let result: JSX.Element = <>{content}</>

    // Apply entities from innermost to outermost (reverse order)
    for (let i = sorted.length - 1; i >= 0; i--) {
      const entity = sorted[i]
      result = wrapSingle(result, entity)
    }

    return result
  }

  const wrapSingle = (children: JSX.Element, entity: MessageEntity): JSX.Element => {
    switch (entity.type) {
      case 'bold':
        return <strong class="font-semibold">{children}</strong>
      case 'italic':
        return <em class="italic">{children}</em>
      case 'underline':
        return <span class="underline">{children}</span>
      case 'strikethrough':
        return <span class="line-through">{children}</span>
      case 'code':
        return (
          <code class="px-1.5 py-0.5 rounded bg-[var(--glass-bg)] font-mono text-sm text-accent">
            {children}
          </code>
        )
      case 'pre':
        return (
          <pre class="my-2 p-3 rounded-lg bg-[var(--glass-bg)] overflow-x-auto max-w-full">
            <code class="font-mono text-sm">{children}</code>
          </pre>
        )
      case 'link':
        return (
          <a
            href={entity.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            class="text-accent hover:underline transition-colors"
          >
            {children}
          </a>
        )
      case 'mention':
        return (
          <span class="text-accent cursor-pointer hover:underline">
            {children}
          </span>
        )
      case 'hashtag':
        return (
          <span class="text-accent cursor-pointer hover:underline">
            {children}
          </span>
        )
      case 'email':
        return (
          <a
            href={`mailto:${typeof children === 'string' ? children : ''}`}
            class="text-accent hover:underline"
          >
            {children}
          </a>
        )
      case 'phone':
        return (
          <a
            href={`tel:${typeof children === 'string' ? children : ''}`}
            class="text-accent hover:underline"
          >
            {children}
          </a>
        )
      case 'spoiler':
        return (
          <span
            class="spoiler-hidden"
            onClick={(e) => {
              e.currentTarget.classList.remove('spoiler-hidden')
              e.currentTarget.classList.add('spoiler-revealed')
            }}
          >
            {children}
          </span>
        )
      default:
        return <>{children}</>
    }
  }

  // Use fixed line-clamp classes for Tailwind to generate
  const lineClampClass = () => {
    if (!props.truncate) return ''
    const lines = props.maxLines ?? 4
    if (lines <= 2) return 'line-clamp-2'
    if (lines <= 3) return 'line-clamp-3'
    if (lines <= 4) return 'line-clamp-4'
    if (lines <= 5) return 'line-clamp-5'
    return 'line-clamp-6'
  }

  return (
    <div
      class={`
        whitespace-pre-wrap break-words text-primary leading-relaxed
        ${lineClampClass()}
        ${props.class ?? ''}
      `}
    >
      <For each={segments()}>
        {(segment) => {
          const text = props.text.slice(segment.start, segment.end)
          return wrapWithEntities(text, segment.entities)
        }}
      </For>
    </div>
  )
}
