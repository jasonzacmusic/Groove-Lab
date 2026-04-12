import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, Clock, Flame, Calendar, Play } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const mockChartData = [
  { day: 'Mon', bpm: 100 },
  { day: 'Tue', bpm: 105 },
  { day: 'Wed', bpm: 105 },
  { day: 'Thu', bpm: 110 },
  { day: 'Fri', bpm: 115 },
  { day: 'Sat', bpm: 120 },
  { day: 'Sun', bpm: 125 },
];

export default function Practice() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [time, setTime] = useState(0);

  // Note: in a real implementation we'd use useGetPracticeStats, etc.
  
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-3xl flex items-center gap-2">
          <Target className="w-8 h-8 text-primary" /> Practice Tracker
        </h2>
        {!isSessionActive ? (
          <Button onClick={() => setIsSessionActive(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
            <Play className="w-4 h-4 mr-2" fill="currentColor" /> Start Session
          </Button>
        ) : (
          <div className="flex items-center gap-4 bg-coral/10 border border-coral rounded-full px-4 py-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-coral" />
            <span className="font-mono font-bold text-coral tracking-widest">
              {Math.floor(time / 60).toString().padStart(2, '0')}:{(time % 60).toString().padStart(2, '0')}
            </span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-coral hover:text-coral hover:bg-coral/20" onClick={() => setIsSessionActive(false)}>End</Button>
          </div>
        )}
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-serif text-foreground mb-1">14.5</p>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Total Hours</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center mb-3">
              <Flame className="w-5 h-5 text-coral" />
            </div>
            <p className="text-3xl font-serif text-foreground mb-1">5</p>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Day Streak</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-sage/10 flex items-center justify-center mb-3">
              <Calendar className="w-5 h-5 text-sage" />
            </div>
            <p className="text-3xl font-serif text-foreground mb-1">24</p>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Sessions</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-dashed bg-card/50 flex flex-col items-center justify-center p-6 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
            <Target className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground">Set Weekly Goal</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader>
            <CardTitle className="font-serif text-xl">BPM Progression</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--primary))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="bpm" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: 'hsl(var(--card))', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium text-sm text-foreground">Autumn Leaves Routine</p>
                  <p className="text-xs text-muted-foreground mt-1">Today, 2:30 PM</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="secondary" className="font-mono text-[10px] bg-primary/10 text-primary">125 BPM</Badge>
                  <span className="text-xs text-muted-foreground font-mono">45 min</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}