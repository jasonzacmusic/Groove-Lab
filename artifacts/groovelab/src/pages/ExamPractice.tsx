import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  GraduationCap, BookOpen, Music, ChevronDown, ChevronRight,
  ListMusic, Piano, Guitar, Drum,
} from 'lucide-react';
import { YouTubeInline } from '@/components/YouTubeInline';
import { ScalePlayer } from '@/components/ScalePlayer';
import {
  EXAM_BOARDS, INSTRUMENTS, GRADES,
  getMethodBooks, PIANO_METHODS,
} from '@/data/exam-videos';
import {
  GRADE_REQUIREMENTS,
  getPieces,
  type ScaleReq,
  type ArpeggioReq,
} from '@/data/exam-syllabus';
import videoDb from '@/data/exam-video-ids.json';

const VIDEO_DB = videoDb as Record<string, { id: string; title: string; channel?: string }[]>;

function examChannel(board: string): string {
  const channels: Record<string, string> = {
    ABRSM: 'ABRSM Play-Alongs',
    Trinity: 'Trinity Rock & Pop',
    Rockschool: 'RSL Awards',
    RCM: 'RCM Practice',
    LCM: 'LCM Exams',
    AMEB: 'AMEB Music',
  };
  return channels[board] || 'Practice Tracks';
}

// ── Tab type ──
type Tab = 'scales' | 'pieces' | 'videos';

// ── Scale type display names ──
const SCALE_TYPE_LABELS: Record<string, string> = {
  major: 'Major',
  natural_minor: 'Natural Minor',
  harmonic_minor: 'Harmonic Minor',
  melodic_minor: 'Melodic Minor',
  chromatic: 'Chromatic',
  blues: 'Blues',
  whole_tone: 'Whole Tone',
  dorian: 'Dorian',
  mixolydian: 'Mixolydian',
  pentatonic: 'Pentatonic',
};

const ARPEGGIO_TYPE_LABELS: Record<string, string> = {
  major: 'Major',
  minor: 'Minor',
  dominant7: 'Dominant 7th',
  diminished7: 'Diminished 7th',
  augmented: 'Augmented',
};

