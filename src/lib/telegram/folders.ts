import { getTelegramClient } from './client'
import type { tl } from '@mtcute/web'

/**
 * Telegram Dialog Filter (Folder)
 */
export interface DialogFilter {
    id: number
    title: string
    /** Emoji icon for the folder */
    emoticon?: string
    /** Pinned chat IDs in this folder */
    pinnedPeers: number[]
    /** Included chat IDs */
    includePeers: number[]
    /** Excluded chat IDs */
    excludePeers: number[]
    /** Include contacts */
    contacts?: boolean
    /** Include non-contacts */
    nonContacts?: boolean
    /** Include groups */
    groups?: boolean
    /** Include channels/broadcasts */
    broadcasts?: boolean
    /** Include bots */
    bots?: boolean
    /** Exclude muted chats */
    excludeMuted?: boolean
    /** Exclude read chats */
    excludeRead?: boolean
    /** Exclude archived chats */
    excludeArchived?: boolean
}

/**
 * Simplified folder info for UI
 */
export interface FolderInfo {
    id: number
    title: string
    emoticon?: string
    /** Number of channels in this folder (calculated) */
    channelCount?: number
}

// Cache for dialog filters to prevent excessive network calls
let filtersCache: DialogFilter[] | null = null
let filtersCacheTime = 0
const CACHE_TTL = 10000 // 10 seconds

/**
 * Manually clear the folders cache
 * Used when receiving real-time updates about folder changes
 */
export function clearFoldersCache() {
    filtersCache = null
    filtersCacheTime = 0
}

/**
 * Fetch all dialog filters (folders) from Telegram
 * 
 * Returns list of user's folders with their settings.
 * Folders are what Telegram calls "Dialog Filters" in the API.
 * 
 * @param force - If true, bypasses memory cache and forces network request
 */
export async function fetchDialogFilters(force: boolean = false): Promise<DialogFilter[]> {
    // Return cached data if valid and not forced
    if (!force && filtersCache && (Date.now() - filtersCacheTime < CACHE_TTL)) {
        if (import.meta.env.DEV) {
            console.log('[Folders] Using cached filters')
        }
        return filtersCache
    }

    const client = getTelegramClient()

    try {
        const result = await client.call({
            _: 'messages.getDialogFilters',
        })

        if (!result || !('filters' in result)) {
            return []
        }

        const filters: DialogFilter[] = []

        for (const filter of result.filters) {
            // Skip the "All Chats" filter (id = 0)
            if (filter._ === 'dialogFilter' && filter.id !== 0) {
                filters.push(mapDialogFilter(filter))
            }
        }

        if (import.meta.env.DEV) {
            console.log(`[Folders] Fetched ${filters.length} folders`)
        }

        // Update cache
        filtersCache = filters
        filtersCacheTime = Date.now()

        return filters
    } catch (error) {
        if (import.meta.env.DEV) {
            console.error('[Folders] Failed to fetch dialog filters:', error)
        }
        return []
    }
}

/**
 * Get list of channel IDs that belong to a specific folder
 * 
 * @param folderId - The folder ID to get channels from
 * @returns Array of channel IDs in this folder
 */
