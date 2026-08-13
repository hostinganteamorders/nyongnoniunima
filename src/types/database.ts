export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'user'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'admin' | 'user'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'user'
          avatar_url?: string | null
          updated_at?: string
        }
      }
      applicants: {
        Row: {
          id: string
          user_id: string | null
          full_name: string
          email: string
          phone: string
          date_of_birth: string
          place_of_birth: string | null
          gender: string | null
          nim: string | null
          faculty: string | null
          study_program: string | null
          semester: number | null
          address: string
          city: string
          province: string
          height_cm: number
          weight_kg: number
          occupation: string
          education: string
          instagram: string | null
          tiktok: string | null
          facebook: string | null
          photo_url: string | null
          passport_photo_url: string | null
          fullbody_photo_url: string | null
          ktm_url: string | null
          ktp_url: string | null
          cv_url: string | null
          statement_letter_url: string | null
          essay: string | null
          consent: boolean
          status: 'pending' | 'verified' | 'rejected' | 'finalist'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          full_name: string
          email: string
          phone: string
          date_of_birth: string
          place_of_birth?: string | null
          gender?: string | null
          nim?: string | null
          faculty?: string | null
          study_program?: string | null
          semester?: number | null
          address: string
          city: string
          province: string
          height_cm?: number
          weight_kg?: number
          occupation?: string
          education?: string
          instagram?: string | null
          tiktok?: string | null
          facebook?: string | null
          photo_url?: string | null
          passport_photo_url?: string | null
          fullbody_photo_url?: string | null
          ktm_url?: string | null
          ktp_url?: string | null
          cv_url?: string | null
          statement_letter_url?: string | null
          essay?: string | null
          consent?: boolean
          status?: 'pending' | 'verified' | 'rejected' | 'finalist'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          full_name?: string
          email?: string
          phone?: string
          date_of_birth?: string
          place_of_birth?: string | null
          gender?: string | null
          nim?: string | null
          faculty?: string | null
          study_program?: string | null
          semester?: number | null
          address?: string
          city?: string
          province?: string
          height_cm?: number
          weight_kg?: number
          occupation?: string
          education?: string
          instagram?: string | null
          tiktok?: string | null
          facebook?: string | null
          photo_url?: string | null
          passport_photo_url?: string | null
          fullbody_photo_url?: string | null
          ktm_url?: string | null
          ktp_url?: string | null
          cv_url?: string | null
          statement_letter_url?: string | null
          essay?: string | null
          consent?: boolean
          status?: 'pending' | 'verified' | 'rejected' | 'finalist'
          updated_at?: string
        }
      }
      news: {
        Row: {
          id: string
          title: string
          slug: string
          content: string
          excerpt: string
          image_url: string | null
          author_id: string
          published: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          content: string
          excerpt: string
          image_url?: string | null
          author_id: string
          published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          content?: string
          excerpt?: string
          image_url?: string | null
          author_id?: string
          published?: boolean
          published_at?: string | null
          updated_at?: string
        }
      }
      gallery: {
        Row: {
          id: string
          title: string
          description: string | null
          image_url: string
          category: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          image_url: string
          category: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          image_url?: string
          category?: string
          created_at?: string
        }
      }
      events: {
        Row: {
          id: string
          title: string
          slug: string
          description: string
          date: string
          location: string
          category: string | null
          image_url: string | null
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description: string
          date: string
          location: string
          category?: string | null
          image_url?: string | null
          published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string
          date?: string
          location?: string
          category?: string | null
          image_url?: string | null
          published?: boolean
          updated_at?: string
        }
      }
      titleholders: {
        Row: {
          id: string
          tahun: number
          category: 'Juara Utama' | 'Wakil I' | 'Wakil II' | 'Harapan I' | 'Harapan II' | 'Berbakat' | 'Favorit' | 'Fotogenik' | 'Persahabatan' | 'Digital' | 'Duta Lingkungan' | 'Duta Sosial' | 'Duta Budaya' | 'Duta Bahasa' | 'Duta Seni' | 'Intelegensia' | 'Other'
          nyong_name: string
          noni_name: string
          faculty: string | null
          study_program: string | null
          region: string
          motto: string | null
          biography: string | null
          nyong_photo_url: string | null
          noni_photo_url: string | null
          nyong_instagram: string | null
          noni_instagram: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tahun: number
          category: 'Juara Utama' | 'Wakil I' | 'Wakil II' | 'Harapan I' | 'Harapan II' | 'Berbakat' | 'Favorit' | 'Fotogenik' | 'Persahabatan' | 'Digital' | 'Duta Lingkungan' | 'Duta Sosial' | 'Duta Budaya' | 'Duta Bahasa' | 'Duta Seni' | 'Intelegensia' | 'Other'
          nyong_name: string
          noni_name: string
          faculty?: string | null
          study_program?: string | null
          region: string
          motto?: string | null
          biography?: string | null
          nyong_photo_url?: string | null
          noni_photo_url?: string | null
          nyong_instagram?: string | null
          noni_instagram?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tahun?: number
          category?: 'Juara Utama' | 'Wakil I' | 'Wakil II' | 'Harapan I' | 'Harapan II' | 'Berbakat' | 'Favorit' | 'Fotogenik' | 'Persahabatan' | 'Digital' | 'Duta Lingkungan' | 'Duta Sosial' | 'Duta Budaya' | 'Duta Bahasa' | 'Duta Seni' | 'Intelegensia' | 'Other'
          nyong_name?: string
          noni_name?: string
          faculty?: string | null
          study_program?: string | null
          region?: string
          motto?: string | null
          biography?: string | null
          nyong_photo_url?: string | null
          noni_photo_url?: string | null
          nyong_instagram?: string | null
          noni_instagram?: string | null
          sort_order?: number
          updated_at?: string
        }
      }
      faculties: {
        Row: {
          id: string
          name: string
          code: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          created_at?: string
        }
      }
      study_programs: {
        Row: {
          id: string
          faculty_id: string
          name: string
          code: string
          created_at: string
        }
        Insert: {
          id?: string
          faculty_id: string
          name: string
          code: string
          created_at?: string
        }
        Update: {
          id?: string
          faculty_id?: string
          name?: string
          code?: string
          created_at?: string
        }
      }
      sponsors: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          website: string | null
          type: 'sponsor' | 'partner' | 'media'
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          website?: string | null
          type?: 'sponsor' | 'partner' | 'media'
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          website?: string | null
          type?: 'sponsor' | 'partner' | 'media'
          sort_order?: number
          updated_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          key: string
          value: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          updated_at?: string
        }
      }
      current_titleholders: {
        Row: {
          id: string
          title: string
          name: string
          faculty: string | null
          study_program: string | null
          photo_url: string | null
          instagram: string | null
          biography: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          name: string
          faculty?: string | null
          study_program?: string | null
          photo_url?: string | null
          instagram?: string | null
          biography?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          name?: string
          faculty?: string | null
          study_program?: string | null
          photo_url?: string | null
          instagram?: string | null
          biography?: string | null
          sort_order?: number
          updated_at?: string
        }
      }
      hall_of_fame: {
        Row: {
          id: string
          tahun: number
          nyong_name: string
          noni_name: string
          nyong_photo_url: string | null
          noni_photo_url: string | null
          kabupaten_kota: string
          category: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tahun: number
          nyong_name: string
          noni_name: string
          nyong_photo_url?: string | null
          noni_photo_url?: string | null
          kabupaten_kota: string
          category?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tahun?: number
          nyong_name?: string
          noni_name?: string
          nyong_photo_url?: string | null
          noni_photo_url?: string | null
          kabupaten_kota?: string
          category?: string | null
          updated_at?: string
        }
      }
      alumni_achievements: {
        Row: {
          id: string
          alumni_name: string
          achievement_type: string
          description: string
          tahun: string
          photo_url: string | null
          instagram: string | null
          current_position: string | null
          organization: string | null
          created_at: string
        }
        Insert: {
          id?: string
          alumni_name: string
          achievement_type: string
          description: string
          tahun: string
          photo_url?: string | null
          instagram?: string | null
          current_position?: string | null
          organization?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          alumni_name?: string
          achievement_type?: string
          description?: string
          tahun?: string
          photo_url?: string | null
          instagram?: string | null
          current_position?: string | null
          organization?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
