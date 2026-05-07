export type ReactionBand = 'way_off' | 'almost' | 'close' | 'bullseye';

export type Reaction = {
  band: ReactionBand;
  label: string;
  message: string;
};

export function reactionFor(score: number): Reaction {
  if (score >= 85) {
    return { band: 'bullseye', label: 'Bullseye', message: 'Nailed it.' };
  }
  if (score >= 65) {
    return { band: 'close', label: 'Close', message: 'Close enough!' };
  }
  if (score >= 35) {
    return { band: 'almost', label: 'Almost', message: 'Almost there.' };
  }
  return { band: 'way_off', label: 'Way Off', message: 'Way off — try another.' };
}
