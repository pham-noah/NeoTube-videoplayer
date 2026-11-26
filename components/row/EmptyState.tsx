import { View, Pressable } from 'react-native'
import MaterialIcons from '@react-native-vector-icons/material-icons'
import { NouText } from '../NouText'
import { useTwColor } from '@/lib/theme'

/*
 * An empty list used to be a sheet of blank space: no word for why it was
 * empty, no cue what fills it. One component for all of them, so Library,
 * History, Queue and search all answer the same way.
 */
export const EmptyState: React.FC<{
  icon: string
  title: string
  hint?: string
  actionLabel?: string
  onAction?: () => void
}> = ({ icon, title, hint, actionLabel, onAction }) => {
  const tw = useTwColor()

  return (
    <View className="items-center px-8 py-14">
      <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-zinc-200/70 dark:bg-zinc-800/70">
        <MaterialIcons name={icon as any} size={26} color={tw('zinc-400')} />
      </View>
      <NouText className="text-center text-base font-medium">{title}</NouText>
      {hint ? <NouText className="mt-1.5 text-center text-sm leading-5 text-gray-400">{hint}</NouText> : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          className="mt-5 rounded-full border border-gray-300 px-5 py-2 active:bg-black/[0.05] dark:border-gray-600 dark:active:bg-white/[0.08]"
        >
          <NouText className="text-sm">{actionLabel}</NouText>
        </Pressable>
      ) : null}
    </View>
  )
}
