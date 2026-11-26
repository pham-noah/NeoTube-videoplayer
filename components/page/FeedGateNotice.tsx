import { Pressable, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useValue } from '@legendapp/state/react'
import MaterialIcons from '@react-native-vector-icons/material-icons'
import { NouText } from '../NouText'
import { NouButton } from '../button/NouButton'
import { NouLink } from '../link/NouLink'
import { useTwColor } from '@/lib/theme'
import { dismissFeedGate, feedGate$ } from '@/states/feed-gate'

const HISTORY_URL = 'https://www.youtube.com/feed/history'

/*
 * The feed's two dead ends, said out loud.
 *
 * Dismissing YouTube's cookie sheet without personalisation leaves a home page
 * with no recommendations at all -- the same blank screen a failed load gives.
 * The consent case is answered by clicking YouTube's own buttons (the choice is
 * still the user's; the app only finds them), the history case by opening the
 * page where the switch lives.
 */
export function FeedGateNotice({ onConsent }: { onConsent: (choice: 'accept' | 'reject') => void }) {
  const { t } = useTranslation()
  const tw = useTwColor()
  const consent = useValue(feedGate$.consent)
  const empty = useValue(feedGate$.empty)
  const dismissed = useValue(feedGate$.dismissed)

  if (dismissed || (!consent && !empty)) {
    return null
  }

  return (
    <View className="gap-2 border-b border-zinc-200 bg-zinc-100 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <View className="flex-row items-start gap-3">
        <MaterialIcons
          name={consent ? 'cookie' : 'info-outline'}
          size={18}
          color={tw('zinc-500')}
        />
        <View className="flex-1">
          <NouText className="text-sm font-medium">
            {consent ? t('feedGate.consentTitle') : t('feedGate.emptyTitle')}
          </NouText>
          <NouText className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {consent ? t('feedGate.consentBody') : t('feedGate.emptyBody')}
          </NouText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('menus.close')}
          hitSlop={8}
          onPress={dismissFeedGate}
        >
          <MaterialIcons name="close" size={18} color={tw('zinc-500')} />
        </Pressable>
      </View>
      {consent ? (
        <View className="flex-row items-center gap-2">
          <NouButton size="1" variant="outline" onPress={() => onConsent('reject')}>
            {t('feedGate.reject')}
          </NouButton>
          <NouButton size="1" onPress={() => onConsent('accept')}>
            {t('feedGate.accept')}
          </NouButton>
        </View>
      ) : (
        <View className="flex-row items-center gap-4">
          <NouLink href={HISTORY_URL} className="text-sm text-blue-600 underline dark:text-blue-400">
            {t('feedGate.openHistory')}
          </NouLink>
        </View>
      )}
    </View>
  )
}
