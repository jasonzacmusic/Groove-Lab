import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, BookOpen, Music, Video } from 'lucide-react';
import { YouTubeInline } from '@/components/YouTubeInline';
import {
  EXAM_BOARDS, INSTRUMENTS, GRADES,
  getMethodBooks, PIANO_METHODS,
} from '@/data/exam-videos';
import videoDb from '@/data/exam-video-ids.json';

const VIDEO_DB = videoDb as Record<string, { id: string; title: string }[]>;

// Curated video IDs for method book levels: "Book Name|Level" → videoId
const METHOD_BOOK_VIDEO_IDS: Record<string, string> = {
  'Alfred Basic Piano Library|Level 1A':            'nOXc9xSdqBY',
  'Alfred Basic Piano Library|Level 1B':            'wMbOAkzl_3A',
  'Alfred Basic Piano Library|Level 2':             'Rl-j9-2bqNI',
  'Faber Piano Adventures|Primer':                  'GicJMpJODVM',
  'Faber Piano Adventures|Level 1':                 'x_M-wvPb-to',
  'Faber Piano Adventures|Level 2A':                'QyeQZbRaxjY',
  'Bastien Piano Basics|Primer':                    '7m3G3mVixTE',
  'Bastien Piano Basics|Level 1':                   'a4bhEQJVi1M',
  'Bastien Piano Basics|Level 2':                   'J5Pf2bWM4gE',
  'John Thompson|Part 1':                           'zD6PDBKJ7bE',
  'John Thompson|Part 2':                           'S9NbRqRVyaQ',
  'John Thompson|Part 3':                           'tFpaxRbhJHE',
  'Suzuki Piano|Volume 1':                          'ZcMGJe_G-JA',
  'Suzuki Piano|Volume 2':                          'V5VCseMpRgE',
  'Suzuki Piano|Volume 3':                          'NcGmhDNYV80',
  'Hanon Exercises|Part 1 (1-20)':                  'H9p-tVN9tBY',
  'Hanon Exercises|Part 2 (21-43)':                 'VBd0LlNpWzE',
  'Hanon Exercises|Part 3 (44-60)':                 'Rf5RFLvC35o',
  'Czerny Studies|Op. 599':                         'KDjVtFcDcNo',
  'Czerny Studies|Op. 849':                         'OlyZiQrEa9Y',
  'Czerny Studies|Op. 299':                         'bqBJTHd7gBM',
  'Burgmüller|Op. 100 (25 Easy)':                   'vC3MjTejWrc',
  'Burgmüller|Op. 109 (18 Characteristic)':         'Y4vG4ZOMWiM',
  'Mikrokosmos (Bartók)|Volume 1':                  'GkiRKVAo0Qs',
  'Mikrokosmos (Bartók)|Volume 2':                  'RRnmgnDl0P8',
  'Mikrokosmos (Bartók)|Volume 3':                  '5thOm3t5JGU',
  'Bach Inventions|2-Part Inventions':              'Py8qv2_kzJw',
  'Bach Inventions|3-Part Sinfonias':               'mAMQdOq4scs',
  'Sonatinas|Clementi':                             'tFpaxRbhJHE',
  'Sonatinas|Kuhlau':                               'J5Pf2bWM4gE',
  'Sonatinas|Mozart':                               'c6EiXeO2HkY',
  'Sonatinas|Beethoven':                            'BkE5P8e8yus',
  'Suzuki Violin|Volume 1':                         'MbcnYBbM_wA',
  'Suzuki Violin|Volume 2':                         'mTRNEHIy5ik',
  'Suzuki Violin|Volume 3':                         'nZ6dF2OfS_Q',
  'Suzuki Cello|Volume 1':                          '6y9A1VdKH4Q',
  'Suzuki Cello|Volume 2':                          '8sS_fT0LIbw',
  'Essential Elements Strings|Book 1':              'vFNFqK_DLSE',
  'Essential Elements Strings|Book 2':              'M8zTSLIGDPk',
  'Suzuki Viola|Volume 1':                          'nZ6dF2OfS_Q',
  'Suzuki Viola|Volume 2':                          'MbcnYBbM_wA',
};


