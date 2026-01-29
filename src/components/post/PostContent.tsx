import { For, createMemo } from 'solid-js'
import type { MessageEntity } from '@/lib/telegram'

interface PostContentProps {
  text: string
  entities?: MessageEntity[]
  class?: string
  truncate?: boolean
  maxLines?: number
}

/**
 * Renders post text with Telegram entities (formatting)
 *
 * Supports bold, italic, links, mentions, hashtags, code, etc.
 */
export function PostContent(props: PostContentProps) {
  const renderedContent = createMemo(() => {
    if (!props.text) return []
    if (!props.entities || props.entities.length === 0) {
      return [{ type: 'text' as const, content: props.text }]
    }

    // Sort entities by offset
    const sortedEntities = [...props.entities].sort((a, b) => a.offset - b.offset)
    const parts: Array<{ type: string; content: string; url?: string; language?: string }> = []

    let lastOffset = 0

    for (const entity of sortedEntities) {
      // Add text before this entity
      if (entity.offset > lastOffset) {
        parts.push({
          type: 'text',
          content: props.text.slice(lastOffset, entity.offset),
        })
      }

      // Add the entity
      const entityText = props.text.slice(entity.offset, entity.offset + entity.length)
      parts.push({
        type: entity.type,
        content: entityText,
        url: entity.url,
        language: entity.language,
      })

      lastOffset = entity.offset + entity.length
    }

    // Add remaining text
    if (lastOffset < props.text.length) {
      parts.push({
        type: 'text',
        content: props.text.slice(lastOffset),
      })
    }

    return parts
  })

  const renderPart = (part: { type: string; content: string; url?: string; language?: string }) => {
    switch (part.type) {
      case 'bold':
        return <strong class="font-semibold">{part.content}</strong>
      case 'italic':
        return <em class="italic">{part.content}</em>
      case 'underline':
        return <span class="underline">{part.content}</span>
      case 'strikethrough':
        return <span class="line-through">{part.content}</span>
      case 'code':
        return (
          <code class="px-1.5 py-0.5 rounded bg-[var(--glass-bg)] font-mono text-sm text-liquid-400">
            {part.content}
          </code>
        )
      case 'pre':
        return (
          <pre class="my-2 p-3 rounded-lg bg-[var(--glass-bg)] overflow-x-auto">
            <code class="font-mono text-sm">{part.content}</code>
          </pre>
        )
      case 'link':
        return (
          <a
            href={part.url || part.content}
            target="_blank"
            rel="noopener noreferrer"
            class="text-liquid-500 hover:text-liquid-400 hover:underline transition-colors"
          >
            {part.content}
          </a>
        )
      case 'mention':
        return (
          <span class="text-liquid-500 cursor-pointer hover:underline">
            {part.content}
          </span>
        )
      case 'hashtag':
        return (
          <span class="text-liquid-500 cursor-pointer hover:underline">
            {part.content}
          </span>
        )
      case 'email':
        return (
          <a
            href={`mailto:${part.content}`}
            class="text-liquid-500 hover:underline"
          >
            {part.content}
          </a>
        )
      case 'phone':
        return (
          <a
            href={`tel:${part.content}`}
            class="text-liquid-500 hover:underline"
          >
            {part.content}
          </a>
        )
      case 'spoiler':
        return (
          <span
            class="bg-[var(--color-text)] text-[var(--color-text)] hover:bg-transparent hover:text-inherit rounded px-1 transition-colors cursor-pointer"
            onClick={(e) => {
              const target = e.currentTarget
              target.style.background = 'transparent'
              target.style.color = 'inherit'
            }}
          >
            {part.content}
          </span>
        )
      default:
        return <span>{part.content}</span>
    }
  }

  return (
    <div
      class={`
        whitespace-pre-wrap break-words text-primary leading-relaxed
        ${props.truncate ? `line-clamp-${props.maxLines ?? 3}` : ''}
        ${props.class ?? ''}
      `}
    >
      <For each={renderedContent()}>{(part) => renderPart(part)}</For>
    </div>
  )
}
