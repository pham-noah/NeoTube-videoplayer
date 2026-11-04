import { Pressable, View } from 'react-native'
import MaterialIcons from '@react-native-vector-icons/material-icons'
import { NouText } from '../NouText'
import { accentColors, accents, type Accent } from '@/lib/accent'

export const AccentDots: React.FC<{
  value: Accent
  labels: Record<Accent, string>
  onChange: (accent: Accent) => void
}> = ({ value, labels, onChange }) => (
  <View>
    <View className="flex-row items-center gap-3" accessibilityRole="radiogroup">
      {accents.map((accent) => {
        const selected = accent === value
        return (
          <Pressable
            key={accent}
            onPress={() => onChange(accent)}
            accessibilityRole="radio"
            accessibilityLabel={labels[accent]}
            accessibilityState={{ selected }}
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ borderWidth: 2, borderColor: selected ? accentColors[accent] : 'transparent' }}
          >
            <View
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: accentColors[accent] }}
            >
              {selected ? <MaterialIcons name="check" size={18} color="white" /> : null}
            </View>
          </Pressable>
        )
      })}
    </View>
    <NouText className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{labels[value]}</NouText>
  </View>
)
