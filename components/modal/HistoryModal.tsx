import { View, SectionList } from 'react-native'
import { NouText } from '../NouText'
import { useMemo, useState } from 'react'
import { nIf } from '@/lib/utils'
import { useValue } from '@legendapp/state/react'
import { HistoryItem } from '../history/HistoryItem'
import { history$ } from '@/states/history'
import { ui$ } from '@/states/ui'
import { BaseModal } from './BaseModal'
import { getPageType } from '@/lib/page'
import { NouButton } from '../button/NouButton'
import { t } from 'i18next'
import { useActivePageUrl } from '@/lib/hooks/useActivePageUrl'
import { showUndoToast } from '@/states/undo-toast'
import { SearchField } from '../row/SearchField'
import { EmptyState } from '../row/EmptyState'
import { groupHistoryByDay } from '@/lib/history-group'

export const HistoryModal = () => {
  const historyModalOpen = useValue(ui$.historyModalOpen)
  const bookmarks = useValue(history$.bookmarks)
  const activePageUrl = useActivePageUrl()
  const home = activePageUrl.includes('music.youtube.com') ? 'yt-music' : 'yt'
  const [query, setQuery] = useState('')

  const searched = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return bookmarks.filter((x) => {
      const pageType = getPageType(x.url)
      if (pageType?.home !== home) {
        return false
      }
      return !needle || (x.title ?? '').toLowerCase().includes(needle)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmarks, bookmarks.length, home, query])

  const sections = useMemo(() => groupHistoryByDay(searched), [searched])

  const close = () => {
    setQuery('')
    ui$.historyModalOpen.set(false)
  }

  return nIf(
    historyModalOpen,
    <BaseModal onClose={close}>
      <View className="mt-3 mb-4 px-2 flex-row items-center justify-between">
        <View className="flex-row items-baseline">
          <NouText className="font-semibold text-lg">{t('modals.history')}</NouText>
          <NouText className="text-sm text-gray-400 pl-4"></NouText>
        </View>
        {nIf(
          searched.length,
          <NouButton
            variant="outline"
            size="1"
            onPress={() => {
              // Only what the list actually shows: the other home's history is
              // filtered out of view, and clearing it too would be a surprise.
              const cleared = searched
              const clearedIds = new Set(cleared.map((x) => x.id))
              history$.bookmarks.set(history$.bookmarks.get().filter((x) => !clearedIds.has(x.id)))
              ui$.historyModalOpen.set(false)
              showUndoToast(t('history.cleared'), () => history$.restoreHistory(cleared))
            }}
          >
            {t('buttons.clear')}
          </NouButton>,
        )}
      </View>
      {nIf(
        bookmarks.length > 0,
        <SearchField value={query} onChangeText={setQuery} className="mx-2" />,
      )}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <HistoryItem bookmark={item} />}
        renderSectionHeader={({ section }) => (
          <View className="px-4 pb-1 pt-3">
            <NouText className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
              {t(section.titleKey)}
            </NouText>
          </View>
        )}
        // Sticky headers on a translucent sheet read as a floating strip.
        stickySectionHeadersEnabled={false}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          query.trim() ? (
            <EmptyState
              icon="search-off"
              title={t('empty.search', { query: query.trim() })}
              actionLabel={t('empty.clearSearch')}
              onAction={() => setQuery('')}
            />
          ) : (
            <EmptyState
              icon="history"
              title={t('empty.history')}
              hint={t('empty.historyHint')}
              actionLabel={t('empty.browse')}
              onAction={close}
            />
          )
        }
      />
    </BaseModal>,
  )
}
