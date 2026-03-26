'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ChatWindow from '@/components/ChatWindow'

type Conversation = {
  id: string
  listing_title: string
  listing_price: number
  other_user: string
  last_message: string
  unread: number
  time: string
}

const mockConversations: Conversation[] = [
  {
    id: 'c1',
    listing_title: 'Zara qırmızı palto',
    listing_price: 45,
    other_user: 'Kamran',
    last_message: 'Hələ satışdadır?',
    unread: 2,
    time: '14:32',
  },
  {
    id: 'c2',
    listing_title: 'Nike ağ krossovka',
    listing_price: 70,
    other_user: 'Günel',
    last_message: 'Razıyam, nə vaxt görüşə bilərik?',
    unread: 0,
    time: 'Dünən',
  },
  {
    id: 'c3',
    listing_title: 'H&M gödəkçə',
    listing_price: 30,
    other_user: 'Leyla',
    last_message: 'Endirim edə bilərsinizmi?',
    unread: 1,
    time: 'Dünən',
  },
]

const mockMessages = [
  { id: 'm1', sender_id: 'other', text: 'Salam! Hələ satışdadır?', created_at: '2024-01-15T14:30:00Z' },
  { id: 'm2', sender_id: 'me', text: 'Bəli, hələ satışdadır!', created_at: '2024-01-15T14:31:00Z' },
  { id: 'm3', sender_id: 'other', text: 'Hələ satışdadır?', created_at: '2024-01-15T14:32:00Z' },
]

export default function MessagesPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [activeConv, setActiveConv] = useState<string | null>('c1')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/auth')
      else setAuthChecked(true)
    })
  }, [router])

  if (!authChecked) return null

  const active = mockConversations.find((c) => c.id === activeConv)

  return (
    <main className="max-w-5xl mx-auto px-4 py-6" style={{ height: 'calc(100vh - 65px)' }}>
      <div className="flex gap-4 h-full">
        {/* Sidebar */}
        <div
          className={`w-full sm:w-80 flex-shrink-0 flex flex-col rounded-2xl overflow-hidden ${activeConv ? 'hidden sm:flex' : 'flex'}`}
          style={{ border: '2px solid #1a1040', backgroundColor: 'white' }}
        >
          <div
            className="px-4 py-3 border-b-2"
            style={{ borderColor: '#1a1040', backgroundColor: '#FAF7F2' }}
          >
            <h2
              className="font-bold text-base"
              style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}
            >
              Mesajlar
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {mockConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConv(conv.id)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 border-b border-gray-100"
                style={activeConv === conv.id ? { backgroundColor: '#FFF0F5' } : {}}
              >
                <div
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-yellow-400 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-0.5"
                  style={{ border: '2px solid #1a1040' }}
                >
                  {conv.other_user[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm truncate" style={{ color: '#1a1040' }}>
                      {conv.other_user}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{conv.time}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{conv.listing_title}</p>
                  <p className="text-xs text-gray-400 truncate">{conv.last_message}</p>
                </div>
                {conv.unread > 0 && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: '#FF2D78' }}
                  >
                    {conv.unread}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat window */}
        {active ? (
          <div className="flex-1 flex flex-col min-h-0">
            <ChatWindow
              listingTitle={active.listing_title}
              listingPrice={active.listing_price}
              currentUserId="me"
              otherUserName={active.other_user}
              messages={mockMessages}
            />
          </div>
        ) : (
          <div
            className="hidden sm:flex flex-1 items-center justify-center rounded-2xl"
            style={{ border: '2px solid #ccc', backgroundColor: 'white' }}
          >
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-sm">Söhbət seç</p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