export async function getChannelIdsInFolder(folderId: number): Promise<number[]> {
    try {
        // Get all filters first
        const filters = await fetchDialogFilters()

        // Find the specific folder
        const folder = filters.find(f => f.id === folderId)
        if (!folder) {
            if (import.meta.env.DEV) {
                console.warn(`[Folders] Folder ${folderId} not found`)
            }
            return []
        }

        if (import.meta.env.DEV) {
            console.log(`[Folders] Folder "${folder.title}": ${folder.includePeers.length} included peers, broadcasts=${folder.broadcasts}`)
        }

        // If folder uses broadcasts flag, we need to get all channels
        // Otherwise use the explicit includePeers list
        if (folder.broadcasts && folder.includePeers.length === 0) {
            // This folder includes all broadcast channels
            // We'll need to iterate dialogs and filter
            const client = getTelegramClient()
            const channelIds: number[] = []

            const iterator = client.iterDialogs()[Symbol.asyncIterator]()
            let count = 0
            const MAX_DIALOGS = 200

            while (count < MAX_DIALOGS) {
                const { value: dialog, done } = await iterator.next()
                if (done) break
                count++

                const peer = dialog.peer
                if (peer.type === 'chat') {
                    const chat = peer as any
                    if (chat.chatType === 'channel' && !isGroupChat(chat)) {
                        channelIds.push(chat.id)
                    }
                }
            }

            if (import.meta.env.DEV) {
                console.log(`[Folders] Found ${channelIds.length} broadcast channels (broadcasts flag)`)
            }


            return channelIds
        }

        // Use explicit includePeers list
        // IMPORTANT: includePeers contains bare peer IDs (positive numbers)
        // We need to convert them to marked channel IDs (negative with -100 prefix)
        const bareIds = folder.includePeers.filter(id => id > 0)

        if (import.meta.env.DEV) {
            console.log(`[Folders] Processing ${bareIds.length} bare IDs from folder ${folder.title}`)
        }

        // Convert bare peer ID to marked channel ID
        // Telegram format: -100 + bare_id
        const channelIds = bareIds.map(bareId => {
            // Add -100 prefix to convert to marked channel ID
            const markedId = Number(`-100${bareId}`)
            if (isNaN(markedId)) {
                console.warn(`[Folders] Failed to convert bare ID ${bareId} to marked ID`)
                return 0
            }
            return markedId
        }).filter(id => id !== 0)

        if (import.meta.env.DEV) {
            console.log(`[Folders] Folder "${folder.title}": mapped to ${channelIds.length} channel IDs`)
            if (channelIds.length > 0) {
                console.log(`[Folders] IDs sample: ${channelIds.slice(0, 3).join(', ')}`)
            }
        }

        return channelIds
    } catch (error) {
        if (import.meta.env.DEV) {
            console.error(`[Folders] Failed to get channels in folder ${folderId}:`, error)
        }
        return []
    }
}

/**
 * Get simplified folder info list for UI
 * Includes channel count for each folder
 */
export async function getFolderInfoList(allChannelIds: number[]): Promise<FolderInfo[]> {
    const filters = await fetchDialogFilters()
    const folderInfos: FolderInfo[] = []

    for (const filter of filters) {
        // Calculate how many of user's subscribed channels are in this folder
        const channelCount = countChannelsInFilter(filter, allChannelIds)

        folderInfos.push({
            id: filter.id,
            title: filter.title,
            emoticon: filter.emoticon,
            channelCount,
        })
    }

    return folderInfos
}

// Helper functions

/**
 * Map Telegram DialogFilter to our interface
 */
function mapDialogFilter(filter: tl.RawDialogFilter): DialogFilter {
    // Extract title as string - it can be RawTextWithEntities
    const title = typeof filter.title === 'string'
        ? filter.title
        : filter.title?.text || 'Untitled'

    // Extract emoticon if present
    const emoticon = filter.emoticon || undefined

    return {
        id: filter.id,
        title,
        emoticon,
        pinnedPeers: extractPeerIds(filter.pinnedPeers || []),
        includePeers: extractPeerIds(filter.includePeers || []),
        excludePeers: extractPeerIds(filter.excludePeers || []),
        contacts: filter.contacts,
        nonContacts: filter.nonContacts,
        groups: filter.groups,
        broadcasts: filter.broadcasts,
        bots: filter.bots,
        excludeMuted: filter.excludeMuted,
        excludeRead: filter.excludeRead,
        excludeArchived: filter.excludeArchived,
    }
}

/**
 * Extract peer IDs from InputPeer array
 * Safely handles parsing of different number types
 */
function extractPeerIds(peers: tl.TypeInputPeer[]): number[] {
    const ids: number[] = []

    for (const peer of peers) {
        try {
            let id: number | null = null

            if ('channelId' in peer && peer.channelId) {
                id = Number(peer.channelId.toString())
            } else if ('chatId' in peer && peer.chatId) {
                id = Number(peer.chatId.toString())
            } else if ('userId' in peer && peer.userId) {
                id = Number(peer.userId.toString())
            }

            if (id !== null && !isNaN(id)) {
                ids.push(id)
            }
        } catch (e) {
            console.warn('[Folders] Failed to extract peer ID:', e)
        }
    }

    return ids
}

/**
 * Count how many channels from the given list are in this filter
 */
function countChannelsInFilter(filter: DialogFilter, channelIds: number[]): number {
    // If filter explicitly includes peers, check intersection
    if (filter.includePeers.length > 0) {
        return channelIds.filter(id => filter.includePeers.includes(id)).length
    }

    // If filter uses broadcasts flag, count all channels
    if (filter.broadcasts) {
        return channelIds.length
    }

    return 0
}

/**
 * Check if a chat is a group (supergroup/megagroup) rather than a broadcast channel
 */
function isGroupChat(chat: any): boolean {
    return chat.chatType === 'supergroup' || chat.chatType === 'gigagroup'
}
