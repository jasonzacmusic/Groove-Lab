/**
 * Curated YouTube backing tracks organized by genre and key.
 * Used across Home, Chords, and Standards pages.
 */

import type { VideoEntry } from './standards-videos';
export type { VideoEntry };

/** Featured practice videos shown on the Home page hero section. */
export const FEATURED_VIDEOS: {
  label: string;
  videoId: string;
  channel: string;
  color: string;
  bg: string;
}[] = [
  { label: 'Jazz Drum Loops',     videoId: '8gcB1TKhDzA', channel: 'Drumeo',              color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  { label: 'Blues Backing Tracks', videoId: '5thOm3t5JGU', channel: 'Quist Jam Tracks',    color: 'text-indigo-400',  bg: 'bg-indigo-500/10' },
  { label: 'Funk Grooves',        videoId: 'cKBVOxrIMuQ', channel: 'Elevated Jam Tracks',  color: 'text-orange-400',  bg: 'bg-orange-500/10' },
  { label: 'Bossa Nova',          videoId: 'QL7IZFL1pKo', channel: 'Jazz Backing Tracks',  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { label: 'Rock Drum Loops',     videoId: 'KnPJqA9fJDc', channel: 'Drumeo',              color: 'text-red-400',     bg: 'bg-red-500/10' },
  { label: 'Neo Soul',            videoId: '3K3RQyHxXtY', channel: 'Elevated Jam Tracks',  color: 'text-purple-400',  bg: 'bg-purple-500/10' },
];

/** Genre backing tracks keyed by lowercase genre name. Used by Chords page second slot. */
export const GENRE_BACKING_TRACKS: Record<string, VideoEntry> = {
  'jazz':     { id: 'RnHBi8R0CAw', title: 'Jazz Backing Track - Medium Swing',       channel: 'Jazz Backing Tracks' },
  'blues':    { id: 'yxTOFJVHBiQ', title: 'Blues Backing Track - Shuffle in A',       channel: 'Quist Jam Tracks' },
  'funk':     { id: 'd7FQLR23dXQ', title: 'Funk Backing Track - Groove in E',         channel: 'Elevated Jam Tracks' },
  'reggae':   { id: 'J5GOSdtFMks', title: 'Reggae Backing Track',                     channel: 'Elevated Jam Tracks' },
  'latin':    { id: 'Z2JqZkXiV4Q', title: 'Latin Backing Track - Salsa Feel',         channel: 'Jazz Backing Tracks' },
  'neo soul': { id: 'bGLjOEDRKLk', title: 'Neo Soul Backing Track',                   channel: 'Elevated Jam Tracks' },
  'afrobeat': { id: '5L1y5FWPJDI', title: 'Afrobeat Backing Track',                   channel: 'Elevated Jam Tracks' },
  'gospel':   { id: 'h3ByOYdnhOs', title: 'Gospel Backing Track',                     channel: 'Elevated Jam Tracks' },
  'r&b':      { id: 'cKBVOxrIMuQ', title: 'R&B Backing Track - Smooth Groove',        channel: 'Elevated Jam Tracks' },
  'soul':     { id: '3K3RQyHxXtY', title: 'Soul Backing Track',                       channel: 'Elevated Jam Tracks' },
  'rock':     { id: 'KnPJqA9fJDc', title: 'Rock Backing Track - Classic Feel',        channel: 'Drumeo' },
  'pop':      { id: '8gcB1TKhDzA', title: 'Pop Backing Track',                        channel: 'Drumeo' },
};

/**
 * Key-specific backing tracks for practicing in all 12 major and 12 minor keys.
 * 11 of 24 keys currently have curated videos; the rest are null.
 * Pages should show filled keys and gracefully hide empty ones.
 */
export const KEY_BACKING_TRACKS: Record<string, VideoEntry | null> = {
  // Major keys
  'C major':  { id: 'RnHBi8R0CAw', title: 'Jazz Backing Track in C',          channel: 'Jazz Backing Tracks' },
  'Db major': null,
  'D major':  { id: 'd7FQLR23dXQ', title: 'Funk Jam Track in D',              channel: 'Elevated Jam Tracks' },
  'Eb major': { id: 'yxTOFJVHBiQ', title: 'Blues Backing Track in Eb',        channel: 'Quist Jam Tracks' },
  'E major':  null,
  'F major':  { id: 'QL7IZFL1pKo', title: 'Bossa Nova in F',                  channel: 'Jazz Backing Tracks' },
  'Gb major': null,
  'G major':  { id: 'KnPJqA9fJDc', title: 'Rock Jam Track in G',              channel: 'Drumeo' },
  'Ab major': null,
  'A major':  { id: '5thOm3t5JGU', title: 'Blues Shuffle in A',               channel: 'Quist Jam Tracks' },
  'Bb major': { id: 'J5GOSdtFMks', title: 'Reggae Backing Track in Bb',       channel: 'Elevated Jam Tracks' },
  'B major':  null,

  // Minor keys
  'C minor':  { id: 'bGLjOEDRKLk', title: 'Neo Soul in Cm',                   channel: 'Elevated Jam Tracks' },
  'Db minor': null,
  'D minor':  { id: 'cKBVOxrIMuQ', title: 'R&B Groove in Dm',                 channel: 'Elevated Jam Tracks' },
  'Eb minor': null,
  'E minor':  { id: '3K3RQyHxXtY', title: 'Soul Backing Track in Em',         channel: 'Elevated Jam Tracks' },
  'F minor':  null,
  'F# minor': null,
  'G minor':  { id: 'Xjf2kiDO19Y', title: 'Jazz Backing Track in Gm',         channel: 'Jazz Backing Tracks' },
  'Ab minor': null,
  'A minor':  { id: 'h3ByOYdnhOs', title: 'Gospel Groove in Am',              channel: 'Elevated Jam Tracks' },
  'Bb minor': null,
  'B minor':  null,
};

/** Helper: get all keys that have backing tracks */
export function getFilledKeys(): { key: string; video: VideoEntry }[] {
  return Object.entries(KEY_BACKING_TRACKS)
    .filter((entry): entry is [string, VideoEntry] => entry[1] !== null)
    .map(([key, video]) => ({ key, video }));
}
