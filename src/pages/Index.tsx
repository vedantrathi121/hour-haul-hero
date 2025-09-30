import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Clock, Target, Calendar, CheckCircle2, AlertCircle, Play, Square, Timer } from "lucide-react";

interface WorkSession {
  startTime: string;
  endTime: string;
  duration: number; // in minutes
}

interface DailyEntry {
  date: string;
  displayDate: string;
  sessions: WorkSession[];
  totalMinutes: number;
}

interface WeekData {
  totalMinutes: number;
  entries: DailyEntry[];
  lastResetDate: string;
  activeSession?: {
    startTime: string;
  };
}

const WEEKLY_TARGET_MINUTES = 45 * 60; // 45 hours in minutes
const DAILY_MINIMUM_MINUTES = 6 * 60; // 6 hours in minutes
const STORAGE_KEY = "weeklyWorkHours";

const Index = () => {
  const [weekData, setWeekData] = useState<WeekData>({
    totalMinutes: 0,
    entries: [],
    lastResetDate: new Date().toISOString(),
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  // Update current time and elapsed time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      
      if (weekData.activeSession) {
        const start = new Date(weekData.activeSession.startTime);
        const elapsed = Math.floor((Date.now() - start.getTime()) / 60000);
        setElapsedMinutes(elapsed);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [weekData.activeSession]);

  // Load data from localStorage and check for Monday reset
  useEffect(() => {
    const loadData = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: WeekData = JSON.parse(stored);
        
        // Check if we need to reset (it's Monday and we haven't reset yet today)
        const now = new Date();
        const lastReset = new Date(data.lastResetDate);
        
        if (now.getDay() === 1 && lastReset.getDay() !== 1) {
          // Reset for new week
          const newData: WeekData = {
            totalMinutes: 0,
            entries: [],
            lastResetDate: now.toISOString(),
          };
          setWeekData(newData);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
          toast.info("New week started! Data has been reset.");
        } else {
          setWeekData(data);
        }
      }
    };

    loadData();
    
    // Check for reset every minute
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(weekData));
  }, [weekData]);

  const formatTime = (totalMinutes: number) => {
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const handleStartWork = () => {
    const now = new Date();
    
    setWeekData(prev => ({
      ...prev,
      activeSession: {
        startTime: now.toISOString(),
      },
    }));

    toast.success("Clocked in! Work session started.", {
      description: `Started at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
    });
  };

  const handleEndWork = () => {
    if (!weekData.activeSession) return;

    const now = new Date();
    const start = new Date(weekData.activeSession.startTime);
    const durationMinutes = Math.floor((now.getTime() - start.getTime()) / 60000);

    if (durationMinutes < 1) {
      toast.error("Session too short. Must be at least 1 minute.");
      return;
    }

    const session: WorkSession = {
      startTime: weekData.activeSession.startTime,
      endTime: now.toISOString(),
      duration: durationMinutes,
    };

    const today = now.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' });
    const todayDisplay = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    
    setWeekData(prev => {
      const existingEntryIndex = prev.entries.findIndex(e => e.date === today);
      let newEntries = [...prev.entries];

      if (existingEntryIndex >= 0) {
        // Update existing day
        newEntries[existingEntryIndex] = {
          ...newEntries[existingEntryIndex],
          sessions: [...newEntries[existingEntryIndex].sessions, session],
          totalMinutes: newEntries[existingEntryIndex].totalMinutes + durationMinutes,
        };
      } else {
        // Create new day entry
        newEntries.push({
          date: today,
          displayDate: todayDisplay,
          sessions: [session],
          totalMinutes: durationMinutes,
        });
      }

      return {
        ...prev,
        totalMinutes: prev.totalMinutes + durationMinutes,
        entries: newEntries,
        activeSession: undefined,
      };
    });

    setElapsedMinutes(0);
    toast.success(`Session ended! Logged ${formatTime(durationMinutes)}`, {
      description: `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
    });
  };

  const totalWithActive = weekData.totalMinutes + (weekData.activeSession ? elapsedMinutes : 0);
  const remainingMinutes = Math.max(0, WEEKLY_TARGET_MINUTES - totalWithActive);
  const progressPercentage = Math.min(100, (totalWithActive / WEEKLY_TARGET_MINUTES) * 100);
  const isComplete = totalWithActive >= WEEKLY_TARGET_MINUTES;
  const extraMinutes = Math.max(0, totalWithActive - WEEKLY_TARGET_MINUTES);
  const isClockedIn = !!weekData.activeSession;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
        {/* Header */}
        <header className="text-center space-y-2 animate-slide-up">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Weekly Tracker
          </h1>
          <p className="text-muted-foreground">Track your progress toward your weekly goal</p>
        </header>

        {/* Status Cards */}
        <div className="grid gap-4 md:grid-cols-3 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <Card className="p-6 shadow-card border-border/50 hover:shadow-soft transition-shadow">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Current Total</p>
                <p className="text-2xl font-bold text-foreground">{formatTime(totalWithActive)}</p>
                {isClockedIn && (
                  <p className="text-xs text-muted-foreground mt-1">
                    +{formatTime(elapsedMinutes)} active
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-card border-border/50 hover:shadow-soft transition-shadow">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Weekly Target</p>
                <p className="text-2xl font-bold text-foreground">{formatTime(WEEKLY_TARGET_MINUTES)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-card border-border/50 hover:shadow-soft transition-shadow">
            <div className="flex items-start gap-3">
              <div className={`rounded-lg p-2 ${isComplete ? 'bg-success/10' : 'bg-warning/10'}`}>
                <Calendar className={`h-5 w-5 ${isComplete ? 'text-success' : 'text-warning'}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="text-2xl font-bold text-foreground">
                  {isComplete ? "Complete!" : formatTime(remainingMinutes)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Progress Section */}
        <Card className="p-6 shadow-card border-border/50 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Weekly Progress</h2>
              <span className="text-sm font-medium text-muted-foreground">
                {progressPercentage.toFixed(1)}%
              </span>
            </div>
            
            <Progress value={progressPercentage} className="h-3" />
            
            {isComplete ? (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-success/10 border border-success/20">
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                <p className="text-sm font-medium text-success">
                  ✅ Weekly Goal Complete! ({formatTime(extraMinutes)} extra)
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-primary/5 border border-primary/10">
                <AlertCircle className="h-5 w-5 text-primary flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Keep going! You need {formatTime(remainingMinutes)} more to reach your goal.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Clock In/Out Section */}
        <Card className="p-6 shadow-card border-border/50 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Time Tracking</h2>
              {isClockedIn && (
                <div className="flex items-center gap-2 text-success">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="text-sm font-medium">Active Session</span>
                </div>
              )}
            </div>

            {/* Status Display */}
            <div className={`p-4 rounded-lg border ${isClockedIn ? 'bg-success/5 border-success/20' : 'bg-muted/30 border-border/50'}`}>
              {isClockedIn ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-success">
                    <Timer className="h-5 w-5" />
                    <span className="font-semibold">Clocked In</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Started at {new Date(weekData.activeSession!.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="text-2xl font-bold text-foreground">
                    {formatTime(elapsedMinutes)}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Clocked Out. Ready to start your next session.</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {!isClockedIn ? (
                <Button
                  onClick={handleStartWork}
                  className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                  size="lg"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Start Work
                </Button>
              ) : (
                <Button
                  onClick={handleEndWork}
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  size="lg"
                >
                  <Square className="h-5 w-5 mr-2" />
                  End Work
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Daily minimum requirement: 6 hours · Weekly target: 45 hours
            </p>
          </div>
        </Card>

        {/* Weekly Log */}
        <Card className="p-6 shadow-card border-border/50 animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Weekly Log</h2>
          </div>

          {weekData.entries.length === 0 && !isClockedIn ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No entries yet. Click "Start Work" to begin tracking!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {weekData.entries.map((entry, dayIndex) => (
                <div
                  key={dayIndex}
                  className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <span className="font-semibold text-foreground">{entry.displayDate}</span>
                    <span className={`text-sm font-medium ${entry.totalMinutes >= DAILY_MINIMUM_MINUTES ? 'text-success' : 'text-warning'}`}>
                      {formatTime(entry.totalMinutes)}
                      {entry.totalMinutes < DAILY_MINIMUM_MINUTES && ' ⚠️'}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {entry.sessions.map((session, sessionIndex) => {
                      const start = new Date(session.startTime);
                      const end = new Date(session.endTime);
                      return (
                        <div
                          key={sessionIndex}
                          className="flex items-center justify-between text-sm pl-3"
                        >
                          <span className="text-muted-foreground">
                            {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-foreground font-medium">
                            {formatTime(session.duration)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Show current active session in the log */}
              {isClockedIn && (
                <div className="p-4 rounded-lg bg-success/5 border border-success/20 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-success/20">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-xs text-success font-medium">(Active)</span>
                    </div>
                    <span className="text-sm font-medium text-success">
                      {formatTime(elapsedMinutes)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm pl-3">
                    <span className="text-muted-foreground">
                      {new Date(weekData.activeSession!.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - Now
                    </span>
                    <span className="text-success font-medium animate-pulse">
                      Recording...
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Index;