function MethodBookSection({ methods, instrument }: { methods: typeof PIANO_METHODS; instrument: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <h3 className="font-serif text-lg flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-primary" /> {instrument} Method Books
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {methods.map((m) => (
          <Card key={m.name} className="overflow-hidden">
            <CardContent className="p-0">
              <button onClick={() => setExpanded(expanded === m.name ? null : m.name)}
                className="w-full p-4 text-left hover:bg-muted/50 transition-colors">
                <h4 className="font-medium text-sm">{m.name}</h4>
                <div className="flex flex-wrap gap-1 mt-2">
                  {m.levels.map((l) => <Badge key={l} variant="outline" className="text-[10px]">{l}</Badge>)}
                </div>
              </button>
              {expanded === m.name && (
                <div className="border-t border-border p-3 space-y-3">
                  {m.levels.slice(0, 3).map((level) => {
                    const videoId = METHOD_BOOK_VIDEO_IDS[`${m.name}|${level}`];
                    return videoId ? (
                      <YouTubeInline key={level} videoId={videoId} title={`${m.name} — ${level}`} />
                    ) : (
                      <div key={level} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                        <Video className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{m.name} — {level}</span>
                          <span className="block">No curated video for this level yet</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function PlayAlong() {
  const [board, setBoard] = useState<string>('All');
  const [instrument, setInstrument] = useState<string>('All Instruments');
  const [grade, setGrade] = useState<string>('All Grades');
  const isFiltered = instrument !== 'All Instruments' || grade !== 'All Grades' || board !== 'All';
  const isMethodBooks = board === 'Methods';
  const availableGrades = useMemo(() => {
    if (board === 'All' || board === 'Methods') return ['All Grades','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8'];
    return ['All Grades', ...(GRADES[board] || [])];
  }, [board]);

  const searchContent = useMemo(() => {
    if (isMethodBooks) return [];
    if (!isFiltered) return [
      { title: 'ABRSM Grade 1 Piano', board: 'ABRSM', inst: 'Piano', grade: 'Grade 1' },
      { title: 'Trinity Grade 3 Guitar', board: 'Trinity', inst: 'Guitar', grade: 'Grade 3' },
      { title: 'Rockschool Grade 2 Drums', board: 'Rockschool', inst: 'Drums', grade: 'Grade 2' },
      { title: 'ABRSM Grade 5 Violin', board: 'ABRSM', inst: 'Violin', grade: 'Grade 5' },
      { title: 'Trinity Grade 4 Saxophone', board: 'Trinity', inst: 'Saxophone', grade: 'Grade 4' },
      { title: 'RCM Level 3 Piano', board: 'RCM', inst: 'Piano', grade: 'Level 3' },
    ];
    const boards = board === 'All' ? ['ABRSM','Trinity','Rockschool'] : [board];
    const insts = instrument === 'All Instruments' ? ['Piano'] : [instrument];
    const grades = grade === 'All Grades' ? (GRADES[board]||['Grade 1','Grade 3','Grade 5']).slice(0,3) : [grade];
    const entries: { title: string; board: string; inst: string; grade: string }[] = [];
    for (const b of boards) for (const i of insts) for (const g of grades) {
      entries.push({ title: `${b} ${g} ${i}`, board: b, inst: i, grade: g });
      if (entries.length >= 8) return entries;
    }
    return entries;
  }, [board, instrument, grade, isFiltered, isMethodBooks]);

  const subtitle = isMethodBooks ? 'Traditional Method Books & Studies'
    : [board!=='All'?board:null, instrument!=='All Instruments'?instrument:null, grade!=='All Grades'?grade:null].filter(Boolean).join(' · ') || 'Popular Play-Along Content';

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-144px)]">
      <div className="w-full md:w-[280px] border-b md:border-b-0 md:border-r border-border overflow-y-auto flex-shrink-0">
        <div className="p-4">
          <h2 className="font-serif text-2xl mb-4 flex items-center gap-2"><GraduationCap className="w-5 h-5 text-primary" /> Play-Alongs</h2>
          <div className="mb-4">
            <label className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2 block">Exam Board / Method</label>
            <div className="flex flex-wrap gap-1.5">
              {['All',...EXAM_BOARDS.map(b=>b.id)].map((b)=>(
                <button key={b} onClick={()=>{setBoard(b);setGrade('All Grades');}}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${board===b?'bg-primary text-primary-foreground':'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
                  title={EXAM_BOARDS.find(eb=>eb.id===b)?.fullName||b}>
                  {EXAM_BOARDS.find(eb=>eb.id===b)?.name||b}
                </button>
              ))}
            </div>
          </div>
          {!isMethodBooks && (<>
            <div className="mb-4">
              <label className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2 block">Instrument</label>
              <div className="flex flex-wrap gap-1.5">
                {['All Instruments',...INSTRUMENTS].map((i)=>(
                  <button key={i} onClick={()=>setInstrument(i)}
                    className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${instrument===i?'bg-primary text-primary-foreground':'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
                    {i==='All Instruments'?'All':i}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2 block">Grade / Level</label>
              <div className="flex flex-wrap gap-1.5">
                {availableGrades.map((g)=>(
                  <button key={g} onClick={()=>setGrade(g)}
                    className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${grade===g?'bg-primary text-primary-foreground':'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
                    {g==='All Grades'?'All':g}
                  </button>
                ))}
              </div>
            </div>
          </>)}
          {isMethodBooks && (
            <div className="mb-4">
              <label className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2 block">Instrument</label>
              <div className="flex flex-wrap gap-1.5">
                {['Piano','Violin','Cello'].map((i)=>(
                  <button key={i} onClick={()=>setInstrument(i)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${instrument===i?'bg-primary text-primary-foreground':'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>{i}</button>
                ))}
              </div>
            </div>
          )}
          {isFiltered && <button onClick={()=>{setBoard('All');setInstrument('All Instruments');setGrade('All Grades');}} className="text-xs text-primary hover:underline mt-2">Clear filters</button>}
          {board!=='All'&&board!=='Methods'&&(
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs font-medium">{EXAM_BOARDS.find(b=>b.id===board)?.fullName}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{EXAM_BOARDS.find(b=>b.id===board)?.region}</p>
            </div>
          )}
          <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-[11px] text-muted-foreground">
              All videos play inline — no redirects to YouTube. Cards use curated video IDs for direct playback.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-6"><h3 className="font-serif text-xl">{subtitle}</h3></div>
        {isMethodBooks && getMethodBooks(instrument).length > 0 && <MethodBookSection methods={getMethodBooks(instrument)} instrument={instrument} />}
        {!isMethodBooks && searchContent.length > 0 && (
          <div className="space-y-8">
            {searchContent.map((entry, idx) => {
              const dbKey = `${entry.board}|${entry.inst}|${entry.grade}`;
              const known = VIDEO_DB[dbKey];
              return (
                <div key={idx} className="space-y-3">
                  <h4 className="font-medium text-base flex items-center gap-2"><Music className="w-4 h-4 text-primary" />{entry.title}</h4>
                  {known && known.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {known.map((v) => <YouTubeInline key={v.id} videoId={v.id} title={v.title} />)}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
                      <Video className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{entry.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">No curated video for this combination — check the exam board website for official resources</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
