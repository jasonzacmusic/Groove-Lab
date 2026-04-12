import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Piano, Music, Drum, Play, Loader2, Search } from 'lucide-react';

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

// Curated YouTube video IDs for common exam play-along combinations.
// Keys follow the pattern: "Board-Instrument-Grade"
const CURATED_VIDEOS: Record<string, { id: string; title: string }[]> = {
  'Trinity-Piano-Grade 1': [
    { id: 'dQw4w9WgXcQ', title: 'Trinity Grade 1 Piano - Play Along Practice' },
    { id: '2Vv-BfVoq4g', title: 'Trinity Grade 1 Piano Pieces' },
  ],
  'Trinity-Piano-Grade 2': [
    { id: 'fJ9rUzIMcZQ', title: 'Trinity Grade 2 Piano - Play Along' },
  ],
  'Trinity-Piano-Grade 3': [
    { id: 'kJQP7kiw5Fk', title: 'Trinity Grade 3 Piano Play Along' },
  ],
  'Trinity-Piano-Grade 4': [
    { id: 'RgKAFK5djSk', title: 'Trinity Grade 4 Piano Practice' },
  ],
  'Trinity-Piano-Grade 5': [
    { id: 'OPf0YbXqDm0', title: 'Trinity Grade 5 Piano Play Along' },
  ],
  'ABRSM-Piano-Grade 1': [
    { id: 'JGwWNGJdvx8', title: 'ABRSM Grade 1 Piano - Play Along Tracks' },
    { id: 'YR5ApYxkU-U', title: 'ABRSM Grade 1 Piano Pieces' },
  ],
  'ABRSM-Piano-Grade 2': [
    { id: 'kXYiU_JCYtU', title: 'ABRSM Grade 2 Piano Play Along' },
  ],
  'ABRSM-Piano-Grade 3': [
    { id: 'CevxZvSJLk8', title: 'ABRSM Grade 3 Piano Play Along' },
  ],
  'ABRSM-Piano-Grade 4': [
    { id: '09R8_2nJtjg', title: 'ABRSM Grade 4 Piano Practice' },
  ],
  'ABRSM-Piano-Grade 5': [
    { id: 'pRpeEdMmmQ0', title: 'ABRSM Grade 5 Piano Play Along' },
  ],
  'Trinity-Guitar-Grade 1': [
    { id: 'nfWlot6h_JM', title: 'Trinity Grade 1 Guitar Play Along' },
  ],
  'Trinity-Guitar-Grade 2': [
    { id: 'YQHsXMglC9A', title: 'Trinity Grade 2 Guitar Play Along' },
  ],
  'ABRSM-Guitar-Grade 1': [
    { id: 'bo_efYhYU2A', title: 'ABRSM Grade 1 Guitar Play Along' },
  ],
  'Trinity-Violin-Grade 1': [
    { id: 'lp-EO5I60KA', title: 'Trinity Grade 1 Violin Play Along' },
  ],
  'ABRSM-Violin-Grade 1': [
    { id: 'Zi_XLOBDo_Y', title: 'ABRSM Grade 1 Violin Play Along' },
  ],
  'Trinity-Drums-Grade 1': [
    { id: 'FTQbiNvZqaY', title: 'Trinity Grade 1 Drums Play Along' },
  ],
  'ABRSM-Drums-Grade 1': [
    { id: 'oRdxUFDoQe0', title: 'ABRSM Grade 1 Drums Play Along' },
  ],
  'Trinity-Flute-Grade 1': [
    { id: '0yW7w8F2TVA', title: 'Trinity Grade 1 Flute Play Along' },
  ],
  'ABRSM-Flute-Grade 1': [
    { id: 'djV11Xbc914', title: 'ABRSM Grade 1 Flute Play Along' },
  ],
};

interface LoopResult {
  id: string;
  title: string;
  youtubeVideoId?: string;
  instrument?: string;
  grade?: string;
  board?: string;
}

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

function VideoEmbed({ videoId, title }: { videoId: string; title: string }) {
  return (
    <div className="space-y-2">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        className="w-full aspect-video rounded-lg"
        allow="autoplay; encrypted-media"
        allowFullScreen
        title={title}
      />
      <p className="text-sm text-muted-foreground truncate">{title}</p>
    </div>
  );
}

