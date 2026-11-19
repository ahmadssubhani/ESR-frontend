export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          phone: string | null
          location: string | null
          image_url: string | null
          avatar_url: string | null
          registration_code: string | null
          role: 'user' | 'restaurant' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
        Relationships: []
      }
      categories: {
        Row: { id: string; name: string; created_at: string }
        Insert: { name: string }
        Update: { name?: string }
        Relationships: []
      }
      restaurants: {
        Row: {
          id: string
          owner_id: string | null
          name: string
          description: string | null
          address: string | null
          city: string | null
          country: string | null
          zip_code: string | null
          phone_number: string | null
          email: string | null
          website: string | null
          opening_hours: string | null
          price_level: 'LOW' | 'MEDIUM' | 'HIGH' | null
          category_id: string | null
          restaurant_type: string | null
          lat: number | null
          lng: number | null
          google_place_id: string | null
          source: string | null
          image_url: string | null
          logo_url: string | null
          cover_url: string | null
          tags: string[]
          is_featured: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['restaurants']['Row']> & {
          name: string
        }
        Update: Partial<Database['public']['Tables']['restaurants']['Row']>
        Relationships: [
          {
            foreignKeyName: 'restaurants_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'restaurants_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      offers: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          description: string | null
          original_price: number
          discounted_price: number
          image_url: string | null
          valid_from: string
          valid_till: string
          approval_status: boolean
          is_bumper: boolean
          is_redeemable: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['offers']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['offers']['Row']>
        Relationships: [
          {
            foreignKeyName: 'offers_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: false
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          },
        ]
      }
      coupons: {
        Row: {
          id: string
          offer_id: string
          code: string
          valid_from: string | null
          valid_till: string | null
          active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['coupons']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['coupons']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'coupons_offer_id_fkey'
            columns: ['offer_id']
            isOneToOne: false
            referencedRelation: 'offers'
            referencedColumns: ['id']
          },
        ]
      }
      user_coupons: {
        Row: {
          id: string
          user_id: string
          coupon_id: string
          offer_id: string
          used_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_coupons']['Row'], 'id' | 'used_at'>
        Update: never
        Relationships: [
          {
            foreignKeyName: 'user_coupons_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_coupons_coupon_id_fkey'
            columns: ['coupon_id']
            isOneToOne: false
            referencedRelation: 'coupons'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_coupons_offer_id_fkey'
            columns: ['offer_id']
            isOneToOne: false
            referencedRelation: 'offers'
            referencedColumns: ['id']
          },
        ]
      }
      user_offers: {
        Row: { id: string; user_id: string; offer_id: string; created_at: string }
        Insert: { user_id: string; offer_id: string }
        Update: never
        Relationships: [
          {
            foreignKeyName: 'user_offers_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_offers_offer_id_fkey'
            columns: ['offer_id']
            isOneToOne: false
            referencedRelation: 'offers'
            referencedColumns: ['id']
          },
        ]
      }
      user_restaurants: {
        Row: { id: string; user_id: string; restaurant_id: string; created_at: string }
        Insert: { user_id: string; restaurant_id: string; id?: string; created_at?: string }
        Update: never
        Relationships: [
          {
            foreignKeyName: 'user_restaurants_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: false
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_restaurants_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      reviews: {
        Row: {
          id: string
          user_id: string | null
          restaurant_id: string
          offer_id: string | null
          comment: string | null
          rating_taste: number | null
          rating_ambiance: number | null
          rating_quality: number | null
          rating_money_value: number | null
          rating_overall: number | null
          tags: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['reviews']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['reviews']['Row']>
        Relationships: [
          {
            foreignKeyName: 'reviews_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reviews_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: false
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reviews_offer_id_fkey'
            columns: ['offer_id']
            isOneToOne: false
            referencedRelation: 'offers'
            referencedColumns: ['id']
          },
        ]
      }
      review_images: {
        Row: { id: string; review_id: string; image_url: string; created_at: string }
        Insert: { review_id: string; image_url: string }
        Update: never
        Relationships: [
          {
            foreignKeyName: 'review_images_review_id_fkey'
            columns: ['review_id']
            isOneToOne: false
            referencedRelation: 'reviews'
            referencedColumns: ['id']
          },
        ]
      }
      review_likes: {
        Row: { user_id: string; review_id: string; created_at: string }
        Insert: { user_id: string; review_id: string }
        Update: never
        Relationships: [
          {
            foreignKeyName: 'review_likes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'review_likes_review_id_fkey'
            columns: ['review_id']
            isOneToOne: false
            referencedRelation: 'reviews'
            referencedColumns: ['id']
          },
        ]
      }
      review_comments: {
        Row: {
          id: string
          review_id: string
          user_id: string
          body: string
          created_at: string
        }
        Insert: { review_id: string; user_id: string; body: string; id?: string; created_at?: string }
        Update: never
        Relationships: [
          {
            foreignKeyName: 'review_comments_review_id_fkey'
            columns: ['review_id']
            isOneToOne: false
            referencedRelation: 'reviews'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'review_comments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      posts: {
        Row: {
          id: string
          author_id: string
          restaurant_id: string
          image_url: string
          rating: number
          caption: string
          created_at: string
        }
        Insert: {
          author_id: string
          restaurant_id: string
          image_url: string
          rating: number
          caption: string
          id?: string
          created_at?: string
        }
        Update: never
        Relationships: [
          {
            foreignKeyName: 'posts_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'posts_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: false
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          },
        ]
      }
      post_likes: {
        Row: { post_id: string; user_id: string; created_at: string }
        Insert: { post_id: string; user_id: string; created_at?: string }
        Update: never
        Relationships: [
          {
            foreignKeyName: 'post_likes_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'post_likes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      post_comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          body: string
          created_at: string
        }
        Insert: { post_id: string; user_id: string; body: string; id?: string; created_at?: string }
        Update: never
        Relationships: [
          {
            foreignKeyName: 'post_comments_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'posts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'post_comments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      restaurant_views: {
        Row: { id: number; user_id: string; restaurant_id: string; viewed_at: string }
        Insert: { user_id: string; restaurant_id: string; viewed_at?: string }
        Update: never
        Relationships: [
          {
            foreignKeyName: 'restaurant_views_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: false
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'restaurant_views_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string
          actor_id: string | null
          type: 'voucher' | 'like' | 'comment'
          entity_id: string | null
          created_at: string
          read_at: string | null
        }
        Insert: {
          recipient_id: string
          type: 'voucher' | 'like' | 'comment'
          actor_id?: string | null
          entity_id?: string | null
          id?: string
          created_at?: string
          read_at?: string | null
        }
        Update: { read_at?: string | null }
        Relationships: [
          {
            foreignKeyName: 'notifications_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_recipient_id_fkey'
            columns: ['recipient_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      admin_ads: {
        Row: {
          id: string
          title: string
          category: 'S' | 'G' | 'D'
          expiry: string | null
          deeplink: string | null
          image_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['admin_ads']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['admin_ads']['Row']>
        Relationships: []
      }
      application_versions: {
        Row: {
          id: string
          version: number
          is_update_version: boolean
          link_to_latest_version: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['application_versions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['application_versions']['Insert']>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_coupon: {
        Args: { p_user_id: string; p_coupon_code: string; p_offer_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Restaurant = Database['public']['Tables']['restaurants']['Row']
export type Offer = Database['public']['Tables']['offers']['Row']
export type Coupon = Database['public']['Tables']['coupons']['Row']
export type UserCoupon = Database['public']['Tables']['user_coupons']['Row']
export type UserOffer = Database['public']['Tables']['user_offers']['Row']
export type Review = Database['public']['Tables']['reviews']['Row']
export type ReviewImage = Database['public']['Tables']['review_images']['Row']
export type ReviewComment = Database['public']['Tables']['review_comments']['Row']
export type FeedPostRow = Database['public']['Tables']['posts']['Row']
export type AdminAd = Database['public']['Tables']['admin_ads']['Row']
export type ApplicationVersion = Database['public']['Tables']['application_versions']['Row']

export type OfferWithRestaurant = Offer & {
  restaurants: Restaurant & { categories: Category | null }
  reviews: Review[]
  user_coupons: UserCoupon[]
}

export type ReviewWithUser = Review & {
  profiles: Pick<Profile, 'full_name' | 'image_url'> | null
  review_images: ReviewImage[]
}
