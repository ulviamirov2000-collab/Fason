'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const BYPASS_PATHS = ['/onboarding', '/auth']

export default function OnboardingGate() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (BYPASS_PATHS.some(p => pathname.startsWith(p))) return

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      const cacheKey = `onboarding_${user.id}`
      if (typeof window !== 'undefined' && localStorage.getItem(cacheKey) === 'done') return

      const { data } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single()

      if (!data?.onboarding_completed) {
        router.replace('/onboarding')
      } else {
        if (typeof window !== 'undefined') {
          localStorage.setItem(cacheKey, 'done')
        }
      }
    })
  }, [pathname, router])

  return null
}
