'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import MessagesUI from '@/components/MessagesUI'

export default function MessagesPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/auth'); return }
      setUserId(data.user.id)
      setAuthChecked(true)
    })
  }, [router])

  if (!authChecked || !userId) return null

  return (
    <main className="max-w-5xl mx-auto px-4 py-6" style={{ height: 'calc(100vh - 65px)' }}>
      <MessagesUI currentUserId={userId} />
    </main>
  )
}
