import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser / client-side Supabase client (singleton)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

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
          address: string | null
          is_seller: boolean
          is_banned: boolean
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
          basket_count: number
          created_at: string
        }
      }
      baskets: {
        Row: {
          id: string
          user_id: string
          listing_id: string
          created_at: string
        }
      }
      offers: {
        Row: {
          id: string
          listing_id: string
          buyer_id: string
          seller_id: string
          offered_price: number
          status: 'pending' | 'accepted' | 'rejected' | 'countered'
          counter_price: number | null
          created_at: string
        }
      }
      orders: {
        Row: {
          id: string
          listing_id: string
          buyer_id: string
          seller_id: string
          offer_id: string | null
          status: 'pending' | 'confirmed' | 'delivered' | 'cancelled'
          final_price: number
          delivery_needed: boolean
          delivery_address: string | null
          phone: string | null
          note: string | null
          is_seen: boolean
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
      comments: {
        Row: {
          id: string
          listing_id: string
          user_id: string
          text: string
          created_at: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          link: string | null
          is_read: boolean
          created_at: string
        }
      }
    }
  }
}

export type UserRow    = Database['public']['Tables']['users']['Row']
export type ListingRow = Database['public']['Tables']['listings']['Row']
export type MessageRow = Database['public']['Tables']['messages']['Row']
export type BasketRow  = Database['public']['Tables']['baskets']['Row']
export type OfferRow   = Database['public']['Tables']['offers']['Row']
export type OrderRow   = Database['public']['Tables']['orders']['Row']
export type CommentRow = Database['public']['Tables']['comments']['Row']
export type NotifRow   = Database['public']['Tables']['notifications']['Row']
