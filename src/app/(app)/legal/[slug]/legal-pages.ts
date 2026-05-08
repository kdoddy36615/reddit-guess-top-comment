/**
 * Placeholder Terms and Privacy copy. Drafted in-repo so we have something to
 * link to before launch; all of this must be reviewed (and likely rewritten by
 * counsel) before we monetize. Each page surfaces a banner via `placeholder:
 * true` so visitors aren't misled.
 */

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalPage {
  slug: LegalSlug;
  title: string;
  intro: string;
  lastUpdated: string;
  placeholder: boolean;
  sections: LegalSection[];
}

export const LEGAL_SLUGS = ['terms', 'privacy'] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

const LAST_UPDATED = '2026-05-08';

const TERMS: LegalPage = {
  slug: 'terms',
  title: 'Terms of Service',
  intro:
    'Welcome to Guess the Top Comment. By using the site you agree to the terms below. If you don’t agree, please don’t use the site.',
  lastUpdated: LAST_UPDATED,
  placeholder: true,
  sections: [
    {
      heading: 'Using the service',
      body: [
        'Guess the Top Comment is a free game where you read a Reddit post and guess what the top comment said. You may play anonymously or upgrade to a permanent account so your scores follow you across devices.',
        'You agree not to abuse the service: no automated scraping of round content, no attempts to disrupt other players, no submitting illegal or harmful content via free-text guesses.',
      ],
    },
    {
      heading: 'Reddit content',
      body: [
        'Round prompts and top comments are excerpted from public Reddit posts under fair use for the purposes of commentary and gameplay. All such content remains the property of its respective authors and is subject to Reddit’s terms.',
        'If you are an author and would like a post or comment removed from rotation, contact us and we will remove it.',
      ],
    },
    {
      heading: 'Accounts',
      body: [
        'Anonymous play creates a transient identity that does not persist across browsers or devices. Linking an email and password upgrades the same identity into a permanent account; your existing history is preserved.',
        'You are responsible for keeping your credentials safe. We do not see or store your password in plain text.',
      ],
    },
    {
      heading: 'Availability and changes',
      body: [
        'The service is provided as-is, without warranties. We may add, change, or remove features at any time, and we may update these terms; material changes will be highlighted at the top of this page.',
      ],
    },
    {
      heading: 'Contact',
      body: [
        'Questions about these terms? Open an issue on the project repository linked in the footer.',
      ],
    },
  ],
};

const PRIVACY: LegalPage = {
  slug: 'privacy',
  title: 'Privacy Policy',
  intro:
    'This page describes what we collect, why, and what choices you have. We try to collect as little as possible.',
  lastUpdated: LAST_UPDATED,
  placeholder: true,
  sections: [
    {
      heading: 'What we store',
      body: [
        'When you play, we store your guesses, scores, and the round you played. If you upgrade to a permanent account, we also store your email address and a hashed password (handled by Supabase Auth).',
        'We use a single first-party cookie to keep you signed in. We do not use third-party advertising trackers or behavioral profiling.',
      ],
    },
    {
      heading: 'Analytics',
      body: [
        'We use privacy-preserving aggregate analytics from Vercel to understand which pages load and how the app performs. These analytics do not set advertising identifiers.',
      ],
    },
    {
      heading: 'How your guesses are scored',
      body: [
        'Free-text guesses are sent to Google Gemini to compute a semantic similarity embedding against the top comment. We store the resulting score, not the embedding. We do not use your guesses to train models.',
      ],
    },
    {
      heading: 'Your choices',
      body: [
        'You can play anonymously without providing any personal information. You can also delete your account at any time from the account page; this removes your email and resets your history.',
      ],
    },
    {
      heading: 'Contact',
      body: [
        'Questions about privacy? Open an issue on the project repository linked in the footer.',
      ],
    },
  ],
};

const PAGES: Record<LegalSlug, LegalPage> = {
  terms: TERMS,
  privacy: PRIVACY,
};

export function getLegalPage(slug: string): LegalPage | null {
  if ((LEGAL_SLUGS as readonly string[]).includes(slug)) {
    return PAGES[slug as LegalSlug];
  }
  return null;
}