export default function ExamPractice() {
  const [board, setBoard] = useState<string>('ABRSM');
  const [instrument, setInstrument] = useState<string>('Piano');
  const [grade, setGrade] = useState<string>('Grade 1');
  const [tab, setTab] = useState<Tab>('scales');
  const [expandedScale, setExpandedScale] = useState<string | null>(null);

  const isDrumsOrVocals = instrument === 'Drums' || instrument === 'Vocals';

  const availableGrades = useMemo(() => {
    return GRADES[board] || ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];
  }, [board]);

  const requirements = GRADE_REQUIREMENTS[grade];
  const pieces = getPieces(board, instrument, grade);

  // Determine clef based on instrument
  const clef = (instrument === 'Cello' || instrument === 'Bass') ? 'bass' : 'treble';

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-144px)]">
      {/* ── Sidebar ── */}
      <div className="w-full md:w-[280px] border-b md:border-b-0 md:border-r border-border overflow-y-auto flex-shrink-0">
        <div className="p-4">
          <h2 className="font-serif text-2xl mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Exam Practice
          </h2>

          {/* Board selector */}
          <div className="mb-4">
            <label className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2 block">
              Exam Board
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EXAM_BOARDS.filter(b => b.id !== 'Methods').map(b => (
                <button
                  key={b.id}
                  onClick={() => { setBoard(b.id); setGrade(availableGrades[0] || 'Grade 1'); }}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    board === b.id ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                  title={b.fullName}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* Instrument selector */}
          <div className="mb-4">
            <label className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2 block">
              Instrument
            </label>
            <div className="flex flex-wrap gap-1.5">
              {INSTRUMENTS.map(i => (
                <button
                  key={i}
                  onClick={() => setInstrument(i)}
                  className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    instrument === i ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Grade selector */}
          <div className="mb-4">
            <label className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2 block">
              Grade / Level
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableGrades.map(g => (
                <button
                  key={g}
                  onClick={() => setGrade(g)}
                  className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    grade === g ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Board info */}
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <p className="text-xs font-medium">
              {EXAM_BOARDS.find(b => b.id === board)?.fullName}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {EXAM_BOARDS.find(b => b.id === board)?.region}
            </p>
          </div>

          <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-[11px] text-muted-foreground">
              Scales & arpeggios with staff notation and playback. Pieces with YouTube performances. Always verify against the latest published syllabus.
            </p>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Tab bar */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 md:px-6">
          <div className="flex gap-1 py-2">
            {[
              { id: 'scales' as Tab, label: 'Scales & Technical', icon: Music },
              { id: 'pieces' as Tab, label: 'Pieces', icon: BookOpen },
              { id: 'videos' as Tab, label: 'Videos', icon: ListMusic },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 md:p-6">
          <h3 className="font-serif text-xl mb-1">
            {board} {grade} — {instrument}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {tab === 'scales' && 'Scales, arpeggios, and technical exercises with notation and playback.'}
            {tab === 'pieces' && 'Set pieces for this grade. Click to find performances on YouTube.'}
            {tab === 'videos' && 'YouTube performances, tutorials, and exam tips.'}
          </p>

          {/* ── SCALES TAB ── */}
          {tab === 'scales' && (
            <div className="space-y-6">
              {isDrumsOrVocals ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Drum className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">
                    Traditional scales are not applicable for {instrument}.
                  </p>
                  <p className="text-xs mt-2">
                    Check the Videos tab for {instrument === 'Drums' ? 'rudiments and sticking patterns' : 'vocal exercises and interval training'}.
                  </p>
                </div>
              ) : requirements ? (
                <>
                  {/* Scales */}
                  <div>
                    <h4 className="font-serif text-lg mb-3 flex items-center gap-2">
                      <Music className="w-4 h-4 text-primary" />
                      Scales
                    </h4>
                    <div className="space-y-2">
                      {requirements.scales.map((req, idx) => (
                        <ScaleRequirementBlock
                          key={`scale-${idx}`}
                          req={req}
                          mode="scale"
                          octaves={req.octaves}
                          expandedId={expandedScale}
                          onToggle={setExpandedScale}
                          idPrefix="scale"
                          idx={idx}
                          clef={clef}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Arpeggios */}
                  <div>
                    <h4 className="font-serif text-lg mb-3 flex items-center gap-2">
                      <Music className="w-4 h-4 text-amber-500" />
                      Arpeggios
                    </h4>
                    <div className="space-y-2">
                      {requirements.arpeggios.map((req, idx) => (
                        <ScaleRequirementBlock
                          key={`arp-${idx}`}
                          req={req}
                          mode="arpeggio"
                          octaves={req.octaves}
                          expandedId={expandedScale}
                          onToggle={setExpandedScale}
                          idPrefix="arp"
                          idx={idx}
                          clef={clef}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Additional requirements */}
                  {requirements.additional && requirements.additional.length > 0 && (
                    <div>
                      <h4 className="font-serif text-lg mb-3">Additional Requirements</h4>
                      <ul className="space-y-1.5">
                        {requirements.additional.map((item, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">-</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">Scale requirements not yet available for {grade}.</p>
                </div>
              )}
            </div>
          )}

          {/* ── PIECES TAB ── */}
          {tab === 'pieces' && (
            <div className="space-y-6">
              {pieces.length > 0 ? (
                <>
                  {/* Group by list */}
                  {['A', 'B', 'C', 'List 1', 'List 2', 'List 3'].map(list => {
                    const listPieces = pieces.filter(p => p.list === list);
                    if (listPieces.length === 0) return null;
                    return (
                      <div key={list}>
                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
                          List {list}
                        </h4>
                        <div className="space-y-3">
                          {listPieces.map((piece, i) => (
                            <PieceCard
                              key={`${list}-${i}`}
                              piece={piece}
                              instrument={instrument}
                              board={board}
                              grade={grade}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {/* Ungrouped pieces */}
                  {(() => {
                    const ungrouped = pieces.filter(p => !['A', 'B', 'C', 'List 1', 'List 2', 'List 3'].includes(p.list));
                    if (ungrouped.length === 0) return null;
                    return (
                      <div>
                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
                          Set Pieces
                        </h4>
                        <div className="space-y-3">
                          {ungrouped.map((piece, i) => (
                            <PieceCard key={`other-${i}`} piece={piece} instrument={instrument} board={board} grade={grade} />
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Piece list not yet available for {board} {grade} {instrument}.</p>
                  <p className="text-xs mt-2">Check the Videos tab for performances and backing tracks.</p>
                </div>
              )}
            </div>
          )}

          {/* ── VIDEOS TAB ── */}
          {tab === 'videos' && (() => {
            const dbKey = `${board}|${instrument}|${grade}`;
            const known = VIDEO_DB[dbKey] || [];
            const ch = examChannel(board);
            return (
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-base mb-3">{board} {grade} {instrument} — Curated Videos</h3>
                  {known.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {known.map((v) => (
                        <YouTubeInline
                          key={v.id}
                          videoId={v.id}
                          title={v.title}
                          channel={v.channel || ch}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
                      <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm text-muted-foreground">
                        No curated videos yet for {board} {grade} {instrument}. We're adding more every week.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ── Scale Requirement Block ──
function ScaleRequirementBlock({
  req, mode, octaves, expandedId, onToggle, idPrefix, idx, clef,
}: {
  req: ScaleReq | ArpeggioReq;
  mode: 'scale' | 'arpeggio';
  octaves: number;
  expandedId: string | null;
  onToggle: (id: string | null) => void;
  idPrefix: string;
  idx: number;
  clef: string;
}) {
  const typeLabel = mode === 'scale'
    ? SCALE_TYPE_LABELS[req.type] || req.type
    : ARPEGGIO_TYPE_LABELS[req.type] || req.type;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => {
          const id = `${idPrefix}-${idx}`;
          onToggle(expandedId === id ? null : id);
        }}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {expandedId === `${idPrefix}-${idx}` ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">{typeLabel}</span>
          <div className="flex gap-1 flex-wrap">
            {req.keys.map(k => (
              <Badge key={k} variant="outline" className="text-[10px] font-mono">{k}</Badge>
            ))}
          </div>
        </div>
        <Badge variant="secondary" className="text-[10px]">{octaves} oct.</Badge>
      </button>

      {expandedId === `${idPrefix}-${idx}` && (
        <div className="border-t border-border p-3 space-y-3 bg-muted/20">
          {req.keys.map(k => (
            <ScalePlayer
              key={`${k}-${req.type}`}
              scaleKey={k}
              type={req.type}
              octaves={octaves}
              mode={mode}
              clef={clef}
              label={`${k} ${typeLabel} (${octaves} octave${octaves > 1 ? 's' : ''})`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Piece Card ──
function PieceCard({
  piece, instrument, board, grade,
}: {
  piece: { title: string; composer: string; list: string };
  instrument: string;
  board: string;
  grade: string;
}) {
  // Look up curated videos for this board/instrument/grade slot.
  const dbKey = `${board}|${instrument}|${grade}`;
  const slotVideos = VIDEO_DB[dbKey] || [];
  // Filter to videos that mention this piece by title (case-insensitive).
  const titleLower = piece.title.toLowerCase();
  const matched = slotVideos.filter(v => v.title.toLowerCase().includes(titleLower)).slice(0, 2);
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h5 className="font-medium text-sm truncate">{piece.title}</h5>
            <p className="text-xs text-muted-foreground">{piece.composer}</p>
          </div>
          {matched.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1 flex-shrink-0"
              onClick={() => setExpanded(!expanded)}
            >
              <Music className="w-3 h-3" />
              {expanded ? 'Hide' : `${matched.length} video${matched.length === 1 ? '' : 's'}`}
            </Button>
          )}
        </div>
        {expanded && matched.length > 0 && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {matched.map(v => (
              <YouTubeInline
                key={v.id}
                videoId={v.id}
                title={v.title}
                channel={v.channel || examChannel(board)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
