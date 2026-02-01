import { type Component } from 'solid-js'

interface FolderChipProps {
    id: number | null
    title: string
    emoticon?: string
    count?: number
    active: boolean
    onClick: () => void
}

/**
 * Folder chip component for folder selection UI
 * 
 * Displays a folder with its icon, title, and optional count.
 * Supports active state with visual feedback.
 */
export const FolderChip: Component<FolderChipProps> = (props) => {
    return (
        <button
            type="button"
            class="folder-chip"
            classList={{
                'folder-chip--active': props.active,
            }}
            onClick={props.onClick}
        >
            <span class="folder-chip__content">
                {props.emoticon && (
                    <span class="folder-chip__icon">{props.emoticon}</span>
                )}
                <span class="folder-chip__title">{props.title}</span>
                {props.count !== undefined && props.count > 0 && (
                    <span class="folder-chip__count">{props.count}</span>
                )}
            </span>
        </button>
    )
}

// Styles
const styles = `
.folder-chip {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 1.5rem;
  border: 1px solid var(--border-primary);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.folder-chip:hover {
  background: var(--bg-tertiary);
  border-color: var(--accent);
}

.folder-chip--active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.folder-chip--active:hover {
  background: var(--accent);
  opacity: 0.9;
}

.folder-chip__content {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.folder-chip__icon {
  font-size: 1rem;
  line-height: 1;
}

.folder-chip__title {
  line-height: 1;
}

.folder-chip__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.375rem;
  border-radius: 0.625rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
}

.folder-chip--active .folder-chip__count {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

/* Scrollable container for chips */
.folder-chips-container {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.5rem 0;
  margin: 0 -1rem;
  padding-left: 1rem;
  padding-right: 1rem;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.folder-chips-container::-webkit-scrollbar {
  display: none;
}

/* Fade effect on edges */
.folder-chips-wrapper {
  position: relative;
}

.folder-chips-wrapper::before,
.folder-chips-wrapper::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2rem;
  pointer-events: none;
  z-index: 1;
}

.folder-chips-wrapper::before {
  left: 0;
  background: linear-gradient(to right, var(--bg-primary), transparent);
}

.folder-chips-wrapper::after {
  right: 0;
  background: linear-gradient(to left, var(--bg-primary), transparent);
}
`

// Inject styles
if (typeof document !== 'undefined') {
    const styleId = 'folder-chip-styles'
    if (!document.getElementById(styleId)) {
        const styleEl = document.createElement('style')
        styleEl.id = styleId
        styleEl.textContent = styles
        document.head.appendChild(styleEl)
    }
}
