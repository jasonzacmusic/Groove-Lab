# GrooveLab by Nathaniel School — Complete Build Specification

## CRITICAL INSTRUCTIONS FOR THE AI AGENT

You are building GrooveLab (groovelab.nathanielschool.com) — a music education platform that is the world's most comprehensive loop, MIDI, chord progression, and rhythm practice tool. This is a Next.js 14 app with App Router, deployed to Vercel, using Neon PostgreSQL. The entire frontend must look NOTHING like a typical AI-generated website. No purple gradients, no Inter/Roboto fonts, no generic card layouts. This must feel like it was designed by a world-class music product design studio.

## BRAND & IDENTITY

- **Name**: GrooveLab by Nathaniel School
- **Domain**: groovelab.nathanielschool.com
- **Favicon**: Use the logo from https://nathanielschool.com (fetch it and use it as favicon)
- **YouTube Channel**: https://www.youtube.com/@jasonzacmusic

## DESIGN DIRECTION — NON-NEGOTIABLE

### Aesthetic: "Vinyl Warmth meets Digital Precision"

Think: the warmth of a jazz record sleeve married with the precision of a modern DAW interface. NOT a generic SaaS dashboard. NOT a cookie-cutter education platform.

### Typography
- **Display/Headings**: Use "DM Serif Display" from Google Fonts — warm, musical, serif character
- **Body/UI**: Use "IBM Plex Sans" from Google Fonts — clean, technical, readable
- **Monospace (for BPM/counts)**: Use "IBM Plex Mono" — for metronome displays, time signatures
- NEVER use Inter, Roboto, Arial, or system-ui for any visible text

### Color System
```css
:root {
  /* Core palette — warm, musical, NOT generic tech blue/purple */
  --midnight: #1a1a2e;        /* Deep background */
  --charcoal: #16213e;        /* Card backgrounds */
  --warm-black: #0f0f0f;      /* True dark */
  --amber: #e2a832;           /* Primary accent — warm gold like a vinyl label */
  --amber-light: #f5d76e;     /* Hover state */
  --amber-dim: #b8860b;       /* Muted accent */
  --coral: #e74c3c;           /* Secondary accent — energetic, for active/playing states */
  --sage: #7fb069;            /* Success/positive */
  --cream: #f5f0e8;           /* Light text on dark */
  --warm-gray: #a0998a;       /* Secondary text */
  --paper: #faf8f5;           /* Light mode background — like aged paper */
  --ink: #2c2c2c;             /* Dark text on light */

  /* Functional */
  --playing: #e74c3c;         /* Currently playing indicator */
  --beat-active: #e2a832;     /* Active beat in sequencer */
  --beat-inactive: #2a2a3e;   /* Inactive beat */
  --subdivision-line: rgba(226, 168, 50, 0.3);
}
```

### Layout Philosophy
- **Full-bleed sections** with generous padding, NOT cramped card grids
- **Horizontal scroll carousels** for loop categories (like Spotify/Apple Music), not vertical lists
- **Large touch targets** — this is used by musicians with instruments in hand
- **Dark mode default** (musicians practice in dim rooms), light mode available
- **Bottom navigation on mobile** (thumb-reachable), sidebar on desktop
- **Vinyl/record motifs** — circular elements, grooves, subtle textures
- **NO generic hero sections** — the app IS the homepage, launch straight into browsing

### Micro-interactions & Motion
- Beat indicators pulse with a warm glow on each beat
- Cards have a subtle vinyl-groove texture on hover
- Page transitions slide horizontally like flipping through a record collection
- The pizza beat sequencer circles rotate smoothly during playback
- Loading states show a stylized turntable needle animation, NOT a spinner

### Age-Appropriate Design
- The UI must work for ages 6 to 60+
- Large, clear icons with text labels (not icon-only)
- Simple primary actions always visible; advanced features in expandable panels
- Kid-friendly mode: larger buttons, brighter colors, simplified taxonomy (just "style" and "speed")
- Pro mode: full taxonomy, detailed metadata, keyboard shortcuts

---

## TECH STACK

