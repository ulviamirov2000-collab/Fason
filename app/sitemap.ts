import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const BASE_URL = 'https://fason-five.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: listings } = await supabase
    .from('listings')
    .select('id, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1000)

  const listingEntries: MetadataRoute.Sitemap = (listings ?? []).map((l) => ({
    url: `${BASE_URL}/listing/${l.id}`,
    lastModified: new Date(l.created_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/auth`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/sell`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...listingEntries,
  ]
}
