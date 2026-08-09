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

export const LEGAL: Record<LegalDocument['slug'], LegalDocument> = {
  privacy: {
    slug: 'privacy',
    title: 'Privacy',
    summary:
      'What this platform stores, why, for how long, and how to get it back or have it deleted.',
    sections: [
      {
        heading: 'Who holds the data',
        paragraphs: [
          `The platform is operated by the account reachable at ${OPERATOR_EMAIL}. Write to that address for anything on this page, including a request to export or erase your data.`,
        ],
      },
      {
        heading: 'What is stored about you as an owner',
        bullets: [
          'A Cognito user record, created the first time you sign in with Google. It holds your email, your name and your profile picture URL, and Google is the only place your password ever exists — this platform never sees it.',
          'An owner record: the Cognito subject identifier, your public address, whether the portfolio is published, and your measurement choice. Your email is stored on this record only as a convenience for support, and never joined to anything else.',
          'The portfolio content you type in, and the files you upload.',
        ],
      },
      {
        heading: 'What is stored about people who visit a portfolio',
        paragraphs: [
          'Visitor measurement is on by default and is deliberately built so that it cannot follow anyone. There is no cookie, nothing is written that survives the browser tab, and nothing is shared with another site or another company.',
        ],
        bullets: [
          'A session identifier that lives in sessionStorage and dies with the tab.',
          'A daily hash of the browser language, user agent and country, salted with a value that is held in memory and never written down. It cannot be linked to the same person on a different day, which is exactly the point.',
          'Which sections were seen, which documents were opened, which links were followed, the page load speed, and any JavaScript error.',
          'No IP address is stored. Country is derived at the edge and kept only as a two-letter code.',
        ],
      },
      {
        heading: 'Why there is no cookie banner',
        paragraphs: [
          'Storing or reading anything on a visitor’s device normally needs consent. The exemption for audience measurement applies only when the measurement is first-party, limited to audience measurement, not shared, not cross-site, aggregated, and uses no identifier that persists across days. The default measurement satisfies all of those, so there is nothing to consent to.',
          'A portfolio owner can turn on enhanced measurement, which does use an identifier that lasts. When they do, their visitors get a banner they can refuse in one click and withdraw later. That choice belongs to the owner of that portfolio, and the banner appears only there.',
        ],
      },
      {
        heading: 'How long it is kept',
        bullets: [
          'Raw visitor events: 30 days, then deleted automatically by the database.',
          'Daily aggregates: at most 25 months.',
          'Your portfolio content and files: until you delete them or close your account.',
          'Operator audit entries: kept, because they are the record of who did what to an account.',
        ],
      },
      {
        heading: 'Who else processes it',
        bullets: [
          'Amazon Web Services, in the eu-west-3 (Paris) region — hosting, file storage and the sign-in service.',
          'MongoDB Atlas — the database.',
          'Google — sign-in only. Google tells the platform who you are; the platform tells Google nothing about what you do here.',
        ],
      },
      {
        heading: 'Your rights',
        bullets: [
          'Export everything, as JSON, from the Portfolio screen at any time.',
          'Delete your account from the same screen. That removes your content, your uploaded files, your visitor numbers and your sign-in — there is no copy kept and no undo.',
          'Correct anything by editing it, since you hold the only copy that matters.',
          `Complain, or ask for any of the above by writing to ${OPERATOR_EMAIL}.`,
        ],
      },
      {
        heading: 'What an operator can see',
        paragraphs: [
          'The person who runs the platform can see that an account exists, its address, whether it is published, how many documents and files it holds, and how much traffic it gets. They cannot read an unpublished portfolio: no endpoint returns another owner’s content. Anything published is public anyway, and they read it at its public address like anyone else.',
          'Suspending, exporting or erasing an account requires a written reason and is recorded in an append-only log.',
        ],
      },
    ],
  },
  terms: {
    slug: 'terms',
    title: 'Terms',
    summary: 'What the platform does, what it asks of you, and what neither side promises.',
    sections: [
      {
        heading: 'What you get',
        paragraphs: [
          'One portfolio, free, at its own address. Sign-in is through Google. The first sign-in creates the account, so there is no separate sign-up.',
        ],
      },
      {
        heading: 'Your address is yours to change',
        paragraphs: [
          'It is derived from your name the first time you sign in, and you can change it on the Portfolio screen whenever you like. Changing it is not free: the old address stops resolving immediately and there is no redirect, so every link you have already shared — a CV, a message, a search result — breaks. The old address also returns to the pool and someone else may take it.',
        ],
      },
      {
        heading: 'What you are responsible for',
        bullets: [
          'That the content is yours to publish, including every image and document you upload.',
          'That it is lawful, and that it is not someone else’s work presented as yours.',
          'Keeping access to your Google account, since that is the only way in.',
        ],
      },
      {
        heading: 'What the operator may do',
        bullets: [
          'Suspend a portfolio that breaks these terms. Suspension takes it offline; it never opens a draft, and it is reversible.',
          'Erase an account that is used for spam or abuse, with the reason recorded.',
          'Change these terms. Anything that materially reduces what you get will be announced before it takes effect.',
        ],
      },
      {
        heading: 'What is not promised',
        paragraphs: [
          'The platform runs on free service tiers and is offered as-is, with no guaranteed uptime and no support commitment. Keep your own copy of anything you would be sorry to lose — the export on the Portfolio screen exists for exactly that.',
        ],
      },
      {
        heading: 'Ending it',
        paragraphs: [
          'Delete your account whenever you like, from the Portfolio screen. It takes effect immediately and cannot be undone.',
        ],
      },
    ],
  },
}

export const LEGAL_DOCUMENTS = Object.values(LEGAL)
