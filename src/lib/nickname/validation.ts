export const MIN_NICKNAME_LENGTH = 2;
export const MAX_NICKNAME_LENGTH = 24;

export type NicknameRejectionReason =
  | 'invalid_type'
  | 'too_short'
  | 'too_long'
  | 'invalid_chars'
  | 'profanity';

export type NicknameValidationResult =
  | { ok: true; normalized: string }
  | { ok: false; reason: NicknameRejectionReason };

// Small, deliberately mild blocklist — substring match (case-insensitive).
// Goal: catch the obvious cases at the UI boundary, not be a perfect filter.
// A real moderation pass would happen server-side.
const PROFANITY_SUBSTRINGS: readonly string[] = [
  'shit',
  'fuck',
  'cunt',
  'bitch',
  'asshole',
  'nigger',
  'faggot',
  'retard',
  'slut',
  'whore',
];

// Matches any C0 (U+0000-U+001F), DEL (U+007F), or C1 (U+0080-U+009F) control
// codepoint. Tabs/newlines are first collapsed to spaces by normalize, so this
// only fires on input that survives normalization and is still invalid.
// biome-ignore lint/suspicious/noControlCharactersInRegex: detecting control chars in user input is the rule intended exception.
const CONTROL_CHAR_RE = /[\u0000-\u001f\u007f-\u009f]/;

function normalize(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

export function validateNickname(input: unknown): NicknameValidationResult {
  if (typeof input !== 'string') {
    return { ok: false, reason: 'invalid_type' };
  }

  const normalized = normalize(input);

  // Check after whitespace-collapse so legitimate tabs/newlines in the middle
  // of input are treated as ordinary whitespace, not a control-char rejection.
  // Anything that survives normalization and is still a control char is genuinely invalid.
  if (CONTROL_CHAR_RE.test(normalized)) {
    return { ok: false, reason: 'invalid_chars' };
  }

  if (normalized.length < MIN_NICKNAME_LENGTH) {
    return { ok: false, reason: 'too_short' };
  }
  if (normalized.length > MAX_NICKNAME_LENGTH) {
    return { ok: false, reason: 'too_long' };
  }

  const lower = normalized.toLowerCase();
  for (const word of PROFANITY_SUBSTRINGS) {
    if (lower.includes(word)) {
      return { ok: false, reason: 'profanity' };
    }
  }

  return { ok: true, normalized };
}
