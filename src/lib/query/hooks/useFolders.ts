import { createQuery } from '@tanstack/solid-query'
import { createMemo } from 'solid-js'
import { fetchDialogFilters, getFolderInfoList } from '@/lib/telegram'
import { queryKeys } from '../keys'


/**
 * Hook to fetch all Telegram folders (dialog filters)
 * 
 * Folders are cached and only refreshed:
 * - On first load
 * - Manually by user
 * - Via real-time updates (future enhancement)
 */
export function useFolders() {
    return createQuery(() => ({
        queryKey: queryKeys.folders.list(),
        queryFn: () => fetchDialogFilters(),
        // Cache folders for a long time - they rarely change
        staleTime: 1000 * 60 * 60, // 1 hour
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
    }))
}

/**
 * Hook to get folder info list with channel counts
 * 
 * @param channelIds - Array of all subscribed channel IDs
 * @returns Query with folder info including channel counts
 */
export function useFolderInfoList(channelIds: () => number[]) {
    return createQuery(() => ({
        // Use stable queryKey - don't include actual IDs to prevent refetch on new channels
        // Just use channel count as a lightweight dependency
        queryKey: ['folders', 'infoList', channelIds().length],
        queryFn: () => getFolderInfoList(channelIds()),
        enabled: channelIds().length > 0,
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 60, // 1 hour
        // Keep previous data while refetching to prevent UI flicker
        placeholderData: (previousData: any) => previousData,
    }))
}

/**
 * Hook to get a specific folder by ID
 * 
 * @param folderId - The folder ID to get
 * @returns Memo with the folder data or undefined
 */
export function useFolder(folderId: () => number | null) {
    const foldersQuery = useFolders()

    return createMemo(() => {
        const id = folderId()
        if (id === null) return null
        return foldersQuery.data?.find(f => f.id === id)
    })
}