```
Framework: Next.js 14 (App Router)
Language: TypeScript
Styling: Tailwind CSS + custom CSS variables (above)
Database: Neon PostgreSQL (connection via @neondatabase/serverless)
Auth: NextAuth.js with Google OAuth + email/password (bcrypt)
Audio: Tone.js (MIDI playback, metronome, sampler)
MIDI Parsing: @tonejs/midi (parse .mid files to JSON)
YouTube: YouTube IFrame API (embed player) + YouTube Data API v3 (search/metadata)
Real-time: Vercel serverless WebSocket via Ably or Pusher (for live sessions)
State: Zustand (lightweight, no Redux boilerplate)
Icons: Lucide React
Fonts: Google Fonts (DM Serif Display, IBM Plex Sans, IBM Plex Mono)
```

### Environment Variables Needed
```
DATABASE_URL=             # Neon PostgreSQL connection string
YOUTUBE_API_KEY=          # YouTube Data API v3 key
NEXTAUTH_SECRET=          # Random secret for NextAuth
NEXTAUTH_URL=             # https://groovelab.nathanielschool.com
GOOGLE_CLIENT_ID=         # Google OAuth
GOOGLE_CLIENT_SECRET=     # Google OAuth
```

---

## DATABASE SCHEMA (Neon PostgreSQL)

Create ALL these tables. Use Drizzle ORM for type safety.

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'student', -- student, teacher, admin
  age_group VARCHAR(20) DEFAULT 'standard', -- kid (6-12), teen (13-17), standard (18+)
  created_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP DEFAULT NOW()
);

-- Taxonomy: Time Signatures
CREATE TABLE time_signatures (
  id SERIAL PRIMARY KEY,
  numerator INT NOT NULL,
  denominator INT NOT NULL,
  display_name VARCHAR(20) NOT NULL, -- "4/4", "7/8"
  category VARCHAR(20) NOT NULL, -- common, uncommon, odd
  sort_order INT DEFAULT 0
);

-- Seed time signatures
INSERT INTO time_signatures (numerator, denominator, display_name, category, sort_order) VALUES
(4, 4, '4/4', 'common', 1), (3, 4, '3/4', 'common', 2), (6, 8, '6/8', 'common', 3),
(2, 4, '2/4', 'common', 4), (12, 8, '12/8', 'common', 5),
(5, 4, '5/4', 'uncommon', 10), (7, 8, '7/8', 'uncommon', 11), (5, 8, '5/8', 'uncommon', 12),
(9, 8, '9/8', 'uncommon', 13), (7, 4, '7/4', 'uncommon', 14),
(11, 8, '11/8', 'odd', 20), (15, 8, '15/8', 'odd', 21), (13, 8, '13/8', 'odd', 22),
(10, 8, '10/8', 'odd', 23);

-- Taxonomy: Feels
CREATE TABLE feels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  sort_order INT DEFAULT 0
);

INSERT INTO feels (name, description, sort_order) VALUES
('Straight', 'Even, grid-locked subdivisions', 1),
('Swing', 'Triplet-based, long-short pattern', 2),
('Shuffle', 'Heavy shuffle groove', 3),
('Triplet', 'Pure triplet feel', 4),
('Tresillo', '3-3-2 Afro-Cuban rhythmic cell', 5),
('Clave (Son)', 'Son clave pattern 3-2 or 2-3', 6),
('Clave (Rumba)', 'Rumba clave pattern', 7),
('Neo-Soul Pocket', 'Behind-the-beat, laid back', 8),
('Funk (On Top)', 'Ahead of beat, driving', 9),
('Laggy', 'Intentionally behind the beat', 10),
('Half-Time', 'Half-time feel within tempo', 11),
('Double-Time', 'Double-time feel within tempo', 12),
('Second Line', 'New Orleans parade rhythm', 13);

-- Taxonomy: Genres
CREATE TABLE genres (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  parent_genre_id INT REFERENCES genres(id),
  sort_order INT DEFAULT 0
);

INSERT INTO genres (name, sort_order) VALUES
('Jazz', 1), ('Blues', 2), ('Funk', 3), ('Neo-Soul', 4), ('R&B', 5),
('Gospel', 6), ('Rock', 7), ('Pop', 8), ('Latin', 9), ('Bossa Nova', 10),
('Samba', 11), ('Salsa', 12), ('Afro-Cuban', 13), ('Afrobeat', 14),
('Reggae', 15), ('Hip-Hop', 16), ('Drum & Bass', 17), ('Electronic', 18),
('Classical', 19), ('World', 20), ('Country', 21), ('Fusion', 22),
('Progressive', 23), ('Metal', 24), ('Ska', 25);

