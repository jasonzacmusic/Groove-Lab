import type { GenreVideo } from '@/data/genre-videos';

type LoopClassification = 'drums' | 'harmony' | 'other';

const DRUMLESS_RE = /\b(no\s*drums?|without\s*drums?|drumless|minus\s*drums?|sans\s*drums?)\b/i;
const DRUMMER_TARGET_RE = /\b(for|4)\s+(drummers?|drums?)\b|\bplay[-\s]?along\s+(?:for\s+)?drummers?\b|\bdrum\s*cover\b|\bdrumset\s+part\b/i;
const NON_DRUM_INSTRUMENT_RE = /\b(guitar|piano|keyboard|keys|organ|bass|sax|saxophone|trumpet|vocal|vocals|sing|singer|choir|melody|soloist)\b/i;
const HARMONY_RE = /\b(backing\s*track|jam\s*track|play[-\s]?along|chord|chords|progression|ii[-\s]?v[-\s]?i|2[-\s]?5[-\s]?1|12\s*bar|blues|jazz|swing|standard|vamp|modal|dorian|mixolydian|key\s+of|in\s+[a-g](?:#|b)?\s*(?:major|minor|maj|min|m)?\b|major|minor|pentatonic|neo[-\s]?soul|gospel|r&b|rnb|funk|bossa|samba|latin|reggae|country|folk|pop|rock|ballad|worship)\b/i;
const DRUM_ONLY_RE = /\b(drums?\s*only|only\s*drums?|drum\s*only|drums?\s*loop|drum\s*loops?|drums?\s*track|drum\s*groove|drums?\s*beat|beats?\s*for\s+(?:bass|guitar|practice)|drum\s*metronome|rhythm\s*track|percussion\s*(?:only|loop|track|backing)|tabla|cajon|djembe|conga|bongo|salsa\s+percussion|latin\s+percussion)\b/i;
const DRUM_CHANNEL_RE = /\b(drumstation|drum\s*ape|hybrid\s*drummer|playalongdrums|1234\s*drums|drum\s*tracks|drum\s*backing\s*track|funky\s*drum\s*loop|jorge\s+mendieta\s+drums|pocket\s+jams|talent\s+progression)\b/i;

function textFor(video: Pick<GenreVideo, 'title' | 'channel'>): string {
  return `${video.title} ${video.channel || ''}`;
}

export function isRhythmOnlyLoop(video: Pick<GenreVideo, 'title' | 'channel'>): boolean {
  const text = textFor(video);
  if (DRUMLESS_RE.test(text) || DRUMMER_TARGET_RE.test(text)) return false;
  if (!DRUM_ONLY_RE.test(text) && !DRUM_CHANNEL_RE.test(text)) return false;

  const title = video.title;
  const explicitlyOnly = /\b(drums?\s*only|only\s*drums?|drum\s*only|percussion\s*only|drum\s*loop|drums?\s*loop|drum\s*metronome)\b/i.test(title);
  if (NON_DRUM_INSTRUMENT_RE.test(title) && !explicitlyOnly) return false;
  return true;
}

export function isHarmonyLoop(video: Pick<GenreVideo, 'title' | 'channel'>): boolean {
  const text = textFor(video);
  if (isRhythmOnlyLoop(video)) return false;
  if (DRUMMER_TARGET_RE.test(text) || DRUMLESS_RE.test(text)) return false;
  return HARMONY_RE.test(text);
}

export function classifyYouTubeLoop(video: Pick<GenreVideo, 'title' | 'channel'>): LoopClassification {
  if (isRhythmOnlyLoop(video)) return 'drums';
  if (isHarmonyLoop(video)) return 'harmony';
  return 'other';
}
