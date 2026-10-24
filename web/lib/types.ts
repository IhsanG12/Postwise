// Database row types for Postwise.
// Keep in sync with planning/migrations/*.sql.

export type PlanType = 'free' | 'creator' | 'pro'
export type JobStatus = 'processing' | 'complete' | 'failed'
export type PlatformType = 'instagram' | 'tiktok'
export type FormatType = 'slideshow' | 'video'
export type AssetType = 'image' | 'video'

export interface User {
  id: string
  email: string
  plan: PlanType
  credits: number
  rerolls_remaining: number
  unlimited: boolean
  created_at: string
}

export interface Upload {
  id: string
  user_id: string
  url: string
  expires_at: string
  deleted_at: string | null
  created_at: string
}

export interface Job {
  id: string
  user_id: string
  status: JobStatus
  progress: number
  platform: PlatformType
  format: FormatType
  with_face: boolean
  selfie_upload_id: string | null
  count: number
  brief: string | null
  plan: unknown | null // PostPlan (lib/generation/plan.ts); jsonb in the DB
  error: string | null
  created_at: string
  completed_at: string | null
}

export interface Asset {
  id: string
  job_id: string
  type: AssetType
  url: string
  thumb_url: string | null
  width: number | null
  height: number | null
  scene_tag: string | null
  slide_text: string | null
  rerollable: boolean
  created_at: string
}

export interface Caption {
  id: string
  job_id: string
  text: string
  tone: string
}

export interface Sound {
  id: string
  job_id: string
  title: string
  meta: string | null
  platform: PlatformType
  open_url: string
}

// Convenience type for a fully-loaded job (as returned by GET /api/generations/{jobId})
export interface JobWithResults extends Job {
  assets: Asset[]
  captions: Caption[]
  sounds: Sound[]
}

// Supabase Database type — pass to createClient<Database>() for typed queries.
export type Database = {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'created_at'>
        Update: Partial<Omit<User, 'id'>>
        Relationships: []
      }
      uploads: {
        Row: Upload
        Insert: Omit<Upload, 'id' | 'created_at'>
        Update: Partial<Omit<Upload, 'id' | 'user_id'>>
        Relationships: []
      }
      jobs: {
        Row: Job
        Insert: Omit<Job, 'id' | 'created_at' | 'completed_at' | 'error' | 'plan'>
        Update: Partial<Omit<Job, 'id' | 'user_id'>>
        Relationships: []
      }
      assets: {
        Row: Asset
        Insert: Omit<Asset, 'id' | 'created_at'>
        Update: Partial<Omit<Asset, 'id' | 'job_id'>>
        Relationships: []
      }
      captions: {
        Row: Caption
        Insert: Omit<Caption, 'id'>
        Update: Partial<Omit<Caption, 'id' | 'job_id'>>
        Relationships: []
      }
      sounds: {
        Row: Sound
        Insert: Omit<Sound, 'id'>
        Update: Partial<Omit<Sound, 'id' | 'job_id'>>
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: {
      plan_type: PlanType
      job_status: JobStatus
      platform_type: PlatformType
      format_type: FormatType
      asset_type: AssetType
    }
    CompositeTypes: Record<never, never>
  }
}