-- Taxonomy: Instrument Types
CREATE TABLE instrument_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  category VARCHAR(30) NOT NULL, -- rhythm, pitched, full
  sort_order INT DEFAULT 0
);

INSERT INTO instrument_types (name, category, sort_order) VALUES
('Drums Only', 'rhythm', 1), ('Percussion Only', 'rhythm', 2),
('Drums + Percussion', 'rhythm', 3), ('Hi-Hat Patterns', 'rhythm', 4),
('Drum + Bass', 'full', 5), ('Full Rhythm Section', 'full', 6),
('Piano Comping', 'pitched', 7), ('Guitar Comping', 'pitched', 8),
('Bass Lines', 'pitched', 9), ('Chord Progressions', 'pitched', 10),
('Full Band (minus one)', 'full', 11);

-- Content Types
CREATE TABLE content_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  icon VARCHAR(50),
  sort_order INT DEFAULT 0
);

INSERT INTO content_types (name, icon, sort_order) VALUES
('Drum Loop', 'drum', 1), ('Percussion Loop', 'triangle', 2),
('Groove', 'music', 3), ('Chord Progression', 'piano', 4),
('Jazz Standard', 'music-2', 5), ('Play-Along', 'play', 6),
('Backing Track', 'headphones', 7), ('Metronome Pattern', 'clock', 8),
('MIDI Pattern', 'cpu', 9);

-- YouTube Creators (channels)
CREATE TABLE creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_channel_id VARCHAR(50) UNIQUE,
  channel_name VARCHAR(255) NOT NULL,
  channel_url TEXT,
  subscriber_count INT DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  video_count INT DEFAULT 0,
  description TEXT,
  avatar_url TEXT,
  quality_score DECIMAL(3,2) DEFAULT 0.00, -- 0.00 to 1.00
  is_verified BOOLEAN DEFAULT false,
  is_claimed BOOLEAN DEFAULT false,
  claimed_by_user_id UUID REFERENCES users(id),
  paypal_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Loops (master catalog — can be YouTube or MIDI or external link)
CREATE TABLE loops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  source_type VARCHAR(20) NOT NULL, -- youtube, midi_upload, midi_library, external
  youtube_video_id VARCHAR(20),
  youtube_embed_url TEXT,
  midi_file_url TEXT,
  midi_data JSONB, -- parsed MIDI JSON from @tonejs/midi
  external_url TEXT,
  external_source VARCHAR(100), -- 'looperman', 'wikiloops', etc.

  creator_id UUID REFERENCES creators(id),
  uploaded_by_user_id UUID REFERENCES users(id),

  bpm INT,
  bpm_range_low INT, -- for variable-tempo loops
  bpm_range_high INT,
  key_signature VARCHAR(10), -- 'C', 'Bb', 'F#m'
  duration_seconds INT,

  -- Quality metrics (YouTube)
  view_count BIGINT DEFAULT 0,
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  quality_score DECIMAL(3,2) DEFAULT 0.00,
  is_embeddable BOOLEAN DEFAULT true,

  -- AI classification
  ai_classified BOOLEAN DEFAULT false,
  ai_confidence DECIMAL(3,2),
  description TEXT,
  tags TEXT[], -- raw tags from YouTube or uploader

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Junction: Loop <-> Taxonomy tags (many-to-many)
CREATE TABLE loop_time_signatures (
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  time_signature_id INT REFERENCES time_signatures(id),
  PRIMARY KEY (loop_id, time_signature_id)
);

CREATE TABLE loop_feels (
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  feel_id INT REFERENCES feels(id),
  PRIMARY KEY (loop_id, feel_id)
);

CREATE TABLE loop_genres (
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  genre_id INT REFERENCES genres(id),
  PRIMARY KEY (loop_id, genre_id)
);

CREATE TABLE loop_instrument_types (
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  instrument_type_id INT REFERENCES instrument_types(id),
  PRIMARY KEY (loop_id, instrument_type_id)
);

CREATE TABLE loop_content_types (
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  content_type_id INT REFERENCES content_types(id),
  PRIMARY KEY (loop_id, content_type_id)
);

-- User favorites
CREATE TABLE favorites (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, loop_id)
);

