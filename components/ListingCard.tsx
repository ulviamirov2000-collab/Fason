'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type MockListing = {
  id: string
  title_az: string
  title_ru: string
  price: number
  brand: string
  condition: 'new' | 'good' | 'fair'
  images: string[]
  seller: {
    name: string
    avatar_url?: string | null
  }
  rotation?: number
  views?: number
  basket_count?: number
}

const conditionConfig = {
  new:  { color: '#00E5CC', label_az: 'Yeni',  label_ru: 'Новый'   },
  good: { color: '#FF9500', label_az: 'Yaxşı', label_ru: 'Хорошее' },
  fair: { color: '#FF2D78', label_az: 'Orta',  label_ru: 'Среднее' },
}

export default function ListingCard({
  listing,
  lang = 'AZ',
}: {
  listing: MockListing
  lang?: 'AZ' | 'RU'
}) {
  const router = useRouter()
  const [liked, setLiked] = useState(false)
  const cond = conditionConfig[listing.condition]
  const title = lang === 'AZ' ? listing.title_az : listing.title_ru

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:shadow-md"
      style={{
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
      }}
    >
      {/* Image area — entire image links to listing */}
      <Link href={`/listing/${listing.id}`} className="block relative w-full aspect-[3/4] bg-gray-100 flex-shrink-0">
        {listing.images[0] ? (
          <Image
            src={listing.images[0]}
            alt={title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-100 to-yellow-100">
            <span className="text-4xl">👗</span>
          </div>
        )}

        {/* Condition badge — top left */}
        <div
          className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-white text-[10px] font-bold"
          style={{ backgroundColor: cond.color }}
        >
          {lang === 'AZ' ? cond.label_az : cond.label_ru}
        </div>

        {/* Heart button — top right */}
        <button
          onClick={(e) => {
            e.preventDefault()
            setLiked(!liked)
          }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center transition-transform hover:scale-110 active:scale-90"
          aria-label="Like"
        >
          {liked ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#FF2D78">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#FF2D78" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          )}
        </button>
      </Link>

      {/* Card body */}
      <div className="p-3 flex flex-col flex-1">
        {/* Price */}
        <Link href={`/listing/${listing.id}`} className="block">
          <p className="font-bold text-lg leading-tight" style={{ color: '#FF2D78' }}>
            {listing.price} ₼
          </p>
        </Link>

        {/* Title — 2 lines max */}
        <Link href={`/listing/${listing.id}`} className="block mt-1">
          <p className="text-sm text-gray-900 line-clamp-2 leading-snug">{title}</p>
        </Link>

        {/* Seller row */}
        <Link href={`/listing/${listing.id}`} className="flex items-center gap-1.5 mt-2">
          <div
            className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-400 to-yellow-400 overflow-hidden flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
          >
            {listing.seller.avatar_url ? (
              <Image src={listing.seller.avatar_url} alt={listing.seller.name} width={20} height={20} className="object-cover w-full h-full" unoptimized />
            ) : (
              listing.seller.name[0]
            )}
          </div>
          <span className="text-xs text-gray-400 truncate">{listing.seller.name}</span>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Al button */}
        <button
          onClick={(e) => {
            e.preventDefault()
            router.push('/order/' + listing.id)
          }}
          className="mt-3 w-full py-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 active:opacity-75"
          style={{ backgroundColor: '#FF2D78' }}
        >
          ✦ Al
        </button>
      </div>
    </div>
  )
}
