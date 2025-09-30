import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Clock, Target, Calendar, Undo2, CheckCircle2, AlertCircle } from "lucide-react";

interface DailyEntry {
  date: string;
  hours: number;
  minutes: number;
}

interface WeekData {
  totalMinutes: number;
  entries: DailyEntry[];
  lastResetDate: string;
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
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");

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

  const handleLogHours = () => {
    const hoursNum = parseFloat(hours) || 0;
    const minutesNum = parseFloat(minutes) || 0;
    const totalMinutesLogged = hoursNum * 60 + minutesNum;

    if (totalMinutesLogged <= 0) {
      toast.error("Please enter valid hours and minutes.");
      return;
    }

    if (totalMinutesLogged < DAILY_MINIMUM_MINUTES) {
      toast.error(`Minimum daily requirement is 6 hours (${formatTime(DAILY_MINIMUM_MINUTES)})`);
      return;
    }

    const newEntry: DailyEntry = {
      date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      hours: hoursNum,
      minutes: minutesNum,
    };

    setWeekData(prev => ({
      ...prev,
      totalMinutes: prev.totalMinutes + totalMinutesLogged,
      entries: [...prev.entries, newEntry],
    }));

    setHours("");
    setMinutes("");
    toast.success(`Logged ${formatTime(totalMinutesLogged)} successfully!`);
  };

  const handleUndo = () => {
    if (weekData.entries.length === 0) {
      toast.error("No entries to undo.");
      return;
    }

    const lastEntry = weekData.entries[weekData.entries.length - 1];
    const minutesToRemove = lastEntry.hours * 60 + lastEntry.minutes;

    setWeekData(prev => ({
      ...prev,
      totalMinutes: Math.max(0, prev.totalMinutes - minutesToRemove),
      entries: prev.entries.slice(0, -1),
    }));

    toast.info(`Undone entry: ${formatTime(minutesToRemove)}`);
  };

  const remainingMinutes = Math.max(0, WEEKLY_TARGET_MINUTES - weekData.totalMinutes);
  const progressPercentage = Math.min(100, (weekData.totalMinutes / WEEKLY_TARGET_MINUTES) * 100);
  const isComplete = weekData.totalMinutes >= WEEKLY_TARGET_MINUTES;
  const extraMinutes = Math.max(0, weekData.totalMinutes - WEEKLY_TARGET_MINUTES);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
        {/* Header */}
        <header className="text-center space-y-2 animate-slide-up">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Weekly 45-Hour Tracker
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
                <p className="text-2xl font-bold text-foreground">{formatTime(weekData.totalMinutes)}</p>
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

        {/* Log Hours Section */}
        <Card className="p-6 shadow-card border-border/50 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <h2 className="text-lg font-semibold mb-4">Log Today's Hours</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label htmlFor="hours" className="text-sm text-muted-foreground mb-1 block">
                Hours
              </label>
              <Input
                id="hours"
                type="number"
                placeholder="8"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                min="0"
                step="0.5"
                className="border-border"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="minutes" className="text-sm text-muted-foreground mb-1 block">
                Minutes
              </label>
              <Input
                id="minutes"
                type="number"
                placeholder="30"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                min="0"
                max="59"
                step="15"
                className="border-border"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleLogHours}
                className="w-full sm:w-auto bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                Log Hours
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Minimum daily requirement: 6 hours
          </p>
        </Card>

        {/* Weekly Log */}
        <Card className="p-6 shadow-card border-border/50 animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Weekly Log</h2>
            {weekData.entries.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                className="border-border hover:bg-muted"
              >
                <Undo2 className="h-4 w-4 mr-2" />
                Undo Last
              </Button>
            )}
          </div>

          {weekData.entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No entries yet. Start logging your hours!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {weekData.entries.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium">{entry.date}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatTime(entry.hours * 60 + entry.minutes)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Index;
