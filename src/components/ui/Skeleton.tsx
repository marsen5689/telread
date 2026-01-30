interface SkeletonProps {
  class?: string
  width?: string
  height?: string
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const roundedStyles = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
}

/**
 * Skeleton - Loading placeholder with shimmer effect
 */
export function Skeleton(props: SkeletonProps) {
  return (
    <div
      class={`
        skeleton
        ${roundedStyles[props.rounded ?? 'md']}
        ${props.class ?? ''}
      `}
      style={{
        width: props.width,
        height: props.height ?? '1rem',
      }}
    />
  )
}

/**
 * Skeleton for avatar
 */
export function AvatarSkeleton(props: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  return (
    <div class={`skeleton rounded-full ${sizes[props.size ?? 'md']}`} />
  )
}

/**
 * Skeleton for text lines
 */
export function TextSkeleton(props: { lines?: number; class?: string }) {
  const lines = props.lines ?? 3

  return (
    <div class={`space-y-2 ${props.class ?? ''}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          width={i === lines - 1 ? '60%' : '100%'}
          height="0.875rem"
          rounded="md"
        />
      ))}
    </div>
  )
}

/**
 * Skeleton for post - matches .post structure without card wrapper
 */
export function PostSkeleton() {
  return (
    <div class="post">
      {/* Header */}
      <div class="post-header">
        <AvatarSkeleton />
        <div class="flex-1 space-y-2">
          <Skeleton width="40%" height="0.875rem" />
          <Skeleton width="25%" height="0.75rem" />
        </div>
      </div>

      {/* Content */}
      <div class="post-content">
        <TextSkeleton lines={3} />
      </div>

      {/* Media placeholder */}
      <div class="post-media">
        <Skeleton height="200px" rounded="xl" class="mx-4" />
      </div>

      {/* Actions */}
      <div class="post-actions">
        <Skeleton width="70px" height="28px" rounded="full" />
        <Skeleton width="70px" height="28px" rounded="full" />
        <Skeleton width="40px" height="28px" rounded="full" />
      </div>
    </div>
  )
}

/**
 * Skeleton for comment
 */
export function CommentSkeleton(props: { depth?: number }) {
  const marginLeft = (props.depth ?? 0) * 44

  return (
    <div style={{ "margin-left": `${marginLeft}px` }} class="py-3">
      <div class="flex gap-3">
        <AvatarSkeleton size="sm" />
        <div class="flex-1 space-y-2">
          <div class="flex items-center gap-2">
            <Skeleton width="80px" height="0.75rem" />
            <Skeleton width="40px" height="0.75rem" />
          </div>
          <TextSkeleton lines={2} />
        </div>
      </div>
    </div>
  )
}
