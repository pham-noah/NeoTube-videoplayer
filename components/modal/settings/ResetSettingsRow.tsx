import { useState } from 'react'
import { t } from 'i18next'
import { SettingsActionRow } from './primitives'
import { resetSettings, restoreSettings } from '@/states/settings'
import { showUndoToast } from '@/states/undo-toast'
import { hapticError } from '@/lib/haptics'

/*
 * Settings can be changed on eight pages and nothing said which values had been
 * touched, so there was no way to get back to a known state short of
 * reinstalling. Two taps and an undo, the same shape as the queue's clear.
 */
export const ResetSettingsRow: React.FC = () => {
  const [armed, setArmed] = useState(false)

  return (
    <SettingsActionRow
      label={armed ? t('settings.resetAllConfirm') : t('settings.resetAll')}
      description={t('settings.resetAllBody')}
      icon="restart-alt"
      isLast
      onPress={() => {
        if (!armed) {
          setArmed(true)
          hapticError()
          return
        }
        setArmed(false)
        const snapshot = resetSettings()
        showUndoToast(t('settings.resetDone'), () => restoreSettings(snapshot))
      }}
    />
  )
}
