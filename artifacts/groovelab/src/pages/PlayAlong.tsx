import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Piano, Music, Drum } from 'lucide-react';

const INSTRUMENTS = [
  { name: 'Piano', icon: 'Piano' },
  { name: 'Guitar', icon: 'Music' },
  { name: 'Drums', icon: 'Drum' },
  { name: 'Saxophone', icon: 'Music' },
  { name: 'Trumpet', icon: 'Music' },
  { name: 'Flute', icon: 'Music' },
  { name: 'Violin', icon: 'Music' },
  { name: 'Clarinet', icon: 'Music' },
  { name: 'Bass', icon: 'Music' },
  { name: 'Cello', icon: 'Music' },
];

const GRADES = [
  'Initial',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
];

const BOARDS = ['Trinity', 'ABRSM'] as const;
type Board = (typeof BOARDS)[number];

function getInstrumentIcon(iconName: string) {
  switch (iconName) {
    case 'Piano':
      return Piano;
    case 'Drum':
      return Drum;
    default:
      return Music;
  }
}

function buildYouTubeUrl(board: string, grade: string, instrument: string) {
  const query = encodeURIComponent(`${board} ${grade} ${instrument} play along`);
  return `https://www.youtube.com/results?search_query=${query}`;
}

export default function PlayAlong() {
  const [selectedBoard, setSelectedBoard] = useState<'All' | Board>('All');
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);

  const cards = useMemo(() => {
    const boards = selectedBoard === 'All' ? [...BOARDS] : [selectedBoard];
    const instruments = selectedInstrument
      ? INSTRUMENTS.filter((i) => i.name === selectedInstrument)
      : INSTRUMENTS;
    const grades = selectedGrade ? [selectedGrade] : GRADES;

    const result: { board: Board; instrument: (typeof INSTRUMENTS)[number]; grade: string }[] = [];
    for (const board of boards) {
      for (const instrument of instruments) {
        for (const grade of grades) {
          result.push({ board: board as Board, instrument, grade });
        }
      }
    }
    return result;
  }, [selectedBoard, selectedInstrument, selectedGrade]);

  const subtitle = [
    selectedBoard !== 'All' ? selectedBoard : null,
    selectedInstrument,
    selectedGrade,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-144px)]">
      {/* Sidebar Filters */}
      <aside className="w-full md:w-[280px] flex-shrink-0 border-r border-border bg-sidebar overflow-y-auto hidden md:block p-6">
        <h3 className="font-serif text-xl mb-6">Filters</h3>

        {/* Exam Board */}
        <div className="mb-6">
          <h4 className="font-medium text-sm text-foreground mb-3">Exam Board</h4>
          <div className="flex flex-wrap gap-2">
            {(['All', ...BOARDS] as const).map((board) => (
              <button
                key={board}
                onClick={() => setSelectedBoard(board)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedBoard === board
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }`}
              >
                {board}
              </button>
            ))}
          </div>
        </div>

        {/* Instrument */}
        <div className="mb-6">
          <h4 className="font-medium text-sm text-foreground mb-3">Instrument</h4>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setSelectedInstrument(null)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left ${
                selectedInstrument === null
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              All Instruments
            </button>
            {INSTRUMENTS.map((inst) => {
              const Icon = getInstrumentIcon(inst.icon);
              return (
                <button
                  key={inst.name}
                  onClick={() => setSelectedInstrument(inst.name)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left ${
                    selectedInstrument === inst.name
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {inst.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grade */}
        <div className="mb-6">
          <h4 className="font-medium text-sm text-foreground mb-3">Grade</h4>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setSelectedGrade(null)}
              className={`px-3 py-2 rounded-md text-sm transition-colors text-left ${
                selectedGrade === null
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              All Grades
            </button>
            {GRADES.map((grade) => (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                className={`px-3 py-2 rounded-md text-sm transition-colors text-left ${
                  selectedGrade === grade
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {grade}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
        <div className="p-6 border-b border-border bg-card/50 backdrop-blur">
          <h2 className="font-serif text-2xl text-foreground">Play-Alongs</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {subtitle
              ? `Showing: ${subtitle}`
              : 'Find exam play-along tracks for Trinity and ABRSM graded music'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Mobile filters */}
          <div className="md:hidden flex flex-wrap gap-2 mb-4">
            {(['All', ...BOARDS] as const).map((board) => (
              <button
                key={board}
                onClick={() => setSelectedBoard(board)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedBoard === board
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {board}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cards.map((card) => {
              const Icon = getInstrumentIcon(card.instrument.icon);
              const boardColor =
                card.board === 'Trinity'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
              const url = buildYouTubeUrl(card.board, card.grade, card.instrument.name);

              return (
                <a
                  key={`${card.board}-${card.instrument.name}-${card.grade}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <Card className="overflow-hidden border-border bg-card hover:border-primary/50 transition-colors cursor-pointer h-full">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold ${boardColor}`}
                          >
                            {card.board}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono"
                          >
                            {card.grade}
                          </Badge>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                          <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                            {card.instrument.name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {card.board} {card.grade} Play-Along
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              );
            })}
          </div>

          {cards.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Music className="w-12 h-12 mb-4 opacity-50" />
              <h3 className="text-xl font-serif mb-2">No results</h3>
              <p className="text-sm">Try adjusting your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
