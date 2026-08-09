import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { COLLECTIONS, type CollectionDef, type FieldDef } from '@/registry/collections'

const SERVICE_ROOT = resolve(__dirname, '../../folvyn-portfolio-ms/src/portfolio')

const SOURCES: Record<string, { file: string; create: string; translation?: string }> = {
  person: {
    file: 'person/person.dto.ts',
    create: 'UpsertPersonDto',
    translation: 'PersonTranslationDto',
  },
  locale: { file: 'locale/locale.dto.ts', create: 'CreateLocaleDto' },
  profile: {
    file: 'profile/profile.dto.ts',
    create: 'UpsertProfileDto',
    translation: 'ProfileTranslationDto',
  },
  experience: {
    file: 'experience/experience.dto.ts',
    create: 'CreateExperienceDto',
    translation: 'ExperienceTranslationDto',
  },
  project: {
    file: 'project/project.dto.ts',
    create: 'CreateProjectDto',
    translation: 'ProjectTranslationDto',
  },
  skillCategory: {
    file: 'skill/skill-category.dto.ts',
    create: 'CreateSkillCategoryDto',
    translation: 'SkillCategoryTranslationDto',
  },
  degree: {
    file: 'education/degree.dto.ts',
    create: 'CreateDegreeDto',
    translation: 'DegreeTranslationDto',
  },
  certification: {
    file: 'education/certification.dto.ts',
    create: 'CreateCertificationDto',
    translation: 'CertificationTranslationDto',
  },
  spokenLanguage: {
    file: 'education/spoken-language.dto.ts',
    create: 'CreateSpokenLanguageDto',
    translation: 'SpokenLanguageTranslationDto',
  },
  volunteering: {
    file: 'achievement/volunteering.dto.ts',
    create: 'CreateVolunteeringDto',
    translation: 'VolunteeringTranslationDto',
  },
  award: {
    file: 'achievement/award.dto.ts',
    create: 'CreateAwardDto',
    translation: 'AwardTranslationDto',
  },
}

const IGNORED = new Set(['order', 'translations'])

interface DtoProperty {
  name: string
  required: boolean
  maxLength?: number
}

function classBody(source: string, className: string): string {
  const start = source.indexOf(`export class ${className}`)
  if (start === -1) throw new Error(`${className} not found`)

  const open = source.indexOf('{', start)
  let depth = 0

  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(open + 1, index)
    }
  }
  throw new Error(`${className} body is unbalanced`)
}

function parseProperties(body: string): DtoProperty[] {
  const properties: DtoProperty[] = []
  let decorators: string[] = []

  for (const raw of body.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('@')) {
      decorators.push(line)
      continue
    }

    const match = /^(\w+)(\?)?:\s/.exec(line)
    if (!match) continue

    const block = decorators.join(' ')
    const maxLength = /@MaxLength\((\d+)\)/.exec(block)

    properties.push({
      name: match[1],
      required: !block.includes('@IsOptional()') && match[2] === undefined,
      maxLength: maxLength ? Number(maxLength[1]) : undefined,
    })
    decorators = []
  }

  return properties
}

function declared(collection: CollectionDef, translated: boolean): Map<string, FieldDef> {
  const fields = translated ? collection.translated : collection.fields
  return new Map(fields.map((field) => [field.name, field]))
}

const available = existsSync(SERVICE_ROOT)

describe.skipIf(!available)('registry mirrors the portfolio-ms DTOs', () => {
  for (const [key, source] of Object.entries(SOURCES)) {
    const collection = COLLECTIONS[key]
    const text = available ? readFileSync(resolve(SERVICE_ROOT, source.file), 'utf8') : ''

    it(`${key}: declares every required shared field`, () => {
      const registry = declared(collection, false)

      for (const property of parseProperties(classBody(text, source.create))) {
        if (IGNORED.has(property.name)) continue

        const field = registry.get(property.name)
        expect(field, `${key}.${property.name} is missing from the registry`).toBeDefined()
        expect(Boolean(field?.required), `${key}.${property.name} required flag`).toBe(
          property.required,
        )
        if (property.maxLength && field?.maxLength) {
          expect(field.maxLength, `${key}.${property.name} maxLength`).toBe(property.maxLength)
        }
      }
    })

    if (source.translation) {
      it(`${key}: declares every translated field`, () => {
        const registry = declared(collection, true)

        for (const property of parseProperties(classBody(text, source.translation as string))) {
          const field = registry.get(property.name)
          expect(field, `${key}.translations.${property.name} is missing`).toBeDefined()
          expect(Boolean(field?.required), `${key}.translations.${property.name} required`).toBe(
            property.required,
          )
        }
      })
    }

    it(`${key}: declares no field the DTO rejects`, () => {
      const shared = new Set(
        parseProperties(classBody(text, source.create)).map((property) => property.name),
      )

      for (const field of collection.fields) {
        expect(shared.has(field.name), `${key}.${field.name} is not accepted by the DTO`).toBe(true)
      }
    })
  }
})
