import Image from 'next/image'
import FilterBar from '@/components/FilterBar'
import ListingCard, { MockListing } from '@/components/ListingCard'

const mockListings: MockListing[] = [
  {
    id: '1',
    title_az: 'Zara qırmızı palto',
    title_ru: 'Красное пальто Zara',
    price: 45,
    brand: 'Zara',
    condition: 'good',
    images: [],
    seller: { name: 'Aynur', avatar: '' },
    rotation: -1,
  },
  {
    id: '2',
    title_az: 'Nike ağ krossovka',
    title_ru: 'Белые кроссовки Nike',
    price: 70,
    brand: 'Nike',
    condition: 'new',
    images: [],
    seller: { name: 'Kamran', avatar: '' },
    rotation: 1,
  },
  {
    id: '3',
    title_az: 'H&M gödəkçə',
    title_ru: 'Куртка H&M',
    price: 30,
    brand: 'H&M',
    condition: 'fair',
    images: [],
    seller: { name: 'Günel', avatar: '' },
    rotation: -1,
  },
  {
    id: '4',
    title_az: 'Mango köynək',
    title_ru: 'Рубашка Mango',
    price: 22,
    brand: 'Mango',
    condition: 'good',
    images: [],
    seller: { name: 'Leyla', avatar: '' },
    rotation: 0,
  },
  {
    id: '5',
    title_az: 'Adidas idman şalvarı',
    title_ru: 'Спортивные штаны Adidas',
    price: 35,
    brand: 'Adidas',
    condition: 'new',
    images: [],
    seller: { name: 'Tural', avatar: '' },
    rotation: 1,
  },
  {
    id: '6',
    title_az: 'Pull&Bear çanta',
    title_ru: 'Сумка Pull&Bear',
    price: 28,
    brand: 'Pull&Bear',
    condition: 'good',
    images: [],
    seller: { name: 'Nigar', avatar: '' },
    rotation: -1,
  },
]

export default function HomePage() {
  return (
    <main>
      {/* Hero Section */}
      <section
        className="w-full flex flex-col items-center justify-center py-16 px-4 relative overflow-hidden"
        style={{ backgroundColor: '#1a1040', minHeight: '340px' }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: '#FF2D78', transform: 'translate(30%, -30%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: '#00E5CC', transform: 'translate(-30%, 30%)' }}
        />

        {/* Logo */}
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Image
            src="/fason-logo (2).png"
            alt="FASON"
            width={400}
            height={200}
            className="object-contain"
            priority
          />

          <p
            className="text-white text-center tracking-[0.25em]"
            style={{ fontFamily: 'var(--font-unbounded)', fontSize: '0.85rem' }}
          >
            DOLABINI PULA ÇEVİR
          </p>

          {/* Stats strip */}
          <div className="flex gap-6 mt-2">
            {[
              { num: '2.4K+', label_az: 'Elan' },
              { num: '800+', label_az: 'Satıcı' },
              { num: '12K+', label_az: 'İstifadəçi' },
            ].map((s) => (
              <div key={s.label_az} className="text-center">
                <div
                  className="text-xl font-bold"
                  style={{ color: '#FFE600', fontFamily: 'var(--font-unbounded)' }}
                >
                  {s.num}
                </div>
                <div className="text-white/50 text-xs">{s.label_az}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <FilterBar />

      {/* Listings Grid */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}
          >
            Son Elanlar
          </h2>
          <span className="text-sm text-gray-400">{mockListings.length} elan</span>
        </div>

        {/* Masonry-style grid */}
        <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
          {mockListings.map((listing) => (
            <div key={listing.id} className="break-inside-avoid">
              <ListingCard listing={listing} />
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
