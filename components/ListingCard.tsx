'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

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
    avatar: string
  }
  rotation?: number
}

const conditionConfig = {
  new: { dot: '#00E5CC', label_az: 'Yeni', label_ru: 'Новый' },
  good: { dot: '#FF9500', label_az: 'Yaxşı', label_ru: 'Хорошее' },
  fair: { dot: '#FF2D78', label_az: 'Orta', label_ru: 'Среднее' },
}

export default function ListingCard({
  listing,
  lang = 'AZ',
}: {
  listing: MockListing
  lang?: 'AZ' | 'RU'
}) {
  const [liked, setLiked] = useState(false)
  const rotation = listing.rotation ?? 0
  const cond = conditionConfig[listing.condition]
  const title = lang === 'AZ' ? listing.title_az : listing.title_ru

  return (
    <Link href={`/listing/${listing.id}`}>
      <div
        className="bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-xl"
        style={{
          border: '2px solid #1a1040',
          transform: `rotate(${rotation}deg)`,
        }}
      >
        {/* Image */}
        <div className="relative w-full aspect-[3/4] bg-gray-100">
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

          {/* Price badge */}
          <div
            className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold text-black"
            style={{ backgroundColor: '#FFE600', border: '1.5px solid #1a1040' }}
          >
            {listing.price} ₼
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="font-semibold text-sm text-gray-900 truncate">{title}</p>

          {/* Brand chip + condition dot */}
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: '#FAF7F2', border: '1px solid #1a1040' }}
            >
              {listing.brand}
            </span>
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: cond.dot }}
              title={lang === 'AZ' ? cond.label_az : cond.label_ru}
            />
            <span className="text-xs text-gray-500">
              {lang === 'AZ' ? cond.label_az : cond.label_ru}
            </span>
          </div>

          {/* Seller + heart */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <div
                className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-yellow-400 flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ border: '1.5px solid #1a1040' }}
              >
                {listing.seller.name[0]}
              </div>
              <span className="text-xs text-gray-500 truncate max-w-[80px]">
                {listing.seller.name}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault()
                setLiked(!liked)
              }}
              className="transition-transform hover:scale-125 active:scale-90"
              aria-label="Like"
            >
              {liked ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#FF2D78">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#FF2D78" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}
