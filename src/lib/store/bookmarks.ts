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
  const [isSaving, setIsSaving] = createSignal(false)

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
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[Bookmarks] Failed to load:', error)
      }
    }
    setIsLoaded(true)
  }

  // Save to storage - atomic operation
  // Returns true if successful, false otherwise
  const save = async (items: Bookmark[]): Promise<boolean> => {
    try {
      setIsSaving(true)
      await set(STORAGE_KEY, items)
      return true
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[Bookmarks] Failed to save:', error)
      }
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // Check if a message is bookmarked
  const isBookmarked = (channelId: number, messageId: number): boolean => {
    return bookmarks().some(
      (b) => b.channelId === channelId && b.messageId === messageId
    )
  }

  // Add a bookmark - atomic: save first, then update state
  const addBookmark = async (
    channelId: number,
    messageId: number,
    channelTitle: string,
    preview: string
  ): Promise<boolean> => {
    if (isBookmarked(channelId, messageId)) return true

    const newBookmark: Bookmark = {
      channelId,
      messageId,
      channelTitle,
      preview: preview.slice(0, 200),
      savedAt: new Date(),
    }

    const updated = [newBookmark, ...bookmarks()]

    // Save first, then update state only on success
    const success = await save(updated)
    if (success) {
      setBookmarksInternal(updated)
    }
    return success
  }

  // Remove a bookmark - atomic: save first, then update state
  const removeBookmark = async (channelId: number, messageId: number): Promise<boolean> => {
    const updated = bookmarks().filter(
      (b) => !(b.channelId === channelId && b.messageId === messageId)
    )

    // Save first, then update state only on success
    const success = await save(updated)
    if (success) {
      setBookmarksInternal(updated)
    }
    return success
  }

  // Toggle bookmark
  const toggleBookmark = async (
    channelId: number,
    messageId: number,
    channelTitle: string,
    preview: string
  ): Promise<boolean> => {
    if (isBookmarked(channelId, messageId)) {
      return removeBookmark(channelId, messageId)
    } else {
      return addBookmark(channelId, messageId, channelTitle, preview)
    }
  }

  // Clear all bookmarks
  const clearAll = async (): Promise<boolean> => {
    const success = await save([])
    if (success) {
      setBookmarksInternal([])
    }
    return success
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
    get isSaving() {
      return isSaving()
    },
    isBookmarked,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    clearAll,
  }
}

export const bookmarksStore = createRoot(createBookmarksStore)
