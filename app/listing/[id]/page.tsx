import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import ListingClient from './ListingClient'

const BASE_URL = 'https://fason-five.vercel.app'

// Server-side client (uses public anon key — same as browser client but runs on server)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const { data } = await getSupabase()
    .from('listings')
    .select('title_az, price, brand, size, condition, images, description_az')
    .eq('id', id)
    .single()

  if (!data) return { title: 'Elan tapılmadı | FASON' }

  const title = `${data.title_az} — ${data.price} AZN | FASON`
  const description = [
    data.title_az,
    data.brand,
    data.size ? `ölçü ${data.size}` : null,
    data.condition ? `${data.condition} vəziyyətdə` : null,
    'FASON-da al.',
  ].filter(Boolean).join(', ')

  const image = data.images?.[0] ?? `${BASE_URL}/fasonicon.png`

  return {
    title,
    description,
    openGraph: {
      title: `${data.title_az} — ${data.price} AZN`,
      description,
      images: [{ url: image }],
      type: 'website',
      siteName: 'FASON',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${data.title_az} — ${data.price} AZN`,
      images: [image],
    },
  }
}

export default async function ListingPage({ params }: Props) {
  const { id } = await params

  // Fetch for JSON-LD structured data (Next.js deduplicates this with generateMetadata's fetch)
  const { data: listing } = await getSupabase()
    .from('listings')
    .select('id, title_az, price, brand, description_az, images, status')
    .eq('id', id)
    .single()

  const jsonLd = listing
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: listing.title_az,
        ...(listing.images?.[0] ? { image: listing.images[0] } : {}),
        ...(listing.description_az ? { description: listing.description_az } : {}),
        ...(listing.brand ? { brand: { '@type': 'Brand', name: listing.brand } } : {}),
        offers: {
          '@type': 'Offer',
          price: listing.price,
          priceCurrency: 'AZN',
          availability:
            listing.status === 'active'
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          url: `${BASE_URL}/listing/${listing.id}`,
        },
      }
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ListingClient id={id} />
    </>
  )
}
