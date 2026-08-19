import { i18n } from '@/i18n'

export interface LegalSection {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
}

export interface LegalDocument {
  slug: 'privacy' | 'terms'
  title: string
  summary: string
  sections: LegalSection[]
}

export const OPERATOR_EMAIL = 'admin@mkirell.com'

export const LEGAL_SLUGS: LegalDocument['slug'][] = ['privacy', 'terms']

function fill(value: string): string {
  return value.replace('{email}', OPERATOR_EMAIL)
}

export function legalDocument(slug: LegalDocument['slug']): LegalDocument {
  const { tm, rt } = i18n.global
  const source = tm(`legal.${slug}`) as {
    title: string
    summary: string
    sections: LegalSection[]
  }

  return {
    slug,
    title: rt(source.title),
    summary: fill(rt(source.summary)),
    sections: source.sections.map((section) => ({
      heading: rt(section.heading),
      paragraphs: section.paragraphs?.map((entry) => fill(rt(entry))),
      bullets: section.bullets?.map((entry) => fill(rt(entry))),
    })),
  }
}

export function legalDocuments(): LegalDocument[] {
  return LEGAL_SLUGS.map(legalDocument)
}
