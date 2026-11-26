import { Text, type TextProps } from 'react-native'
import { resolveTextClass } from '@/lib/text-class'

// The base colours mirror `text.primary` in lib/colors.ts: one neutral family on
// both schemes. They are passed as the resolve inputs, not merged into the
// caller's className, so a caller's own colour still wins (see lib/text-class).
export const NouText: React.FC<TextProps> = ({ className, ...rest }) => (
  <Text className={resolveTextClass('text-zinc-900', 'dark:text-zinc-100', className)} {...rest} />
)
