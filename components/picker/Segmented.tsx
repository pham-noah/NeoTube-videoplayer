import { View, Pressable } from 'react-native'
import { NouText } from '../NouText'
import { clsx, isIos } from '@/lib/utils'

export const Segmented: React.FC<{
  options: string[]
  selectedIndex: number
  size?: 1 | 2
  onChange: (index: number) => void
}> = ({ options, selectedIndex, size = 2, onChange }) => {
  return (
    <View
      accessibilityRole="tablist"
      className="flex-row rounded-field border border-black/[0.06] bg-black/[0.04] p-1 dark:border-white/10 dark:bg-white/[0.08]"
    >
      {options.map((tab, index) => {
        const active = index === selectedIndex
        return (
          <Pressable
            key={tab}
            onPress={() => onChange(index)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab}
            className={clsx(
              size === 1 ? 'px-3 py-1.5' : 'px-4 py-2',
              active ? 'bg-accent-600 rounded-chip' : 'bg-transparent',
              !isIos && index === 0 && 'rounded-l-chip',
              !isIos && index === options.length - 1 && 'rounded-r-chip',
            )}
          >
            <NouText
              className={clsx(
                'font-medium',
                size === 1 && 'text-label',
                active ? 'text-white' : 'text-zinc-600 dark:text-zinc-300',
              )}
            >
              {tab}
            </NouText>
          </Pressable>
        )
      })}
    </View>
  )
}
