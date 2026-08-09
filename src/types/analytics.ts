export interface AnalyticsPoint {
  date: string
  sessions: number
  visitors: number
}

export interface AnalyticsBreakdown {
  key: string
  count: number
}

export interface AnalyticsCard {
  key: string
  impressions: number
  clicks: number
  rate: number
}

export interface AnalyticsVitals {
  lcp: number | null
  cls: number | null
  inp: number | null
  ttfb: number | null
}

export interface AnalyticsDelta {
  sessions: number
  visitors: number
  dwellMs: number
  docs: number
}

export interface PortfolioTraffic {
  slug: string
  status: string
  sessions: number
  visitors: number
}

export interface PortfolioRow {
  id: string
  slug: string
  email: string | null
  displayName: string | null
  status: string
  createdAt: string | null
  publishedAt: string | null
  sessions: number
}

export interface AuditEntry {
  id: string
  actorSub: string
  actorEmail: string | null
  action: string
  targetSlug: string | null
  reason: string | null
  createdAt: string
}

export interface ErrorGroup {
  message: string
  count: number
  accounts: number
  firstSeen: string
  lastSeen: string
}

export interface StorageReport {
  dataMb: number
  indexMb: number
  ceilingMb: number
  share: number
  collections: AnalyticsBreakdown[]
}

export interface PlatformHealth {
  database: 'up' | 'down'
  errors: AnalyticsBreakdown[]
  errorGroups: ErrorGroup[]
  storage: StorageReport
  vitals: AnalyticsVitals
  sessions: number
  errorRate: number
  image: string | null
}

export interface PlatformOverview {
  owners: { total: number; published: number; draft: number; suspended: number }
  signups: { last7: number; last30: number }
  traffic: AnalyticsSummary
  portfolios: PortfolioTraffic[]
}

export interface AnalyticsSummary {
  days: number
  from: string
  to: string
  totals: {
    sessions: number
    visitors: number
    bounced: number
    dwellMsAverage: number
    docs: number
  }
  deltas: AnalyticsDelta
  trend: AnalyticsPoint[]
  referrers: AnalyticsBreakdown[]
  langs: AnalyticsBreakdown[]
  countries: AnalyticsBreakdown[]
  devices: AnalyticsBreakdown[]
  browsers: AnalyticsBreakdown[]
  entries: AnalyticsBreakdown[]
  sections: AnalyticsBreakdown[]
  cards: AnalyticsCard[]
  scrollQuartiles: number[]
  docsOpened: AnalyticsBreakdown[]
  outbound: AnalyticsBreakdown[]
  contact: AnalyticsBreakdown[]
  contactRate: number
  returning: number
  newVisitors: number
  shell: AnalyticsBreakdown[]
  shellSessions: number
  errors: AnalyticsBreakdown[]
  vitals: AnalyticsVitals
}

export interface AccountDetail {
  account: PortfolioRow
  consentMode: string
  plan: string
  documents: AnalyticsBreakdown[]
  traffic: AnalyticsPoint[]
  timeline: { action: string; actor: string | null; reason: string | null; at: string }[]
  totals: { documents: number; sessions: number; visitors: number; locales: number }
}

export interface ModerationBoard {
  recentlyPublished: PortfolioRow[]
  suspended: PortfolioRow[]
  nearMisses: { slug: string; reserved: string }[]
  thin: { slug: string; id: string; documents: number }[]
  silent: PortfolioRow[]
}

export interface IngestReport {
  days: { date: string; events: number }[]
  totals: { events: number; rejected: number; rollupDays: number }
  ttl: { collection: string; present: boolean; seconds: number | null }[]
  lag: { latestRollup: string | null; today: string }
}

export interface ConfigEntry {
  key: string
  value: string
  detail: string
}

export interface PlatformConfig {
  reservedSlugs: string[]
  limits: { slugMin: number; slugMax: number; reasonMax: number; erasureDeadlineDays: number }
  retention: { rawEventDays: number; rollupMonths: number }
  environment: { nodeEnv: string; database: string; image: string }
  runtime: ConfigEntry[]
  ingest: ConfigEntry[]
  privacy: ConfigEntry[]
  collections: AnalyticsBreakdown[]
}

export interface ErasureRow {
  id: string
  slug: string
  state: string
  reason: string
  requestedBy: string | null
  dueAt: string
  completedAt: string | null
  cascade: Record<string, number>
  failure: string | null
  daysLeft: number
}
