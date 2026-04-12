import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GraduationCap, BookOpen, Music } from 'lucide-react';
import {
  EXAM_BOARDS, INSTRUMENTS, GRADES, PIANO_METHODS, STRING_METHODS,
  generateSearchQueries, getMethodBooks,
} from '@/data/exam-videos';

function YouTubeSearchCard({ query, title }: { query: string; title: string }) {
  return (
    <a
      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors group"
    >
      <div className="w-12 h-12 rounded-lg bg-red-600/15 border border-red-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-red-600/25 transition-colors">
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-500" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{title}</p>
        <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">Search: "{query}"</p>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-muted-foreground flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
    </a>
  );
}

function MethodBookSection({ methods, instrument }: { methods: typeof PIANO_METHODS; instrument: string }) {
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <h3 className="font-serif text-lg flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-primary" />
        {instrument} Method Books & Studies
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {methods.map((method) => (
          <Card key={method.name} className="overflow-hidden">
            <CardContent className="p-0">
              <button
                onClick={() => setExpandedMethod(expandedMethod === method.name ? null : method.name)}
                className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <h4 className="font-medium text-sm">{method.name}</h4>
                <div className="flex flex-wrap gap-1 mt-2">
                  {method.levels.map((level) => (
                    <Badge key={level} variant="outline" className="text-[10px]">{level}</Badge>
                  ))}
                </div>
              </button>
              {expandedMethod === method.name && (
                <div className="border-t border-border p-3 space-y-4">
                  {method.levels.slice(0, 3).map((level) => {
                    const query = `${method.searchPrefix} ${level} play along`;
                    return (
                      <div key={level} className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">{level}</p>
                        <YouTubeSearchCard query={query} title={`${method.name} ${level}`} />
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
    if (board === 'All' || board === 'Methods') return ['All Grades', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];
    return ['All Grades', ...(GRADES[board] || [])];
  }, [board]);

  const searchContent = useMemo(() => {
    if (isMethodBooks) return [];

    if (!isFiltered) {
      return [
        { title: 'ABRSM Grade 1 Piano', queries: generateSearchQueries('ABRSM', 'Piano', 'Grade 1') },
        { title: 'Trinity Grade 3 Guitar', queries: generateSearchQueries('Trinity', 'Guitar', 'Grade 3') },
        { title: 'Rockschool Grade 2 Drums', queries: generateSearchQueries('Rockschool', 'Drums', 'Grade 2') },
        { title: 'ABRSM Grade 5 Violin', queries: generateSearchQueries('ABRSM', 'Violin', 'Grade 5') },
        { title: 'Trinity Grade 4 Saxophone', queries: generateSearchQueries('Trinity', 'Saxophone', 'Grade 4') },
        { title: 'RCM Level 3 Piano', queries: generateSearchQueries('RCM', 'Piano', 'Level 3') },
      ];
    }

    const boards = board === 'All' ? EXAM_BOARDS.filter(b => b.id !== 'Methods').map(b => b.id) : [board];
    const insts = instrument === 'All Instruments' ? ['Piano'] : [instrument];
    const grades = grade === 'All Grades' ? (GRADES[board] || ['Grade 1', 'Grade 3', 'Grade 5']).slice(0, 3) : [grade];

    const entries: { title: string; queries: string[] }[] = [];
    for (const b of boards) {
      for (const inst of insts) {
        for (const g of grades) {
          entries.push({
            title: `${b} ${g} ${inst}`,
            queries: generateSearchQueries(b, inst, g),
          });
          if (entries.length >= 8) break;
        }
        if (entries.length >= 8) break;
      }
      if (entries.length >= 8) break;
    }
    return entries;
  }, [board, instrument, grade, isFiltered, isMethodBooks]);

  const subtitle = isMethodBooks ? 'Traditional Method Books & Studies'
    : [board !== 'All' ? board : null, instrument !== 'All Instruments' ? instrument : null, grade !== 'All Grades' ? grade : null]
      .filter(Boolean).join(' · ') || 'Popular Play-Along Content';

  const methodBooks = isMethodBooks ? getMethodBooks(instrument) : [];

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-144px)]">
      {/* Sidebar */}
      <div className="w-full md:w-[280px] border-b md:border-b-0 md:border-r border-border overflow-y-auto flex-shrink-0">
        <div className="p-4">
          <h2 className="font-serif text-2xl mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" /> Play-Alongs
          </h2>

          <div className="mb-4">
            <label className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2 block">Exam Board / Method</label>
            <div className="flex flex-wrap gap-1.5">
              {['All', ...EXAM_BOARDS.map(b => b.id)].map((b) => {
                const boardInfo = EXAM_BOARDS.find(eb => eb.id === b);
                return (
                  <button key={b} onClick={() => { setBoard(b); setGrade('All Grades'); }}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${board === b ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
                    title={boardInfo?.fullName || b}>
                    {boardInfo?.name || b}
                  </button>
                );
              })}
            </div>
          </div>

          {!isMethodBooks && (
            <div className="mb-4">
              <label className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2 block">Instrument</label>
              <div className="flex flex-wrap gap-1.5">
                {['All Instruments', ...INSTRUMENTS].map((i) => (
                  <button key={i} onClick={() => setInstrument(i)}
                    className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${instrument === i ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
                    {i === 'All Instruments' ? 'All' : i}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isMethodBooks && (
            <div className="mb-4">
              <label className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2 block">Instrument</label>
              <div className="flex flex-wrap gap-1.5">
                {['Piano', 'Violin', 'Cello'].map((i) => (
                  <button key={i} onClick={() => setInstrument(i)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${instrument === i ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
                    {i}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isMethodBooks && (
            <div className="mb-4">
              <label className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2 block">Grade / Level</label>
              <div className="flex flex-wrap gap-1.5">
                {availableGrades.map((g) => (
                  <button key={g} onClick={() => setGrade(g)}
                    className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${grade === g ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
                    {g === 'All Grades' ? 'All' : g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isFiltered && (
            <button
              onClick={() => { setBoard('All'); setInstrument('All Instruments'); setGrade('All Grades'); }}
              className="text-xs text-primary hover:underline mt-2"
            >
              Clear filters
            </button>
          )}

          {board !== 'All' && (
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs font-medium">{EXAM_BOARDS.find(b => b.id === board)?.fullName}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{EXAM_BOARDS.find(b => b.id === board)?.region}</p>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-6">
          <h3 className="font-serif text-xl">{subtitle}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {isMethodBooks
              ? 'Browse traditional method books with YouTube play-along search links.'
              : 'YouTube play-along content for exam preparation. Click any card to search YouTube.'}
          </p>
        </div>

        {isMethodBooks && methodBooks.length > 0 && (
          <MethodBookSection methods={methodBooks} instrument={instrument} />
        )}

        {!isMethodBooks && searchContent.length > 0 && (
          <div className="space-y-8">
            {searchContent.map((entry, idx) => (
              <div key={`${entry.title}-${idx}`} className="space-y-3">
                <h4 className="font-medium text-base flex items-center gap-2">
                  <Music className="w-4 h-4 text-primary" />
                  {entry.title}
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {entry.queries.slice(0, 2).map((q, qi) => (
                    <YouTubeSearchCard key={qi} query={q} title={`${entry.title} - ${qi + 1}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isMethodBooks && searchContent.length === 0 && !isFiltered && (
          <div className="text-center py-16 text-muted-foreground">
            <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Select an exam board and instrument to find play-along content.</p>
          </div>
        )}
      </div>
    </div>
  );
}