-- User playlists
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE playlist_items (
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  loop_id UUID REFERENCES loops(id) ON DELETE CASCADE,
  position INT NOT NULL,
  PRIMARY KEY (playlist_id, loop_id)
);

-- Live Sessions
CREATE TABLE live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(10) UNIQUE NOT NULL,
  teacher_id UUID REFERENCES users(id),
  title VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  current_loop_id UUID REFERENCES loops(id),
  current_tempo INT,
  created_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);

CREATE TABLE session_participants (
  session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (session_id, user_id)
);

-- Practice tracking
CREATE TABLE practice_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  loop_id UUID REFERENCES loops(id),
  session_id UUID REFERENCES live_sessions(id),
  duration_seconds INT NOT NULL,
  bpm_practiced INT,
  practiced_at TIMESTAMP DEFAULT NOW()
);

-- Chord progressions (separate detailed table)
CREATE TABLE chord_progressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL, -- "ii-V-I in C", "Autumn Leaves"
  progression_type VARCHAR(50), -- 'standard', 'jazz_standard', 'blues', 'modal', 'custom'
  chords JSONB NOT NULL, -- [{chord: "Dm7", beats: 4}, {chord: "G7", beats: 4}, ...]
  key_signature VARCHAR(10),
  time_signature_id INT REFERENCES time_signatures(id),
  genre_id INT REFERENCES genres(id),
  difficulty_level INT, -- 1-10
  is_jazz_standard BOOLEAN DEFAULT false,
  composer VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_loops_source_type ON loops(source_type);
