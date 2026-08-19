export type Scalar = string | number | boolean | null

export type FieldValue = Scalar | string[] | undefined

export type TranslationEntry = Record<string, FieldValue>

export interface AdminDocument {
  id: string
  order?: number
  createdAt?: string
  updatedAt?: string
  translations?: Record<string, TranslationEntry>
  [key: string]: unknown
}

export interface AdminLocale extends AdminDocument {
  code: string
  flagCode: string
  enabled: boolean
}

export interface AdminPersonTranslation extends TranslationEntry {
  aboutParagraphs: string[]
  headline: string
}

export interface AdminPerson extends AdminDocument {
  givenName: string
  familyName: string
  email: string
  phone: string
  linkedin: string
  github: string
  affiliation: string
  country: string
  city: string
  photo: string
  resumes: Record<string, string>
  translations: Record<string, AdminPersonTranslation>
}

export interface ProfileTranslation extends TranslationEntry {
  subtitles: string[]
  tagline: string
}

export interface AdminProfile extends AdminDocument {
  translations: Record<string, ProfileTranslation>
  createdAt?: string
  updatedAt?: string
}

export interface ReorderEntry {
  id: string
  order: number
}

export interface PresignRequest {
  filename: string
  contentType: string
  size: number
}

export interface PresignResponse {
  url: string
  key: string
  expiresIn: number
}

export interface AssetObject {
  key: string
  size: number
  lastModified: string
}

export interface ApiErrorBody {
  statusCode: number
  error: string
  message: string | string[]
  path: string
  timestamp: string
  details?: Record<string, unknown>
}

export interface HealthBody {
  status: string
}

export type OwnerStatus = 'draft' | 'published' | 'suspended'

export type ConsentMode = 'measurement' | 'enhanced'

export interface SlugAvailability {
  slug: string
  available: boolean
  reason: string | null
}

export interface OwnerRecord {
  id: string
  slug: string
  email: string | null
  displayName: string | null
  status: OwnerStatus
  consentMode: ConsentMode
  plan: string
  publishedAt: string | null
  assetPrefix?: string
}
