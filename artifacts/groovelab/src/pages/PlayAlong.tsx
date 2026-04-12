import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap } from 'lucide-react';

const INSTRUMENTS = [
  'Piano', 'Guitar', 'Drums', 'Saxophone', 'Trumpet',
  'Flute', 'Violin', 'Clarinet', 'Bass', 'Cello',
];

const GRADES = [
  'Initial', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
  'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8',
];

const BOARDS = ['Trinity', 'ABRSM'];

export default function PlayAlong() {
  const [board, setBoard] = useState<string>('All');
  const [instrument, setInstrument] = useState<string>('All Instruments');
  const [grade, setGrade] = useState<string>('All Grades');

  // Build YouTube search queries based on selection
  const searchQueries = useMemo(() => {
    const queries: { label: string; query: string }[] = [];
    const boards = board === 'All' ? BOARDS : [board];
    const insts = instrument === 'All Instruments' ? ['Piano'] : [instrument]; // default to piano
    const grades = grade === 'All Grades' ? ['Grade 1', 'Grade 3', 'Grade 5'] : [grade];

    for (const b of boards) {
      for (const inst of insts) {
        for (const g of grades) {
          queries.push({
            label: `${b} ${g} ${inst}`,
            query: `${b} ${g} ${inst} play along`,
          });
          if (queries.length >= 6) break;
        }
        if (queries.length >= 6) break;
      }
      if (queries.length >= 6) break;
    }

    // If specific selections, add more specific queries
    if (instrument !== 'All Instruments' && grade !== 'All Grades') {
      const b = board === 'All' ? 'Trinity' : board;
      queries.length = 0; // reset
      queries.push(
        { label: `${b} ${grade} ${instrument} Play Along`, query: `${b} ${grade} ${instrument} play along` },
        { label: `${b} ${grade} ${instrument} Exam Piece`, query: `${b} ${grade} ${instrument} exam piece` },
        { label: `${b} ${grade} ${instrument} Backing Track`, query: `${b} ${grade} ${instrument} backing track` },
        { label: `${instrument} ${grade} Practice`, query: `${instrument} ${grade} practice play along` },
      );
    }

    return queries;
  }, [board, instrument, grade]);

  const subtitle = [
    board !== 'All' ? board : null,
    instrument !== 'All Instruments' ? instrument : null,
    grade !== 'All Grades' ? grade : null,
  ].filter(Boolean).join(' · ') || 'Select filters to find play-along content';

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-144px)]">
      {/* Sidebar */}
      <div className="w-full md:w-[280px] border-b md:border-b-0 md:border-r border-border p-4 overflow-y-auto flex-shrink-0">
        <h2 className="font-serif text-2xl mb-4 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" /> Play-Alongs
        </h2>

        {/* Board */}
        <div className="mb-4">
          <label className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2 block">Exam Board</label>
          <div className="flex flex-wrap gap-1.5">
            {['All', ...BOARDS].map((b) => (
              <button key={b} onClick={() => setBoard(b)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${board === b ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Instrument */}
        <div className="mb-4">
          <label className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2 block">Instrument</label>
          <div className="flex flex-wrap gap-1.5">
            {['All Instruments', ...INSTRUMENTS].map((i) => (
              <button key={i} onClick={() => setInstrument(i)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${instrument === i ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
                {i === 'All Instruments' ? 'All' : i}
              </button>
            ))}
          </div>
        </div>

        {/* Grade */}
        <div className="mb-4">
          <label className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2 block">Grade</label>
          <div className="flex flex-wrap gap-1.5">
            {['All Grades', ...GRADES].map((g) => (
              <button key={g} onClick={() => setGrade(g)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${grade === g ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
                {g === 'All Grades' ? 'All' : g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-4">
          <h3 className="font-serif text-xl">{subtitle}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            YouTube play-along videos embedded directly — no need to leave the page
          </p>
        </div>

        {/* YouTube search embeds */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {searchQueries.map((sq, idx) => (
            <Card key={`${sq.query}-${idx}`} className="overflow-hidden">
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(sq.query)}`}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  title={sq.label}
                />
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium">{sq.label}</p>
                <p className="text-xs text-muted-foreground font-mono">"{sq.query}"</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
