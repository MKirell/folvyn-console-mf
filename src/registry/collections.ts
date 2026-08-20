export type FieldType =
  | 'text'
  | 'textarea'
  | 'month'
  | 'number'
  | 'boolean'
  | 'email'
  | 'url'
  | 'tags'
  | 'string-list'
  | 'icon'
  | 'flag'
  | 'country'
  | 'language'
  | 'asset'
  | 'asset-list'
  | 'asset-map'
  | 'select'

export type AssetKind = 'pdf' | 'image'

export interface FieldDef {
  name: string
  type: FieldType
  options?: string[]
  optionsKey?: string
  label?: string
  required?: boolean
  maxLength?: number
  maxItems?: number
  itemMaxLength?: number
  min?: number
  max?: number
  pattern?: string
  placeholder?: string
  group?: string
  protocol?: 'https' | 'http'
  accept?: AssetKind
  wide?: boolean
  hidden?: boolean
  flag?: boolean
}

export type CollectionMode = 'list' | 'singleton' | 'locale-keyed'

export interface CollectionDef {
  key: string
  path: string
  label: string
  singular: string
  icon: string
  group: string
  mode: CollectionMode
  ordered: boolean
  duplicable?: boolean
  i18n: boolean
  titleField?: string
  titleFormat?: 'languageName'
  subtitleField?: string
  fields: FieldDef[]
  translated: FieldDef[]
}

export const HONORS = ['pass', 'satisfactory', 'good', 'very-good', 'excellent']

export const LANGUAGE_LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']

const LANG_PATTERN = '^[a-z]{2}(-[A-Z]{2})?$'
const FLAG_PATTERN = '^[a-z]{2}$'
const MONTH_PATTERN = '^[0-9]{4}-(0[1-9]|1[0-2])$'

