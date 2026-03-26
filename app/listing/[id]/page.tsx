import Link from 'next/link'

// Mock data for a single listing
const mockListing = {
  id: '1',
  title_az: 'Zara qırmızı palto',
  title_ru: 'Красное пальто Zara',
  description_az:
    'Zara markasından qırmızı palto. Az geyilib, əla vəziyyətdədir. Ölçüsü M, lakin L-ə də uyğun gəlir.',
  description_ru:
    'Красное пальто Zara. Мало ношеное, в отличном состоянии. Размер M, подходит и на L.',
  price: 45,
  brand: 'Zara',
  size: 'M',
  condition: 'good' as const,
  views: 142,
  images: [] as string[],
  seller: {
    id: 'u1',
    name: 'Aynur Həsənova',
    avatar: '',
    listings_count: 12,
    joined: '2024',
  },
}

const conditionMap = {
  new: { label: 'Yeni', color: '#00E5CC' },
  good: { label: 'Yaxşı', color: '#FF9500' },
  fair: { label: 'Orta', color: '#FF2D78' },
}

export default function ListingPage({ params }: { params: { id: string } }) {
  const listing = mockListing
  const cond = conditionMap[listing.condition]

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="flex flex-col gap-3">
          {/* Main image */}
          <div
            className="w-full aspect-[3/4] rounded-2xl bg-gradient-to-br from-pink-100 to-yellow-100 flex items-center justify-center"
            style={{ border: '2px solid #1a1040' }}
          >
            <span className="text-8xl">👗</span>
          </div>
          {/* Thumbnails */}
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="w-16 h-16 rounded-xl bg-gradient-to-br from-pink-50 to-yellow-50 flex items-center justify-center cursor-pointer transition-all hover:scale-105"
                style={{ border: i === 0 ? '2px solid #FF2D78' : '2px solid #ccc' }}
              >
                <span className="text-xl">👗</span>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4">
          {/* Title + price */}
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}
            >
              {listing.title_az}
            </h1>
            <div
              className="inline-block mt-2 px-4 py-1.5 rounded-full text-xl font-bold text-black"
              style={{ backgroundColor: '#FFE600', border: '2px solid #1a1040' }}
            >
              {listing.price} ₼
            </div>
          </div>

          {/* Chips row */}
          <div className="flex flex-wrap gap-2">
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ border: '2px solid #1a1040', backgroundColor: 'white' }}
            >
              {listing.brand}
            </span>
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ border: '2px solid #1a1040', backgroundColor: 'white' }}
            >
              {listing.size}
            </span>
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: cond.color, border: `2px solid ${cond.color}` }}
            >
              {cond.label}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 leading-relaxed">{listing.description_az}</p>

          {/* Views */}
          <p className="text-xs text-gray-400">👁 {listing.views} baxış</p>

          {/* Seller card */}
          <div
            className="flex items-center gap-3 p-4 rounded-2xl"
            style={{ border: '2px solid #1a1040', backgroundColor: 'white' }}
          >
            <div
              className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-yellow-400 flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
              style={{ border: '2px solid #1a1040' }}
            >
              {listing.seller.name[0]}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm" style={{ color: '#1a1040' }}>
                {listing.seller.name}
              </p>
              <p className="text-xs text-gray-500">
                {listing.seller.listings_count} elan · {listing.seller.joined}-dən
              </p>
            </div>
            <Link
              href={`/profile/${listing.seller.id}`}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:bg-gray-50"
              style={{ border: '2px solid #1a1040', color: '#1a1040' }}
            >
              Profil
            </Link>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col gap-3">
            <Link
              href="/messages"
              className="w-full py-3.5 rounded-2xl font-bold text-white text-center transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: '#FF2D78', border: '2px solid #1a1040', boxShadow: '3px 3px 0 #1a1040' }}
            >
              💬 Satıcıya yaz
            </Link>
            <button
              className="w-full py-3.5 rounded-2xl font-bold text-center transition-all hover:bg-gray-50"
              style={{ border: '2px solid #1a1040', color: '#1a1040', boxShadow: '3px 3px 0 #1a1040' }}
            >
              🤍 Bəyən
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
