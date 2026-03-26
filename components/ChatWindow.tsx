'use client'

import { useState, useRef, useEffect } from 'react'

type Message = {
  id: string
  sender_id: string
  text: string
  created_at: string
}

type ChatWindowProps = {
  listingTitle: string
  listingImage?: string
  listingPrice?: number
  currentUserId: string
  otherUserName: string
  messages: Message[]
  lang?: 'AZ' | 'RU'
}

export default function ChatWindow({
  listingTitle,
  listingImage,
  listingPrice,
  currentUserId,
  otherUserName,
  messages: initialMessages,
  lang = 'AZ',
}: ChatWindowProps) {
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = () => {
    if (!input.trim()) return
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender_id: currentUserId,
        text: input.trim(),
        created_at: new Date().toISOString(),
      },
    ])
    setInput('')
  }

  return (
    <div
      className="flex flex-col h-full rounded-2xl overflow-hidden"
      style={{ border: '2px solid #1a1040' }}
    >
      {/* Pinned listing header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b-2"
        style={{ backgroundColor: '#1a1040', borderColor: '#FF2D78' }}
      >
        <div className="w-10 h-10 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
          {listingImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listingImage} alt={listingTitle} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg">👗</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{listingTitle}</p>
          {listingPrice && (
            <p className="text-xs font-bold" style={{ color: '#FFE600' }}>
              {listingPrice} ₼
            </p>
          )}
        </div>
        <div className="text-xs text-white/50">{otherUserName}</div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" style={{ backgroundColor: '#FAF7F2' }}>
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            {lang === 'AZ' ? 'Mesaj yoxdur. Danışığa başla!' : 'Нет сообщений. Начни чат!'}
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[70%] px-3 py-2 rounded-2xl text-sm"
                style={
                  isMine
                    ? { backgroundColor: '#FF2D78', color: 'white', borderRadius: '18px 18px 4px 18px' }
                    : { backgroundColor: 'white', color: '#1a1040', border: '2px solid #1a1040', borderRadius: '18px 18px 18px 4px' }
                }
              >
                {msg.text}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-2 px-3 py-3 border-t-2"
        style={{ backgroundColor: 'white', borderColor: '#1a1040' }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={lang === 'AZ' ? 'Mesaj yaz...' : 'Написать сообщение...'}
          className="flex-1 rounded-full px-4 py-2 text-sm outline-none"
          style={{ border: '2px solid #1a1040' }}
        />
        <button
          onClick={send}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-transform hover:scale-110 active:scale-95"
          style={{ backgroundColor: '#FF2D78' }}
          aria-label="Send"
        >
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