CREATE INDEX idx_loops_bpm ON loops(bpm);
CREATE INDEX idx_loops_quality_score ON loops(quality_score DESC);
CREATE INDEX idx_loops_youtube_video_id ON loops(youtube_video_id);
CREATE INDEX idx_loops_is_active ON loops(is_active);
CREATE INDEX idx_creators_quality_score ON creators(quality_score DESC);
CREATE INDEX idx_practice_logs_user ON practice_logs(user_id, practiced_at DESC);
CREATE INDEX idx_live_sessions_room_code ON live_sessions(room_code);
```

---

## APP STRUCTURE (Next.js App Router)

```
app/
├── layout.tsx              # Root layout with fonts, theme provider, nav
├── page.tsx                # Homepage — launches straight into Loop Explorer
├── globals.css             # Tailwind + custom CSS variables + vinyl textures
│
├── explore/
│   └── page.tsx            # MAIN LOOP EXPLORER — taxonomy filters + results + player
│
├── sequencer/
│   └── page.tsx            # BEAT SEQUENCER — pizza UI + sampler + metronome
│
├── midi/
│   └── page.tsx            # MIDI LIBRARY — browse, upload, play MIDI files
│
├── chords/
│   └── page.tsx            # CHORD PROGRESSIONS — browse, play, practice
│
├── standards/
│   └── page.tsx            # JAZZ STANDARDS — curated backing tracks + charts
│
├── play-along/
│   └── page.tsx            # GRADED PLAY-ALONGS — Trinity, ABRSM, RCM
│
├── live/
│   ├── page.tsx            # JOIN a live session (enter room code)
│   └── host/
│       └── page.tsx        # HOST a live session (teacher view)
│
├── practice/
│   └── page.tsx            # PRACTICE TRACKER — streaks, history, recommendations
│
├── creators/
│   └── [id]/
│       └── page.tsx        # CREATOR PROFILE — attribution, donate, videos
│
├── auth/
│   ├── login/page.tsx
│   └── register/page.tsx
│
├── api/
│   ├── auth/[...nextauth]/route.ts
│   ├── loops/route.ts              # GET loops with taxonomy filters
│   ├── loops/[id]/route.ts
│   ├── youtube/search/route.ts     # YouTube API search (server-side)
│   ├── youtube/ingest/route.ts     # Batch ingest endpoint
│   ├── midi/upload/route.ts        # MIDI file upload
│   ├── midi/parse/route.ts         # Parse MIDI to JSON
│   ├── live/create/route.ts        # Create live session
│   ├── live/join/route.ts          # Join live session
│   ├── practice/log/route.ts       # Log practice session
│   ├── favorites/route.ts
│   └── playlists/route.ts
│
components/
├── layout/
│   ├── Navbar.tsx                  # Top nav with search, dark mode toggle
│   ├── Sidebar.tsx                 # Desktop sidebar navigation
│   ├── BottomNav.tsx               # Mobile bottom navigation
│   └── Footer.tsx
│
├── explore/
│   ├── TaxonomyFilter.tsx          # Multi-dimensional filter panel
│   ├── LoopCard.tsx                # Individual loop result card
│   ├── LoopGrid.tsx                # Results grid/carousel
│   ├── YouTubePlayer.tsx           # Embedded YouTube player wrapper
│   ├── QualityBadge.tsx            # Quality score visual indicator
│   ├── GenreMap.tsx                # 2D interactive genre/feel map
│   └── GrooveMatch.tsx             # Compatible loop suggestions
│
├── sequencer/
│   ├── PizzaBeat.tsx               # Single pizza/circle beat (SVG)
│   ├── BeatSequencer.tsx           # Full sequencer with multiple pizzas
│   ├── DrumPadGrid.tsx             # Sample pad grid for MIDI input
│   ├── SwingControl.tsx            # Positive/negative swing slider
│   └── SequencerTransport.tsx      # Play/stop/BPM/time sig controls
│
├── metronome/
│   ├── Metronome.tsx               # Full metronome component
│   ├── AccentPattern.tsx           # f/mf/p/mute per beat
│   ├── SubdivisionPicker.tsx       # 8ths, 16ths, triplets, etc.
│   ├── PolyrhythmLayer.tsx         # Second rhythm layer
│   ├── TempoRamp.tsx               # Gradual tempo change control
│   ├── RhythmTrainer.tsx           # Play N bars / mute N bars
│   ├── TapTempo.tsx                # Tap-to-detect BPM
│   └── TempoDisplay.tsx            # Large BPM display (IBM Plex Mono)
│
├── midi/
│   ├── MidiPlayer.tsx              # Tone.js MIDI playback
│   ├── PianoRollView.tsx           # Scrolling note visualization
│   ├── DrumGridView.tsx            # Step-sequencer style drum view
│   ├── MidiUploader.tsx            # Drag-and-drop MIDI upload
│   ├── TrackMixer.tsx              # Mute/solo individual MIDI tracks
│   └── LoopSurgery.tsx             # Strip/add notes from MIDI
│
├── live/
│   ├── LiveRoom.tsx                # Live session room component
│   ├── RoomCodeDisplay.tsx         # Large room code for sharing
│   ├── SessionQueue.tsx            # Teacher's playlist queue
│   └── SyncIndicator.tsx           # Connection status
│
├── shared/
│   ├── AudioEngine.tsx             # Tone.js context provider
│   ├── CreatorCard.tsx             # Creator attribution component
│   ├── DonateButton.tsx            # PayPal donation button
│   ├── PracticeTimer.tsx           # Session timer
│   ├── SearchBar.tsx               # Global search
│   ├── ThemeToggle.tsx             # Dark/light mode
│   └── LoadingVinyl.tsx            # Vinyl turntable loading animation
```

---

## PAGE-BY-PAGE SPECIFICATIONS

### Homepage (/) — "The Explorer"

This IS the app. No marketing landing page. User opens the site and immediately sees:

1. **Top bar**: GrooveLab logo (left), global search (center), dark/light toggle + auth (right)
2. **Category carousel** (horizontal scroll): "Drum Loops" | "Percussion" | "Grooves" | "Chord Progressions" | "Jazz Standards" | "Play-Alongs" | "MIDI Patterns"
3. **Featured loops section**: 6-8 hand-picked loops with large cards showing creator avatar, title, BPM, time sig, quality badge
4. **Quick filters row**: Time signature pills (4/4, 3/4, 6/8, 5/4, 7/8...), Feel pills (Straight, Swing, Shuffle...), Genre pills
5. **Results grid**: Cards with YouTube thumbnails, showing title, creator, BPM, time sig badges, quality score
6. **Inline player**: When a loop is clicked, a persistent bottom player bar appears (like Spotify) with the YouTube embed, play/pause, and "Groove Match" button

### Explore Page (/explore)

Full taxonomy filter with:
- **Left panel (desktop) / bottom sheet (mobile)**: All filter dimensions as expandable accordion sections
- **Right area**: Results in grid or list view
- **Each filter dimension**: Checkbox/pill selection with result count next to each option
- **"The Map" toggle**: Switch from list view to the 2D genre/feel exploration map
- **Sort by**: Quality Score, Newest, Most Views, BPM (ascending/descending)

### Beat Sequencer Page (/sequencer) — "The Pizza Lab"

This is the BeatScholar-inspired beat maker:

1. **Pattern area** (center): Row of pizza circles, each representing one beat
   - Each pizza is an SVG circle that can be subdivided (click to split: 2, 3, 4, 5, 6, 7, 8, up to 16 slices)
   - Click a slice to place a drum sound (colored by instrument)
   - Drag across slices to paint multiple hits
   - Right-click to remove a hit
   - The currently playing slice highlights with a warm amber glow

2. **Kit selector** (left side):
   - 4 built-in kits: Jazz Acoustic, Rock Studio, 808 Electronic, Latin Percussion
   - Each kit shows 8-12 pad buttons with instrument names
   - Click a pad to select it, then click pizza slices to place
   - Visual: colored circles matching each instrument

3. **Transport bar** (bottom):
   - Play / Stop / Record
   - BPM display (large, IBM Plex Mono) with +/- buttons and tap tempo
   - Time signature selector dropdown
   - Swing slider (-100% to +100%)
   - Volume master

4. **Metronome section** (expandable right panel):
   - All Pro Metronome features (see below)
   - Can play alongside the sequencer or independently

5. **MIDI input indicator**: Shows when a MIDI controller is connected
   - Green dot = connected, pad assignments shown

6. **Export/Share**: Save pattern, export as MIDI, share link

### Metronome (embedded in Sequencer or standalone)

Features matching Pro Metronome:
- BPM: 20-300, fine adjustment ±1 or ±0.1
- Time signature: any numerator (1-15) / denominator (2,4,8,16)
- Beat sounds: 6+ timbres (click, woodblock, rim, cowbell, clave, voice count)
- Accents per beat: f (forte), mf (mezzo-forte), p (piano), mute — visual indicator for each
- Subdivisions: 8ths, 16ths, triplets, dotted notes, quintuplets, septuplets
- Polyrhythm: second independent rhythm layer (e.g., 3 against 4)
- Tempo ramp: start BPM → end BPM over N bars or N minutes, gradual acceleration
- Rhythm trainer: play N bars, mute N bars, configurable
- Tap tempo: tap button or spacebar, calculates average BPM
- Visual beat flash: the current beat pulses with amber glow
- Practice timer: shows elapsed time, optionally set a target duration
- Counting voice: "1, 2, 3, 4" spoken on each beat (use pre-recorded audio samples)

### MIDI Library (/midi)

- Browse pre-seeded MIDI files by taxonomy (same filters as loops)
- Each MIDI file shows: piano roll preview (static), BPM, time sig, instrument channels, duration
- Click to play: opens full MIDI player with Tone.js
  - Piano roll visualization (scrolling blocks)
  - For drum MIDI: drum grid view (step-sequencer style)
  - Track mute/solo toggles
  - Tempo slider (independent of original BPM)
  - Loop on/off toggle
- Upload: drag-and-drop zone for .mid files
  - Auto-parses with @tonejs/midi
  - Shows detected BPM, time sig, tracks
  - Teacher can tag with taxonomy and assign to class
- Loop Surgery mode: click individual notes to delete, simplify patterns

### Chord Progressions (/chords)

- Organized by type: ii-V-I, I-vi-ii-V, 12-bar Blues, Rhythm Changes, Modal Vamps, Custom
- Filter by key (all 12 keys), genre, difficulty
- Each progression shows:
  - Chord symbols in large, clear typography
  - "Play" button: plays the progression via Tone.js with piano voicing
  - "YouTube" button: shows curated YouTube backing tracks for this progression
  - Key transposition buttons (up/down half step, or dropdown)

### Jazz Standards (/standards)

- Searchable database of standards (Autumn Leaves, All The Things You Are, Blue Bossa, etc.)
- Each standard page shows:
  - Chord chart (rendered as clean typography, not an image)
  - Curated YouTube backing tracks (quality-ranked)
  - Inline YouTube player
  - Key transposition
  - MIDI backing track (if available)
  - Composer credit

### Live Session (/live)

**Student view** (/live):
- Enter 6-character room code
- See current loop playing (YouTube embed or MIDI player)
- Synced tempo display
- Session queue (what's coming next)
- "Leave Session" button

**Teacher view** (/live/host):
- "Create Session" button → generates room code
- Large room code display (for sharing on Zoom screen)
- Browse and add loops to session queue
- Play/pause/skip controls
- Tempo override
- Participant list (who's connected)
- "End Session" button

---

## AUDIO ENGINE (Tone.js Integration)

Create a React context provider `AudioEngineProvider` that wraps the app:

```typescript
// Manages Tone.js AudioContext, metronome, MIDI playback, and sampler
// Key features:
// - Lazy initialization (only starts AudioContext on user interaction)
// - Metronome with configurable time sig, subdivisions, accents
// - MIDI file playback with track muting
// - Sampler with loaded drum kit samples
// - Tempo ramp (gradual BPM change)
// - Web MIDI API input handling
```

### Drum Sample Loading Strategy

For the MVP, bundle 4 kits as WAV files in `/public/samples/`:

```
/public/samples/
├── jazz-acoustic/
│   ├── kick.wav
│   ├── snare.wav
│   ├── snare-ghost.wav (low velocity)
│   ├── hihat-closed.wav
│   ├── hihat-open.wav
│   ├── ride.wav
│   ├── ride-bell.wav
│   ├── crash.wav
│   ├── tom-high.wav
│   ├── tom-mid.wav
│   ├── tom-low.wav
│   └── cross-stick.wav
├── rock-studio/
│   └── (same structure, punchier sounds)
├── 808-electronic/
│   ├── kick-808.wav
│   ├── snare-808.wav
│   ├── clap.wav
│   ├── hihat-closed.wav
│   ├── hihat-open.wav
│   ├── cowbell.wav
│   ├── conga.wav
│   ├── tom-808.wav
│   └── cymbal.wav
└── latin-percussion/
    ├── conga-high.wav
    ├── conga-low.wav
    ├── conga-slap.wav
    ├── bongo-high.wav
    ├── bongo-low.wav
    ├── timbale.wav
    ├── cowbell.wav
    ├── clave.wav
    ├── guiro.wav
    ├── shaker.wav
    ├── cabasa.wav
    └── maracas.wav
