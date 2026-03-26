import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser / client-side Supabase client (singleton)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          phone: string | null
          full_name: string | null
          avatar_url: string | null
          is_seller: boolean
          created_at: string
        }
      }
      listings: {
        Row: {
          id: string
          seller_id: string
          title_az: string
          title_ru: string
          description_az: string | null
          description_ru: string | null
          price: number
          category: string | null
          size: string | null
          brand: string | null
          condition: 'new' | 'good' | 'fair'
          images: string[]
          status: 'active' | 'sold' | 'archived'
          views: number
          created_at: string
        }
      }
      orders: {
        Row: {
          id: string
          listing_id: string
          buyer_id: string
          seller_id: string
          status: 'pending' | 'confirmed' | 'delivered' | 'cancelled'
          amount: number
          created_at: string
        }
      }
      messages: {
        Row: {
          id: string
          listing_id: string
          sender_id: string
          receiver_id: string
          text: string
          is_read: boolean
          created_at: string
        }
      }
    }
  }
}

export type UserRow = Database['public']['Tables']['users']['Row']
export type ListingRow = Database['public']['Tables']['listings']['Row']
