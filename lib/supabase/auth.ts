import { openBrowser } from '@/lib/open-browser'
import { fetchWebAuthLink } from '@/lib/query'
import { getSupabase } from './client'

const DELETE_ACCOUNT_URL = 'https://noutube.inks.page/auth/app/delete-account'

export const signOut = () => getSupabase().auth.signOut({ scope: 'local' })

export const openDeleteAccount = async (accessToken: string) => {
  const { token } = await fetchWebAuthLink(accessToken)
  const url = token ? `${DELETE_ACCOUNT_URL}?t=${encodeURIComponent(token)}` : DELETE_ACCOUNT_URL
  await openBrowser(url)
}

export const onReceiveAuthUrl = (url: string) => {
  const token = new URL(url).searchParams.get('t')
  if (token) {
    // https://github.com/orgs/supabase/discussions/27181#discussioncomment-10986267
    getSupabase().auth.verifyOtp({
      token_hash: token,
      type: 'email',
    })
  }
}
