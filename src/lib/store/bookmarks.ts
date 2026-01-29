import { createSignal, createRoot } from 'solid-js'
import { get, set } from 'idb-keyval'

export interface Bookmark {
  channelId: number
  messageId: number
  channelTitle: string
  preview: string
  savedAt: Date
}

const STORAGE_KEY = 'telread_bookmarks'

function createBookmarksStore() {
  const [bookmarks, setBookmarksInternal] = createSignal<Bookmark[]>([])
  const [isLoaded, setIsLoaded] = createSignal(false)

  // Load from storage
  const load = async () => {
    try {
      const stored = await get<Bookmark[]>(STORAGE_KEY)
      if (stored) {
        // Restore Date objects
        const restored = stored.map((b) => ({
          ...b,
          savedAt: new Date(b.savedAt),
        }))
        setBookmarksInternal(restored)
      }
    } catch {
      // Use empty list
    }
    setIsLoaded(true)
  }

  // Save to storage
  const save = async (items: Bookmark[]) => {
    try {
      await set(STORAGE_KEY, items)
    } catch {
      // Ignore storage errors
    }
  }

  // Check if a message is bookmarked
  const isBookmarked = (channelId: number, messageId: number): boolean => {
    return bookmarks().some(
      (b) => b.channelId === channelId && b.messageId === messageId
    )
  }

  // Add a bookmark
  const addBookmark = async (
    channelId: number,
    messageId: number,
    channelTitle: string,
    preview: string
  ) => {
    if (isBookmarked(channelId, messageId)) return

    const newBookmark: Bookmark = {
      channelId,
      messageId,
      channelTitle,
      preview: preview.slice(0, 200),
      savedAt: new Date(),
    }

    const updated = [newBookmark, ...bookmarks()]
    setBookmarksInternal(updated)
    await save(updated)
  }

  // Remove a bookmark
  const removeBookmark = async (channelId: number, messageId: number) => {
    const updated = bookmarks().filter(
      (b) => !(b.channelId === channelId && b.messageId === messageId)
    )
    setBookmarksInternal(updated)
    await save(updated)
  }

  // Toggle bookmark
  const toggleBookmark = async (
    channelId: number,
    messageId: number,
    channelTitle: string,
    preview: string
  ) => {
    if (isBookmarked(channelId, messageId)) {
      await removeBookmark(channelId, messageId)
    } else {
      await addBookmark(channelId, messageId, channelTitle, preview)
    }
  }

  // Clear all bookmarks
  const clearAll = async () => {
    setBookmarksInternal([])
    await save([])
  }

  // Initialize
  load()

  return {
    get bookmarks() {
      return bookmarks()
    },
    get isLoaded() {
      return isLoaded()
    },
    isBookmarked,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    clearAll,
  }
}

export const bookmarksStore = createRoot(createBookmarksStore)
