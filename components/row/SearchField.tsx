import { View, TextInput, Pressable } from 'react-native'
import MaterialIcons from '@react-native-vector-icons/material-icons'
import { useTwColor } from '@/lib/theme'
import { t } from 'i18next'

/*
 * One search field for every list. It appears only when there is something to
 * search, so a list with three bookmarks is not wearing a search bar.
 */
export const SearchField: React.FC<{
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  className?: string
}> = ({ value, onChangeText, placeholder, className }) => {
  const tw = useTwColor()

  return (
    <View
      className={`mx-2 mb-2 flex-row items-center gap-2 rounded-xl bg-zinc-200/60 px-3 dark:bg-zinc-800/70 ${className ?? ''}`}
    >
      <MaterialIcons name="search" size={18} color={tw('zinc-400')} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? t('search.placeholder')}
        placeholderTextColor={tw('zinc-400')}
        accessibilityLabel={placeholder ?? t('search.placeholder')}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        className="h-10 flex-1 text-[15px] text-zinc-900 dark:text-zinc-100"
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel={t('buttons.clear')}
          hitSlop={8}
          className="h-7 w-7 items-center justify-center rounded-full active:bg-black/[0.06] dark:active:bg-white/[0.1]"
        >
          <MaterialIcons name="close" size={16} color={tw('zinc-400')} />
        </Pressable>
      ) : null}
    </View>
  )
}