export const COLLECTIONS: Record<string, CollectionDef> = {
  person: {
    key: 'person',
    path: 'admin/person',
    label: 'Person',
    singular: 'Person',
    icon: 'User',
    group: 'Identity',
    mode: 'singleton',
    ordered: false,
    i18n: true,
    titleField: 'givenName',
    fields: [
      {
        name: 'givenName',
        group: 'Identity',
        type: 'text',
        required: true,
        maxLength: 60,
        placeholder: 'First name : Jane',
      },
      {
        name: 'familyName',
        group: 'Identity',
        type: 'text',
        required: true,
        maxLength: 60,
        placeholder: 'Last name : DOE',
      },
      {
        name: 'affiliation',
        group: 'Identity',
        type: 'text',
        required: true,
        maxLength: 120,
        placeholder: 'Employer, university or Freelance : Acme Corp',
      },
      {
        name: 'email',
        group: 'Contact',
        type: 'email',
        required: true,
        maxLength: 120,
        placeholder: 'Contact address : name@example.com',
      },
      {
        name: 'phone',
        group: 'Contact',
        type: 'text',
        required: true,
        pattern: '^\\+[1-9]\\d{6,14}$',
        placeholder: 'No spaces, with country code : +33612345678',
      },
      {
        name: 'linkedin',
        group: 'Contact',
        type: 'url',
        required: true,
        protocol: 'https',
        maxLength: 200,
        placeholder: 'Your profile : https://www.linkedin.com/in/jane-doe/',
      },
      {
        name: 'github',
        group: 'Contact',
        type: 'url',
        required: true,
        protocol: 'https',
        maxLength: 200,
        placeholder: 'Your profile : https://github.com/janedoe',
      },
      {
        name: 'country',
        group: 'Location',
        type: 'country',
        required: true,
      },
      {
        name: 'city',
        group: 'Location',
        type: 'text',
        required: true,
        maxLength: 80,
        placeholder: 'City : Berlin',
      },
      { name: 'photo', type: 'asset', accept: 'image', required: true, maxLength: 255 },
      { name: 'resumes', type: 'asset-map', accept: 'pdf', label: 'Résumés', wide: true },
    ],
    translated: [
      {
        name: 'headline',
        group: 'Identity',
        type: 'text',
        required: true,
        maxLength: 100,
        placeholder: 'What you do or study : Backend Engineer | CS Student',
      },
      {
        name: 'aboutParagraphs',
        group: 'About',
        type: 'string-list',
        required: true,
        maxItems: 3,
        itemMaxLength: 320,
        wide: true,
        placeholder: 'One paragraph per entry : I build backend services at **Acme**.',
      },
    ],
  },

  profile: {
    key: 'profile',
    path: 'admin/profile',
    label: 'Hero',
    singular: 'Hero',
    icon: 'Sparkles',
    group: 'Identity',
    mode: 'singleton',
    ordered: false,
    i18n: true,
    titleField: 'tagline',
    fields: [],
    translated: [
      {
        name: 'subtitles',
        group: 'Hero',
        type: 'string-list',
        required: true,
        maxItems: 4,
        itemMaxLength: 120,
        wide: true,
        placeholder: 'One role per entry : Backend Engineer',
      },
      {
        name: 'tagline',
        group: 'Hero',
        type: 'textarea',
        required: true,
        maxLength: 240,
        wide: true,
        placeholder: 'One sentence, **bold** what matters : I build **resilient** services.',
      },
    ],
  },

  locale: {
    key: 'locale',
    path: 'admin/locales',
    label: 'Locales',
    singular: 'Locale',
    icon: 'Globe',
    group: 'Identity',
    mode: 'list',
    ordered: true,
    duplicable: false,
    i18n: false,
    titleField: 'code',
    fields: [
      { name: 'code', type: 'language', required: true, pattern: LANG_PATTERN, label: 'Language' },
      { name: 'flagCode', type: 'flag', required: true, pattern: FLAG_PATTERN, label: 'Country' },
      { name: 'enabled', type: 'boolean', hidden: true },
    ],
    translated: [],
  },

  experience: {
    key: 'experience',
    path: 'admin/experiences',
    label: 'Experiences',
    singular: 'Experience',
    icon: 'Briefcase',
    group: 'Career',
    mode: 'list',
    ordered: true,
    i18n: true,
    titleField: 'role',
    subtitleField: 'company',
    fields: [
      {
        name: 'company',
        type: 'text',
        required: true,
        maxLength: 120,
        placeholder: 'Employer : Acme Corp',
      },
      {
        name: 'startDate',
        type: 'month',
        required: true,
        pattern: MONTH_PATTERN,
        maxLength: 7,
      },
      {
        name: 'endDate',
        type: 'month',
        pattern: MONTH_PATTERN,
        maxLength: 7,
      },
      {
        name: 'country',
        type: 'country',
        maxLength: 2,
        pattern: '^[A-Z]{2}$',
      },
      {
        name: 'city',
        type: 'text',
        maxLength: 80,
        placeholder: 'City : Berlin',
      },
      {
        name: 'tags',
        type: 'tags',
        maxItems: 40,
        itemMaxLength: 80,
        wide: true,
        placeholder: 'One per chip : Go, Postgres, Docker',
      },
      {
        name: 'doc',
        type: 'asset',
        accept: 'pdf',
        maxLength: 255,
      },
      {
        name: 'link',
        type: 'url',
        maxLength: 300,
        placeholder: 'Their page : https://www.linkedin.com/company/acme',
      },
    ],
    translated: [
      {
        name: 'role',
        type: 'text',
        required: true,
        maxLength: 120,
        placeholder: 'Title as it appeared : Backend Engineer',
      },
      {
        name: 'bullets',
        type: 'string-list',
        required: true,
        maxItems: 3,
        itemMaxLength: 300,
        wide: true,
        placeholder: 'One outcome per entry : Built a **billing service**, errors down 30%.',
      },
    ],
  },

  project: {
    key: 'project',
    path: 'admin/projects',
    label: 'Projects',
    singular: 'Project',
    icon: 'FolderGit2',
    group: 'Career',
    mode: 'list',
    ordered: true,
    i18n: true,
    titleField: 'title',
    fields: [
      {
        name: 'startDate',
        type: 'month',
        required: true,
        pattern: MONTH_PATTERN,
        maxLength: 7,
      },
      {
        name: 'endDate',
        type: 'month',
        pattern: MONTH_PATTERN,
        maxLength: 7,
      },
      {
        name: 'tags',
        type: 'tags',
        maxItems: 40,
        itemMaxLength: 80,
        wide: true,
        placeholder: 'One per chip : Python/FastAPI, Redis',
      },
      {
        name: 'link',
        type: 'url',
        maxLength: 300,
        placeholder: 'Repository : https://github.com/janedoe/PhotoSort',
      },
    ],
    translated: [
      {
        name: 'title',
        type: 'text',
        required: true,
        maxLength: 80,
        placeholder: 'Project name : PhotoSort',
      },
      {
        name: 'badge',
        type: 'text',
        required: true,
        maxLength: 60,
        placeholder: 'One or two words : Computer Vision',
      },
      {
        name: 'desc',
        type: 'textarea',
        required: true,
        maxLength: 320,
        wide: true,
        placeholder: 'What it does and why : A CLI that groups photos by place.',
      },
    ],
  },

  skillCategory: {
    key: 'skillCategory',
    path: 'admin/skill-categories',
    label: 'Skill categories',
    singular: 'Skill category',
    icon: 'Layers',
    group: 'Career',
    mode: 'list',
    ordered: true,
    i18n: true,
    titleField: 'title',
    fields: [
      { name: 'icon', type: 'icon', required: true, maxLength: 60 },
      {
        name: 'tags',
        type: 'tags',
        maxItems: 60,
        itemMaxLength: 80,
        wide: true,
        placeholder: 'One per chip : Postgres, Redis',
      },
      {
        name: 'accentTags',
        type: 'tags',
        maxItems: 40,
        itemMaxLength: 80,
        wide: true,
        placeholder: 'The one to highlight : Postgres',
      },
    ],
    translated: [
      {
        name: 'title',
        type: 'text',
        required: true,
        maxLength: 80,
        placeholder: 'Two related areas : Backend & Databases',
      },
    ],
  },

  degree: {
    key: 'degree',
    path: 'admin/degrees',
    label: 'Degrees',
    singular: 'Degree',
    icon: 'GraduationCap',
    group: 'Education',
    mode: 'list',
    ordered: true,
    i18n: true,
    titleField: 'title',
    subtitleField: 'school',
    fields: [
      {
        name: 'startDate',
        type: 'month',
        required: true,
        pattern: MONTH_PATTERN,
        maxLength: 7,
      },
      {
        name: 'endDate',
        type: 'month',
        pattern: MONTH_PATTERN,
        maxLength: 7,
      },
      {
        name: 'school',
        type: 'text',
        maxLength: 120,
        placeholder: 'School – University : Institute – TU Berlin',
      },
      {
        name: 'country',
        type: 'country',
        maxLength: 2,
        pattern: '^[A-Z]{2}$',
      },
      {
        name: 'city',
        type: 'text',
        maxLength: 80,
        placeholder: 'City : Berlin',
      },
      {
        name: 'honors',
        type: 'select',
        options: HONORS,
        optionsKey: 'honors',
      },
      {
        name: 'doc',
        type: 'asset',
        accept: 'pdf',
        maxLength: 255,
      },
      {
        name: 'link',
        type: 'url',
        maxLength: 300,
        placeholder: 'Their page : https://www.linkedin.com/company/acme',
      },
    ],
    translated: [
      {
        name: 'title',
        type: 'text',
        required: true,
        maxLength: 120,
        placeholder: 'Degree name : MSc in Computer Science',
      },
    ],
  },

  certification: {
    key: 'certification',
    path: 'admin/certifications',
    label: 'Certifications',
    singular: 'Certification',
    icon: 'BadgeCheck',
    group: 'Education',
    mode: 'list',
    ordered: true,
    i18n: false,
    titleField: 'title',
    subtitleField: 'issuer',
    fields: [
      { name: 'icon', type: 'icon', required: true, maxLength: 60 },
      {
        name: 'title',
        type: 'text',
        required: true,
        maxLength: 120,
        placeholder: 'Certification name : Cloud Practitioner',
      },
      {
        name: 'issuer',
        type: 'text',
        required: true,
        maxLength: 80,
        placeholder: 'Issuer, platform in brackets : Acme (Coursera)',
      },
      {
        name: 'date',
        type: 'month',
        required: true,
        pattern: MONTH_PATTERN,
        maxLength: 7,
      },
      {
        name: 'doc',
        type: 'asset',
        accept: 'pdf',
        maxLength: 255,
      },
    ],
    translated: [],
  },

  spokenLanguage: {
    key: 'spokenLanguage',
    path: 'admin/spoken-languages',
    label: 'Spoken languages',
    singular: 'Spoken language',
    icon: 'Languages',
    group: 'Education',
    mode: 'list',
    ordered: true,
    i18n: false,
    titleField: 'code',
    titleFormat: 'languageName',
    subtitleField: 'level',
    fields: [
      { name: 'code', type: 'language', required: true, pattern: LANG_PATTERN, label: 'Language' },
      {
        name: 'country',
        type: 'country',
        required: true,
        maxLength: 2,
        pattern: '^[A-Z]{2}$',
        flag: true,
      },
      {
        name: 'level',
        type: 'select',
        required: true,
        options: LANGUAGE_LEVELS,
        optionsKey: 'levels',
      },
      {
        name: 'pct',
        type: 'number',
        required: true,
        min: 0,
        max: 100,
      },
      {
        name: 'doc',
        type: 'asset',
        accept: 'pdf',
        maxLength: 255,
      },
    ],
    translated: [],
  },

  volunteering: {
    key: 'volunteering',
    path: 'admin/volunteering',
    label: 'Volunteering',
    singular: 'Volunteering entry',
    icon: 'HeartHandshake',
    group: 'Achievements',
    mode: 'list',
    ordered: true,
    i18n: true,
    titleField: 'role',
    subtitleField: 'org',
    fields: [
      {
        name: 'startDate',
        type: 'month',
        required: true,
        pattern: MONTH_PATTERN,
        maxLength: 7,
      },
      {
        name: 'endDate',
        type: 'month',
        pattern: MONTH_PATTERN,
        maxLength: 7,
      },
      {
        name: 'org',
        type: 'text',
        required: true,
        maxLength: 80,
        placeholder: 'Organisation : Robotics Club',
      },
      {
        name: 'doc',
        type: 'asset',
        accept: 'pdf',
        maxLength: 255,
      },
      {
        name: 'link',
        type: 'url',
        maxLength: 300,
        placeholder: 'Their page : https://www.linkedin.com/company/acme',
      },
    ],
    translated: [
      {
        name: 'role',
        type: 'text',
        required: true,
        maxLength: 100,
        placeholder: 'Your role there : Project Manager',
      },
      {
        name: 'desc',
        type: 'textarea',
        required: true,
        maxLength: 300,
        wide: true,
        placeholder: 'What came of it : Led the team to the finals.',
      },
    ],
  },

  award: {
    key: 'award',
    path: 'admin/awards',
    label: 'Awards',
    singular: 'Award',
    icon: 'Trophy',
    group: 'Achievements',
    mode: 'list',
    ordered: true,
    i18n: true,
    titleField: 'title',
    subtitleField: 'place',
    fields: [
      { name: 'icon', type: 'icon', required: true, maxLength: 60 },
      { name: 'country', type: 'country', flag: true },
      {
        name: 'city',
        type: 'text',
        maxLength: 80,
        placeholder: 'City : Berlin',
      },
      { name: 'date', type: 'month', pattern: MONTH_PATTERN, maxLength: 7 },
      {
        name: 'images',
        type: 'asset-list',
        accept: 'image',
        maxItems: 30,
        itemMaxLength: 255,
        wide: true,
      },
    ],
    translated: [
      {
        name: 'title',
        type: 'text',
        required: true,
        maxLength: 120,
        placeholder: 'Competition and placing : Startup Cup — Second Place',
      },
    ],
  },
}

export const NAV_GROUPS: { label: string; keys: string[] }[] = [
  { label: 'Identity', keys: ['person', 'profile', 'locale'] },
  { label: 'Career', keys: ['experience', 'project', 'skillCategory'] },
  { label: 'Education', keys: ['degree', 'certification', 'spokenLanguage'] },
  { label: 'Achievements', keys: ['volunteering', 'award'] },
]

export const LIST_COLLECTIONS: CollectionDef[] = Object.values(COLLECTIONS).filter(
  (collection) => collection.mode === 'list',
)

export const SINGLETON_COLLECTIONS: CollectionDef[] = Object.values(COLLECTIONS).filter(
  (collection) => collection.mode === 'singleton',
)

export const TRANSLATED_COLLECTIONS: CollectionDef[] = Object.values(COLLECTIONS).filter(
  (collection) => collection.i18n && collection.mode === 'list',
)

export function getCollection(key: string): CollectionDef | undefined {
  return COLLECTIONS[key]
}

export function fieldLabel(field: FieldDef): string {
  if (field.label) return field.label
  const spaced = field.name.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
  return spaced.trim()
}
