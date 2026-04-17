/**
 * Curated YouTube backing tracks keyed by chord progression type.
 * Used by the Chords page to show relevant videos per progression.
 */

import type { VideoEntry } from './standards-videos';
export type { VideoEntry };

/** Backing track videos keyed by progression type name (e.g. "ii-V-I", "Blues"). */
export const CHORD_PROGRESSION_VIDEOS: Record<string, VideoEntry> = {
  'ii-V-I':          { id: 'RnHBi8R0CAw', title: 'ii-V-I Jazz Backing Track',             channel: 'Jazz Backing Tracks' },
  'Blues':           { id: 'yxTOFJVHBiQ', title: 'Blues Backing Track - 12 Bar Shuffle',   channel: 'Quist Jam Tracks' },
  'Rhythm Changes':  { id: 'KYM-bDOJPr8', title: 'Rhythm Changes Backing Track',           channel: 'Jazz Backing Tracks' },
  'Modal':           { id: 'FsijyBivMgg', title: 'Modal Jazz Backing Track',               channel: 'Jazz Backing Tracks' },
  'I-vi-ii-V':       { id: '7qvZpIKa5aA', title: 'I-vi-ii-V Turnaround Backing Track',    channel: 'Quist Jam Tracks' },
  'Funk':            { id: 'd7FQLR23dXQ', title: 'Funk Progression Backing Track',         channel: 'Elevated Jam Tracks' },
  'Reggae':          { id: 'J5GOSdtFMks', title: 'Reggae Chord Progression Backing Track', channel: 'Elevated Jam Tracks' },
  'Latin':           { id: 'Z2JqZkXiV4Q', title: 'Latin Chord Progression Backing Track',  channel: 'Jazz Backing Tracks' },
  'Neo Soul':        { id: 'bGLjOEDRKLk', title: 'Neo Soul Progression Backing Track',     channel: 'Elevated Jam Tracks' },
  'Afrobeat':        { id: '5L1y5FWPJDI', title: 'Afrobeat Backing Track',                 channel: 'Elevated Jam Tracks' },
  'Gospel':          { id: 'h3ByOYdnhOs', title: 'Gospel Progression Backing Track',       channel: 'Elevated Jam Tracks' },
  'R&B':             { id: 'cKBVOxrIMuQ', title: 'R&B Chord Progression Backing Track',    channel: 'Elevated Jam Tracks' },
};