```

For the initial build, use free samples from public domain sources or generate simple synthesized hits using Tone.js built-in synths (NoiseSynth for snares, MembraneSynth for kicks, MetalSynth for hihats). The synthesized approach works immediately with no file loading delays.

---

## YOUTUBE DATA INTEGRATION

### Search Strategy (Server-Side Only)

YouTube API calls MUST happen server-side (API routes) to protect the API key.

```typescript
// api/youtube/search/route.ts
// Accepts: query, maxResults
// Returns: video objects with id, title, description, channelId, thumbnails, duration
// Quota: 100 units per search.list call — USE SPARINGLY

// api/youtube/ingest/route.ts
// Batch job: searches YouTube with taxonomy-based queries
// Stores results in Neon with parsed metadata
// Runs nightly via Vercel Cron or manual trigger
```

### Embed Strategy (Client-Side)

Use the YouTube IFrame Player API for embedding:
```typescript
// components/explore/YouTubePlayer.tsx
// - Loads IFrame API script dynamically
// - Creates player instance with video ID
// - Supports: play, pause, seek, volume, playback rate
// - Shows creator attribution below player
// - "Open on YouTube" link for full experience
```

### Quality Score Calculation

```typescript
function calculateQualityScore(video: YouTubeVideo, channel: YouTubeChannel): number {
  const subscriberScore = Math.min(channel.subscriberCount / 100000, 1) * 0.25;
  const likeRatio = video.likeCount / Math.max(video.viewCount, 1);
  const likeScore = Math.min(likeRatio * 50, 1) * 0.25;
  const commentScore = Math.min(video.commentCount / Math.max(video.viewCount / 1000, 1), 1) * 0.15;
  const descriptionScore = hasDetailedDescription(video.description) ? 0.10 : 0;
  const embeddableScore = video.embeddable ? 0.15 : 0;
  const channelAgeScore = Math.min(channelAgeDays / 365, 1) * 0.10;
  return subscriberScore + likeScore + commentScore + descriptionScore + embeddableScore + channelAgeScore;
}
```

---

## SEED DATA — INITIAL CONTENT

For the MVP to have content on Day 1, pre-seed the database with:

### YouTube Search Queries to Run (first batch)
```
"drum loop 4/4 straight rock"
"drum loop 4/4 swing jazz"
"drum loop 3/4 jazz waltz"
"drum loop 6/8 blues"
"drum loop 7/8"
"drum loop 5/4"
"neo soul drum loop"
"funk drum loop"
"bossa nova drum loop"
"samba drum loop"
"afro cuban drum loop"
"salsa drum loop"
"reggae drum loop"
"second line drum loop"
"gospel drum loop"
"afrobeat drum loop"
"shuffle drum loop"
"jazz ride cymbal loop"
"percussion loop congas"
"jazz backing track ii V I"
"backing track 12 bar blues"
"jazz standard backing track autumn leaves"
"jazz standard backing track all the things you are"
"jazz standard backing track blue bossa"
"ABRSM piano grade 3 play along"
"Trinity piano grade 4 play along"
"jazz chord progression play along"
"rhythm changes backing track"
```

### Chord Progressions to Seed
Pre-populate the chord_progressions table with at least:
- ii-V-I in all 12 keys
- I-vi-ii-V in all 12 keys
- 12-bar blues (major) in C, F, Bb, Eb, G
- 12-bar blues (minor) in Am, Dm, Gm, Cm
- Rhythm Changes (Bb)
- "Autumn Leaves" changes
- "All The Things You Are" changes
- "Blue Bossa" changes
- "So What" (modal)
- "Impressions" (modal)
- "Take Five" (5/4)
- Basic I-IV-V rock progression
- I-V-vi-IV pop progression

---

## RESPONSIVE DESIGN REQUIREMENTS

### Mobile (< 768px)
- Bottom navigation bar with 5 icons: Explore, Sequencer, MIDI, Live, Profile
- Full-width loop cards in single column
- Taxonomy filters in bottom sheet (slide up)
- Pizza sequencer: 4 pizzas visible, horizontal scroll for more
- YouTube player: full width, fixed bottom bar when playing
- Touch-optimized: minimum 44px touch targets

### Tablet (768px - 1024px)
- 2-column loop card grid
- Sidebar filters (collapsible)
- Pizza sequencer: 8 pizzas visible
- Split view available: filters left, results right

### Desktop (> 1024px)
- 3-4 column loop card grid
- Persistent sidebar navigation
- Pizza sequencer: full width with all pizzas visible
- Keyboard shortcuts (space = play/stop, +/- = tempo, etc.)
- YouTube player can be popped out to corner (picture-in-picture style)

---

## PERFORMANCE REQUIREMENTS

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Lighthouse Performance**: > 90
- **Audio latency** (Tone.js): < 10ms on desktop
- **YouTube embed load**: Use lite-youtube-embed for instant visual, lazy-load iframe on click
- **Images**: Next.js Image component with blur placeholder
- **Fonts**: Preload critical fonts, use font-display: swap
- **Database queries**: All have indexes, paginated (20 per page default)

---

## WHAT TO BUILD FIRST (Priority Order)

1. **Database setup** — all tables, seed data
2. **Layout** — Navbar, Sidebar, BottomNav, theme, fonts
3. **Homepage / Explore page** — taxonomy filters + loop cards (use mock data initially)
4. **YouTube embed player** — persistent bottom bar
5. **Beat Sequencer** — pizza UI with Tone.js synth drums
6. **Metronome** — full Pro Metronome feature set
7. **MIDI player** — upload + playback + piano roll visualization
8. **Auth** — NextAuth with Google OAuth
9. **YouTube API integration** — search + ingest + quality scoring
10. **Live session** — room creation + WebSocket sync
11. **Chord progressions** — browse + play
12. **Practice tracker** — logging + streaks

---

## FINAL NOTES

- Every page must have the GrooveLab branding visible
- Creator attribution is MANDATORY on every loop — show channel name, subscriber count, link
- The site must feel instant — use optimistic UI, skeleton loaders styled as vinyl groove lines
- Dark mode is default; light mode uses warm paper tones, not stark white
- No loading spinners — use the vinyl/turntable needle animation
- All audio features must handle the browser autoplay policy (require user gesture to start AudioContext)
- Error states should be friendly and musical ("Oops, that beat dropped — try again")
- Empty states should suggest actions ("No loops found with these filters — try broadening your search or explore The Map")