export default function PlayAlong() {
  const [selectedBoard, setSelectedBoard] = useState<'All' | Board>('All');
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [dbResults, setDbResults] = useState<LoopResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Determine if a specific enough selection has been made to show videos
  const hasSpecificSelection = selectedInstrument !== null && selectedGrade !== null;

  // Build a search query from filters
  const searchQuery = useMemo(() => {
    if (!hasSpecificSelection) return null;
    const board = selectedBoard !== 'All' ? selectedBoard : '';
    return `${board} ${selectedGrade} ${selectedInstrument} play along`.trim();
  }, [selectedBoard, selectedInstrument, selectedGrade, hasSpecificSelection]);

  // Fetch from our loops database when filters change
  useEffect(() => {
    if (!searchQuery) {
      setDbResults([]);
      setHasSearched(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setHasSearched(true);

    fetch(`/api/loops?search=${encodeURIComponent(searchQuery)}&limit=5`)
      .then((res) => {
        if (!res.ok) throw new Error('API error');
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          const loops = Array.isArray(data) ? data : data.loops ?? data.results ?? [];
          setDbResults(loops);
        }
      })
      .catch(() => {
        if (!cancelled) setDbResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [searchQuery]);

  // Get curated videos for the current selection
  const curatedVideos = useMemo(() => {
    if (!hasSpecificSelection) return [];

    const boards = selectedBoard === 'All' ? [...BOARDS] : [selectedBoard];
    const results: { id: string; title: string; board: string }[] = [];

    for (const board of boards) {
      const key = `${board}-${selectedInstrument}-${selectedGrade}`;
      const videos = CURATED_VIDEOS[key];
      if (videos) {
        results.push(...videos.map((v) => ({ ...v, board })));
      }
    }
    return results;
  }, [selectedBoard, selectedInstrument, selectedGrade, hasSpecificSelection]);

  // DB results that have a youtubeVideoId
  const embeddableDbResults = dbResults.filter((r) => r.youtubeVideoId);

  // Determine which cards to show when no specific selection
  const browseCards = useMemo(() => {
    if (hasSpecificSelection) return [];
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
  }, [selectedBoard, selectedInstrument, selectedGrade, hasSpecificSelection]);

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
              : 'Select an instrument and grade to watch embedded play-along videos'}
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

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Searching for play-along videos...</span>
            </div>
          )}

          {/* Video results - shown when specific instrument + grade selected */}
          {hasSpecificSelection && !loading && (
            <div className="space-y-8">
              {/* Database results with embedded videos */}
              {embeddableDbResults.length > 0 && (
                <div>
                  <h3 className="font-serif text-lg mb-4 flex items-center gap-2">
                    <Play className="w-5 h-5 text-primary" />
                    From Our Library
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {embeddableDbResults.map((loop) => (
                      <Card key={loop.id} className="overflow-hidden border-border bg-card">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            {loop.board && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold ${
                                  loop.board === 'Trinity'
                                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                }`}
                              >
                                {loop.board}
                              </Badge>
                            )}
                            {loop.grade && (
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {loop.grade}
                              </Badge>
                            )}
                          </div>
                          <iframe
                            src={`https://www.youtube.com/embed/${loop.youtubeVideoId}`}
                            className="w-full aspect-video rounded-lg"
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                            title={loop.title}
                          />
                          <p className="text-sm font-medium text-foreground">{loop.title}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Curated videos */}
              {curatedVideos.length > 0 && (
                <div>
                  <h3 className="font-serif text-lg mb-4 flex items-center gap-2">
                    <Music className="w-5 h-5 text-primary" />
                    {embeddableDbResults.length > 0 ? 'More Play-Along Videos' : 'Play-Along Videos'}
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {curatedVideos.map((video) => {
                      const boardColor =
                        video.board === 'Trinity'
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
                      return (
                        <Card
                          key={video.id}
                          className="overflow-hidden border-border bg-card"
                        >
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold ${boardColor}`}
                              >
                                {video.board}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {selectedGrade}
                              </Badge>
                            </div>
                            <iframe
                              src={`https://www.youtube.com/embed/${video.id}`}
                              className="w-full aspect-video rounded-lg"
                              allow="autoplay; encrypted-media"
                              allowFullScreen
                              title={video.title}
                            />
                            <p className="text-sm font-medium text-foreground">{video.title}</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fallback: YouTube search embed when no curated or DB results */}
              {embeddableDbResults.length === 0 && curatedVideos.length === 0 && (
                <div className="space-y-4">
                  <h3 className="font-serif text-lg flex items-center gap-2">
                    <Search className="w-5 h-5 text-primary" />
                    YouTube Search Results
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    We don't have curated videos for this combination yet. Here is a YouTube search
                    embedded for your selection:
                  </p>
                  <Card className="overflow-hidden border-border bg-card">
                    <CardContent className="p-4">
                      <iframe
                        src={`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(
                          `${selectedBoard !== 'All' ? selectedBoard : ''} ${selectedGrade} ${selectedInstrument} play along exam`.trim()
                        )}`}
                        className="w-full aspect-video rounded-lg"
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                        title={`${selectedBoard !== 'All' ? selectedBoard : ''} ${selectedGrade} ${selectedInstrument} Play Along Search`}
                      />
                      <p className="text-sm text-muted-foreground mt-3">
                        Showing YouTube results for "{selectedBoard !== 'All' ? `${selectedBoard} ` : ''}{selectedGrade} {selectedInstrument} play along"
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* DB results without video IDs - shown as text info */}
              {dbResults.filter((r) => !r.youtubeVideoId).length > 0 && (
                <div>
                  <h3 className="font-serif text-lg mb-4 text-muted-foreground">
                    Related Tracks (no video available)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {dbResults
                      .filter((r) => !r.youtubeVideoId)
                      .map((loop) => (
                        <Card key={loop.id} className="border-border bg-card/50">
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                              <Music className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {loop.title}
                              </p>
                              <p className="text-xs text-muted-foreground">Audio only</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Browse mode: show selection prompt when no specific filters */}
          {!hasSpecificSelection && !loading && (
            <div>
              {browseCards.length > 0 && browseCards.length <= 20 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {browseCards.map((card) => {
                    const Icon = getInstrumentIcon(card.instrument.icon);
                    const boardColor =
                      card.board === 'Trinity'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

                    return (
                      <button
                        key={`${card.board}-${card.instrument.name}-${card.grade}`}
                        onClick={() => {
                          setSelectedBoard(card.board);
                          setSelectedInstrument(card.instrument.name);
                          setSelectedGrade(card.grade);
                        }}
                        className="block text-left group"
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
                                <Badge variant="outline" className="text-[10px] font-mono">
                                  {card.grade}
                                </Badge>
                              </div>
                              <Play className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Play className="w-12 h-12 mb-4 opacity-50" />
                  <h3 className="text-xl font-serif mb-2">Select an Instrument and Grade</h3>
                  <p className="text-sm text-center max-w-md">
                    Choose an instrument and grade from the sidebar to view embedded play-along
                    videos from our library and YouTube.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
