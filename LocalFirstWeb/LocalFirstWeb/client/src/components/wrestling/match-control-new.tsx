import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Play, Pause, Square, Plus, Video, VideoOff } from 'lucide-react';
import { useWrestlingData } from '@/hooks/use-wrestling-data';
import { VideoRecorder } from '@/lib/video-recorder';
import { useToast } from '@/hooks/use-toast';
import { Match, EventLog } from '@shared/schema';

interface MatchControlProps {
  onBack: () => void;
  selectedMatchId?: string;
}

export function MatchControl({ onBack, selectedMatchId }: MatchControlProps) {
  const {
    matches,
    wrestlers,
    teams,
    updateMatch,
    createEventLog,
    getEventLogsByMatch,
    getTeamById,
    getWrestlerById,
    loading
  } = useWrestlingData();

  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoRecorderRef = useRef<VideoRecorder | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [currentTime, setCurrentTime] = useState(180);
  const [currentPeriod, setCurrentPeriod] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraInitialized, setCameraInitialized] = useState(false);

  const availableMatches = matches.filter(m => m.status === 'pending' || m.status === 'active');

  useEffect(() => {
    if (selectedMatchId) {
      const match = matches.find(m => m.id === selectedMatchId);
      if (match) {
        setSelectedMatch(match);
      }
    }
  }, [selectedMatchId, matches]);

  useEffect(() => {
    if (selectedMatch) {
      setCurrentTime(selectedMatch.currentTime);
      setCurrentPeriod(selectedMatch.currentPeriod);
      setMyScore(selectedMatch.myScore);
      setOpponentScore(selectedMatch.opponentScore);
      setIsRunning(selectedMatch.isRunning);
      loadEventLogs();
    }
  }, [selectedMatch]);

  const loadEventLogs = async () => {
    if (!selectedMatch) return;
    try {
      const logs = await getEventLogsByMatch(selectedMatch.id);
      setEventLogs(logs);
    } catch (error) {
      console.error('Failed to load event logs:', error);
    }
  };

  const initializeCamera = useCallback(async () => {
    if (!videoRef.current || cameraInitialized) return;

    try {
      videoRecorderRef.current = new VideoRecorder({
        onStart: () => {
          setIsRecording(true);
          toast({ title: 'Recording started' });
        },
        onStop: (blob) => {
          setIsRecording(false);
          const filename = `match-${selectedMatch?.id}-${new Date().toISOString()}.webm`;
          videoRecorderRef.current?.saveVideoLocally(blob, filename);
          toast({ title: 'Recording saved' });
        },
        onError: (error) => {
          toast({ title: 'Recording error', description: error.message, variant: 'destructive' });
        }
      });

      await videoRecorderRef.current.initializeCamera(videoRef.current);
      setCameraInitialized(true);
      toast({ title: 'Camera initialized' });
    } catch (error) {
      toast({ 
        title: 'Camera access failed', 
        description: 'Unable to access camera for video recording',
        variant: 'destructive' 
      });
    }
  }, [selectedMatch, cameraInitialized, toast]);

  useEffect(() => {
    if (selectedMatch) {
      initializeCamera();
    }

    return () => {
      if (videoRecorderRef.current) {
        videoRecorderRef.current.cleanup();
      }
    };
  }, [selectedMatch, initializeCamera]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const updateTimer = useCallback(() => {
    if (isRunning && currentTime > 0) {
      setCurrentTime(prev => {
        const newTime = prev - 1;
        if (selectedMatch) {
          updateMatch(selectedMatch.id, { 
            ...selectedMatch, 
            currentTime: newTime,
            isRunning: true 
          });
        }
        return newTime;
      });
    } else if (currentTime === 0) {
      setIsRunning(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  }, [isRunning, currentTime, selectedMatch, updateMatch]);

  useEffect(() => {
    if (isRunning) {
      timerIntervalRef.current = setInterval(updateTimer, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRunning, updateTimer]);

  const startTimer = () => {
    setIsRunning(true);
    logEvent('period_start', undefined, 0, `Period ${currentPeriod} started`);
  };

  const pauseTimer = () => {
    setIsRunning(false);
    if (selectedMatch) {
      updateMatch(selectedMatch.id, { ...selectedMatch, isRunning: false });
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setCurrentTime(180);
    if (selectedMatch) {
      updateMatch(selectedMatch.id, { 
        ...selectedMatch, 
        currentTime: 180, 
        isRunning: false 
      });
    }
  };

  const addPoints = async (wrestler: 'my_wrestler' | 'opponent', points: number, action: string) => {
    if (!selectedMatch) return;

    const newMyScore = wrestler === 'my_wrestler' ? myScore + points : myScore;
    const newOpponentScore = wrestler === 'opponent' ? opponentScore + points : opponentScore;
    
    setMyScore(newMyScore);
    setOpponentScore(newOpponentScore);

    const wrestlerName = wrestler === 'my_wrestler' 
      ? getWrestlerById(selectedMatch.myWrestlerId)?.name 
      : selectedMatch.opponentName;

    await updateMatch(selectedMatch.id, {
      ...selectedMatch,
      myScore: newMyScore,
      opponentScore: newOpponentScore,
    });

    await logEvent(
      action as any,
      wrestler,
      points,
      `${wrestlerName} (+${points} points)`
    );
  };

  const logEvent = async (
    action: EventLog['action'],
    wrestler?: 'my_wrestler' | 'opponent',
    points: number = 0,
    description: string = ''
  ) => {
    if (!selectedMatch) return;

    try {
      const eventLog = {
        matchId: selectedMatch.id,
        timestamp: new Date(),
        period: currentPeriod,
        timeRemaining: currentTime,
        action,
        wrestler,
        points,
        scoreAfter: {
          myWrestler: myScore,
          opponent: opponentScore,
        },
        description,
      };

      await createEventLog(eventLog);
      await loadEventLogs();
    } catch (error) {
      console.error('Failed to log event:', error);
    }
  };

  const startRecording = async () => {
    if (!videoRecorderRef.current) {
      await initializeCamera();
    }
    
    if (videoRecorderRef.current && !isRecording) {
      try {
        await videoRecorderRef.current.startRecording();
      } catch (error) {
        toast({ title: 'Failed to start recording', variant: 'destructive' });
      }
    }
  };

  const stopRecording = () => {
    if (videoRecorderRef.current && isRecording) {
      videoRecorderRef.current.stopRecording();
    }
  };

  const endMatch = async () => {
    if (!selectedMatch) return;

    setIsRunning(false);
    const winner = myScore > opponentScore ? 'my_wrestler' : 'opponent';
    
    await updateMatch(selectedMatch.id, {
      ...selectedMatch,
      status: 'completed',
      isRunning: false,
      finalResult: {
        winner,
        winType: 'decision',
        finalScore: {
          myWrestler: myScore,
          opponent: opponentScore,
        },
        duration: formatTime(180 - currentTime),
      },
    });

    await logEvent('match_end', winner, 0, 'Match ended');
    
    if (isRecording) {
      stopRecording();
    }

    toast({ title: 'Match completed successfully' });
    onBack();
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  if (!selectedMatch) {
    return (
      <div className="p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select a Match</h3>
              <div className="space-y-4">
                <Select onValueChange={(value) => {
                  const match = availableMatches.find(m => m.id === value);
                  if (match) setSelectedMatch(match);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a match to control" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMatches.map((match) => {
                      const myWrestler = getWrestlerById(match.myWrestlerId);
                      
                      return (
                        <SelectItem key={match.id} value={match.id}>
                          {match.boutNumber && `#${match.boutNumber} - `}
                          {match.weightClass} lbs - {myWrestler?.name} vs {match.opponentName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                
                {availableMatches.length === 0 && (
                  <p className="text-gray-600">No matches available. Create matches first.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const myWrestler = getWrestlerById(selectedMatch.myWrestlerId);
  const myTeam = getTeamById(selectedMatch.myTeamId);

  return (
    <div className="h-full flex flex-col">
      {/* Match Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h3 className="font-semibold">
                {selectedMatch.boutNumber && `#${selectedMatch.boutNumber} - `}
                {selectedMatch.weightClass} lbs - {myWrestler?.name} vs {selectedMatch.opponentName}
              </h3>
              <p className="text-sm text-gray-600">
                {myTeam?.name} vs {selectedMatch.opponentTeam}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={isRecording ? "destructive" : "default"}
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? <VideoOff className="h-4 w-4 mr-1" /> : <Video className="h-4 w-4 mr-1" />}
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Button>
            <Button
              size="sm"
              onClick={endMatch}
              className="bg-error text-white hover:bg-red-600"
            >
              <Square className="h-4 w-4 mr-1" />
              End Match
            </Button>
          </div>
        </div>
      </div>

      {/* Main Match Interface */}
      <div className="flex-1 flex">
        {/* Video and Controls Area */}
        <div className="flex-1 flex flex-col">
          {/* Video Container with Overlay */}
          <div className="flex-1 relative bg-black">
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              autoPlay
              muted
            />
            
            {/* Score Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Timer and Period Display */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-black bg-opacity-70 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-center">
                  <div className="font-mono text-3xl font-bold">{formatTime(currentTime)}</div>
                  <div className="text-sm">Period {currentPeriod}</div>
                </div>
              </div>

              {/* Score Display */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
                <div className="bg-black bg-opacity-70 backdrop-blur-sm rounded-lg px-6 py-3">
                  <div className="flex items-center space-x-8 text-white">
                    <div className="text-center">
                      <div className="text-sm text-gray-300">{myWrestler?.name}</div>
                      <div className="text-sm text-gray-300">{myTeam?.name}</div>
                      <div className="font-mono text-4xl font-bold text-primary">{myScore}</div>
                    </div>
                    
                    <div className="text-2xl text-gray-300">-</div>
                    
                    <div className="text-center">
                      <div className="text-sm text-gray-300">{selectedMatch.opponentName}</div>
                      <div className="text-sm text-gray-300">{selectedMatch.opponentTeam}</div>
                      <div className="font-mono text-4xl font-bold text-secondary">{opponentScore}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recording Indicator */}
              {isRecording && (
                <div className="absolute top-4 right-4">
                  <div className="flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">REC</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Control Panel */}
          <div className="bg-white border-t p-4">
            <div className="grid grid-cols-12 gap-4">
              {/* Timer Controls */}
              <div className="col-span-3">
                <div className="text-center">
                  <div className="font-mono text-2xl font-bold mb-2">{formatTime(currentTime)}</div>
                  <div className="flex justify-center space-x-2">
                    <Button
                      size="sm"
                      onClick={startTimer}
                      disabled={isRunning}
                      className="bg-success text-white hover:bg-green-600"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={pauseTimer}
                      disabled={!isRunning}
                      className="bg-warning text-white hover:bg-orange-600"
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={resetTimer}
                      className="bg-error text-white hover:bg-red-600"
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2">
                    <Select 
                      value={currentPeriod.toString()} 
                      onValueChange={(value) => setCurrentPeriod(parseInt(value))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Period 1</SelectItem>
                        <SelectItem value="2">Period 2</SelectItem>
                        <SelectItem value="3">Period 3</SelectItem>
                        <SelectItem value="4">Overtime</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* My Wrestler Scoring */}
              <div className="col-span-4">
                <div className="text-center mb-2">
                  <h4 className="font-semibold text-primary">{myWrestler?.name}</h4>
                  <div className="text-3xl font-bold text-primary">{myScore}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button size="sm" onClick={() => addPoints('my_wrestler', 1, 'escape')} className="bg-primary text-white">
                    +1 ESC
                  </Button>
                  <Button size="sm" onClick={() => addPoints('my_wrestler', 2, 'takedown')} className="bg-primary text-white">
                    +2 TD
                  </Button>
                  <Button size="sm" onClick={() => addPoints('my_wrestler', 2, 'reversal')} className="bg-primary text-white">
                    +2 REV
                  </Button>
                  <Button size="sm" onClick={() => addPoints('my_wrestler', 2, 'near_fall')} className="bg-primary text-white">
                    +2 NF
                  </Button>
                  <Button size="sm" onClick={() => addPoints('my_wrestler', 3, 'near_fall')} className="bg-primary text-white">
                    +3 NF
                  </Button>
                  <Button size="sm" onClick={() => addPoints('my_wrestler', 6, 'pin')} className="bg-green-600 text-white">
                    PIN
                  </Button>
                </div>
              </div>

              {/* Opponent Scoring */}
              <div className="col-span-4">
                <div className="text-center mb-2">
                  <h4 className="font-semibold text-secondary">{selectedMatch.opponentName}</h4>
                  <div className="text-3xl font-bold text-secondary">{opponentScore}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button size="sm" onClick={() => addPoints('opponent', 1, 'escape')} className="bg-secondary text-white">
                    +1 ESC
                  </Button>
                  <Button size="sm" onClick={() => addPoints('opponent', 2, 'takedown')} className="bg-secondary text-white">
                    +2 TD
                  </Button>
                  <Button size="sm" onClick={() => addPoints('opponent', 2, 'reversal')} className="bg-secondary text-white">
                    +2 REV
                  </Button>
                  <Button size="sm" onClick={() => addPoints('opponent', 2, 'near_fall')} className="bg-secondary text-white">
                    +2 NF
                  </Button>
                  <Button size="sm" onClick={() => addPoints('opponent', 3, 'near_fall')} className="bg-secondary text-white">
                    +3 NF
                  </Button>
                  <Button size="sm" onClick={() => addPoints('opponent', 6, 'pin')} className="bg-green-600 text-white">
                    PIN
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Event Log Sidebar */}
        <div className="w-80 bg-gray-50 border-l p-4 overflow-y-auto">
          <h4 className="font-semibold mb-4">Match Events</h4>
          <div className="space-y-2">
            {eventLogs.map((event) => (
              <div key={event.id} className="bg-white p-3 rounded-lg text-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium">{event.action}</span>
                  <span className="text-gray-500">{formatTime(event.timeRemaining)}</span>
                </div>
                <div className="text-gray-600">{event.description}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Score: {event.scoreAfter.myWrestler} - {event.scoreAfter.opponent}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}