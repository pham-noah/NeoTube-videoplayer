import { Pressable, ScrollView, View } from 'react-native'
import { NouText } from '../NouText'
import { BaseModal } from '../modal/BaseModal'
import type { Item } from '../menu/NouMenu'
import { isWeb } from '@/lib/utils'
import { hapticTick } from '@/lib/haptics'
import { t } from 'i18next'

/*
 * The same actions the row's menu offers, for a long press. A long press has no
 * anchor to hang a popover from, so it opens the sheet instead of trying to
 * place a menu under a finger that is already lifting.
 */
export const RowActionSheet: React.FC<{
  open: boolean
  onClose: () => void
  title?: string
  items: Item[]
}> = ({ open, onClose, title, items }) => {
  if (!open) {
    return null
  }

  return (
    <BaseModal onClose={onClose} useNativeModal={!isWeb} presentation="bottom">
      <View className="px-4 pb-2 pt-3">
        <View className="mb-2 flex-row items-center justify-between">
          <NouText className="flex-1 pr-3 text-xs uppercase tracking-[0.12em] text-zinc-500" numberOfLines={1}>
            {title ?? ''}
          </NouText>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('menus.close', 'Close')}
            className="h-9 w-9 items-center justify-center rounded-full active:bg-black/[0.06] dark:active:bg-white/[0.1]"
          >
            <NouText className="text-base text-zinc-400">✕</NouText>
          </Pressable>
        </View>
      </View>
      {/* flexGrow 0: inside a card sized by its content a flex-1 ScrollView
          collapses and silently cuts the last action off. */}
      <ScrollView style={{ flexGrow: 0, flexShrink: 1 }}>
        {items
          .filter((item) => !item.kind || item.kind === 'item')
          .map((item, index) => (
            <Pressable
              key={`${item.label}-${index}`}
              disabled={item.disabled}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => {
                hapticTick()
                onClose()
                item.handler()
              }}
              className="flex-row items-center gap-3 px-4 py-3 active:bg-black/[0.05] dark:active:bg-white/[0.08]"
            >
              {item.icon ? <View className="w-5 items-center">{item.icon}</View> : null}
              <NouText className="flex-1 text-base text-zinc-900 dark:text-zinc-100" numberOfLines={1}>
                {item.label}
              </NouText>
            </Pressable>
          ))}
      </ScrollView>
    </BaseModal>
  )
}
