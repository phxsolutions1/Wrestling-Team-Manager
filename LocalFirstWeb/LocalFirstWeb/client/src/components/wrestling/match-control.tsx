import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Play, Pause, Square, Video, VideoOff, Palette, Check } from 'lucide-react';
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
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<'pending' | 'granted' | 'denied' | 'prompt'>('pending');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [myWrestlerColor, setMyWrestlerColor] = useState('#3B82F6'); // Default blue
  const [opponentColor, setOpponentColor] = useState('#EF4444'); // Default red

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
      
      // Load saved colors for this match from localStorage
      const savedColors = localStorage.getItem(`match-colors-${selectedMatch.id}`);
      if (savedColors) {
        const { myWrestlerColor: savedMyColor, opponentColor: savedOpponentColor } = JSON.parse(savedColors);
        setMyWrestlerColor(savedMyColor || '#3B82F6');
        setOpponentColor(savedOpponentColor || '#EF4444');
      }
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

  const requestCameraPermission = useCallback(async () => {
    setIsRequestingPermission(true);
    
    try {
      // This will trigger the browser permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true
      });
      
      // Stop the stream immediately - we just wanted to get permission
      stream.getTracks().forEach(track => track.stop());
      
      setCameraPermissionStatus('granted');
      toast({ 
        title: 'Camera access granted', 
        description: 'You can now initialize the camera for video recording'
      });
    } catch (error: any) {
      console.error('Permission request failed:', error);
      setCameraPermissionStatus('denied');
      
      if (error.name === 'NotAllowedError') {
        toast({ 
          title: 'Camera access denied', 
          description: 'Please enable camera and microphone permissions in your browser settings. Look for a camera icon in your address bar and click "Allow".',
          variant: 'destructive' 
        });
      } else if (error.name === 'NotFoundError') {
        toast({ 
          title: 'No camera found', 
          description: 'Please connect a camera and microphone to record matches',
          variant: 'destructive' 
        });
      } else {
        toast({ 
          title: 'Camera access failed', 
          description: error.message || 'Unknown error occurred',
          variant: 'destructive' 
        });
      }
    } finally {
      setIsRequestingPermission(false);
    }
  }, [toast]);

  // Save colors when they change
  useEffect(() => {
    if (selectedMatch) {
      const colors = { myWrestlerColor, opponentColor };
      localStorage.setItem(`match-colors-${selectedMatch.id}`, JSON.stringify(colors));
    }
  }, [myWrestlerColor, opponentColor, selectedMatch]);

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
          // Create download link for the video
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast({ title: 'Recording saved' });
        },
        onError: (error) => {
          toast({ title: 'Recording error', description: error.message, variant: 'destructive' });
        }
      });

      await videoRecorderRef.current.initializeCamera(videoRef.current);
      setCameraInitialized(true);
      setCameraPermissionStatus('granted');
      toast({ title: 'Camera initialized successfully' });
    } catch (error: any) {
      console.error('Camera initialization failed:', error);
      setCameraInitialized(false);
      
      if (error.name === 'NotAllowedError') {
        setCameraPermissionStatus('denied');
        toast({ 
          title: 'Camera access denied', 
          description: 'Please click "Allow" when prompted for camera and microphone access',
          variant: 'destructive' 
        });
      } else {
        toast({ 
          title: 'Camera initialization failed', 
          description: error.message || 'Unknown error occurred',
          variant: 'destructive' 
        });
      }
    }
  }, [selectedMatch, cameraInitialized, toast]);



  useEffect(() => {
    // Check camera permissions when component mounts or match changes
    if (selectedMatch) {
      checkCameraPermissions();
    }

    return () => {
      if (videoRecorderRef.current) {
        videoRecorderRef.current.cleanup();
      }
    };
  }, [selectedMatch]);

  const checkCameraPermissions = useCallback(async () => {
    try {
      // Check if permissions API is supported
      if ('permissions' in navigator) {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        
        if (cameraPermission.state === 'granted' && micPermission.state === 'granted') {
          setCameraPermissionStatus('granted');
        } else if (cameraPermission.state === 'denied' || micPermission.state === 'denied') {
          setCameraPermissionStatus('denied');
        } else {
          setCameraPermissionStatus('prompt');
        }
      } else {
        setCameraPermissionStatus('prompt');
      }
    } catch (error) {
      console.log('Permissions API not fully supported, will prompt for access');
      setCameraPermissionStatus('prompt');
    }
  }, []);

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
    if (!videoRecorderRef.current || !cameraInitialized) {
      toast({ 
        title: 'Camera not ready', 
        description: 'Please initialize the camera first',
        variant: 'destructive' 
      });
      return;
    }
    
    if (videoRecorderRef.current && !isRecording) {
      try {
        // Check if the stream is still active before starting recording
        if (videoRecorderRef.current.isStreamActive()) {
          await videoRecorderRef.current.startRecording();
          // Don't set isRecording here - let the onStart callback handle it
        } else {
          // Re-initialize camera if stream is not active
          await initializeCamera();
          await videoRecorderRef.current.startRecording();
        }
      } catch (error: any) {
        console.error('Recording start failed:', error);
        toast({ 
          title: 'Failed to start recording', 
          description: error.message || 'Unknown recording error',
          variant: 'destructive' 
        });
      }
    }
  };

  const stopRecording = () => {
    if (videoRecorderRef.current && isRecording) {
      try {
        videoRecorderRef.current.stopRecording();
        // Don't set isRecording here - let the onStop callback handle it
      } catch (error) {
        console.error('Recording stop failed:', error);
        setIsRecording(false);
        toast({ 
          title: 'Recording stop failed', 
          description: 'Video may not have been saved properly',
          variant: 'destructive' 
        });
      }
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
            {cameraPermissionStatus === 'pending' || cameraPermissionStatus === 'prompt' ? (
              <Button
                size="sm"
                onClick={requestCameraPermission}
                disabled={isRequestingPermission}
                data-testid="button-request-camera"
              >
                <Video className="h-4 w-4 mr-1" />
                {isRequestingPermission ? 'Requesting Access...' : 'Enable Camera'}
              </Button>
            ) : cameraPermissionStatus === 'denied' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={requestCameraPermission}
                disabled={isRequestingPermission}
                data-testid="button-retry-camera"
              >
                <Video className="h-4 w-4 mr-1" />
                {isRequestingPermission ? 'Requesting Access...' : 'Retry Camera Access'}
              </Button>
            ) : !cameraInitialized ? (
              <Button
                size="sm"
                onClick={initializeCamera}
                data-testid="button-init-camera"
              >
                <Video className="h-4 w-4 mr-1" />
                Initialize Camera
              </Button>
            ) : (
              <Button
                size="sm"
                variant={isRecording ? "destructive" : "default"}
                onClick={isRecording ? stopRecording : startRecording}
                data-testid="button-record"
              >
                {isRecording ? <VideoOff className="h-4 w-4 mr-1" /> : <Video className="h-4 w-4 mr-1" />}
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowColorSettings(!showColorSettings)}
              data-testid="button-color-settings"
            >
              <Palette className="h-4 w-4 mr-1" />
              Colors
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

      {/* Color Settings Dropdown */}
      {showColorSettings && (
        <div className="bg-white border-b shadow-sm">
          <div className="px-4 py-3">
            <div className="max-w-md mx-auto">
              <h4 className="font-medium text-gray-900 mb-3">Scorer Colors</h4>
              <div className="grid grid-cols-2 gap-4">
                {/* My Wrestler Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {myWrestler?.name || 'Home Wrestler'}
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={myWrestlerColor}
                      onChange={(e) => setMyWrestlerColor(e.target.value)}
                      className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                      data-testid="input-my-wrestler-color"
                    />
                    <div className="flex space-x-1">
                      {['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#000000', '#6B7280', '#FFFFFF'].map((color) => (
                        <button
                          key={color}
                          onClick={() => setMyWrestlerColor(color)}
                          className={`w-6 h-6 rounded border-2 hover:scale-110 transition-transform ${
                            color === '#FFFFFF' ? 'border-gray-400' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          data-testid={`preset-my-color-${color}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Opponent Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {selectedMatch.opponentName || 'Opponent'}
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={opponentColor}
                      onChange={(e) => setOpponentColor(e.target.value)}
                      className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                      data-testid="input-opponent-color"
                    />
                    <div className="flex space-x-1">
                      {['#EF4444', '#F59E0B', '#8B5CF6', '#10B981', '#3B82F6', '#000000', '#6B7280', '#FFFFFF'].map((color) => (
                        <button
                          key={color}
                          onClick={() => setOpponentColor(color)}
                          className={`w-6 h-6 rounded border-2 hover:scale-110 transition-transform ${
                            color === '#FFFFFF' ? 'border-gray-400' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          data-testid={`preset-opponent-color-${color}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-4 p-3 bg-gray-900 rounded-lg">
                <div className="text-white text-center">
                  <div className="text-xs text-gray-300 mb-1">Preview</div>
                  <div className="flex items-center justify-center space-x-4">
                    <div className="text-center">
                      <div className="text-xs text-gray-300">{myWrestler?.name || 'Home'}</div>
                      <div className="font-mono text-2xl font-bold" style={{ color: myWrestlerColor }}>{myScore}</div>
                    </div>
                    <div className="text-gray-400">-</div>
                    <div className="text-center">
                      <div className="text-xs text-gray-300">{selectedMatch.opponentName || 'Away'}</div>
                      <div className="font-mono text-2xl font-bold" style={{ color: opponentColor }}>{opponentScore}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <Button 
                  size="sm" 
                  onClick={() => setShowColorSettings(false)}
                  data-testid="button-close-colors"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            
            {/* Corner Score Overlay - Sports Style */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Corner Scoreboard - Top Left */}
              <div className="absolute top-4 left-4">
                <div className="bg-black bg-opacity-80 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
                  <div className="flex items-center space-x-4 text-sm">
                    {/* Timer and Period */}
                    <div className="text-center">
                      <div className="font-mono text-lg font-bold text-yellow-400">{formatTime(currentTime)}</div>
                      <div className="text-xs text-gray-300">{getPeriodLabel(currentPeriod)}</div>
                    </div>
                    
                    {/* Scores */}
                    <div className="border-l border-gray-600 pl-3">
                      <div className="flex items-center space-x-2">
                        <div className="text-center">
                          <div className="text-xs text-gray-300 truncate max-w-16">{myWrestler?.name || 'Home'}</div>
                          <div className="font-mono text-xl font-bold" style={{ color: myWrestlerColor }}>{myScore}</div>
                        </div>
                        <div className="text-gray-400">-</div>
                        <div className="text-center">
                          <div className="text-xs text-gray-300 truncate max-w-16">{selectedMatch.opponentName || 'Away'}</div>
                          <div className="font-mono text-xl font-bold" style={{ color: opponentColor }}>{opponentScore}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recording Indicator - Top Right */}
              {isRecording && (
                <div className="absolute top-4 right-4">
                  <div className="flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">REC</span>
                  </div>
                </div>
              )}

              {/* Match Info - Bottom Right Corner */}
              <div className="absolute bottom-4 right-4">
                <div className="bg-black bg-opacity-80 backdrop-blur-sm rounded-lg px-3 py-1 text-white">
                  <div className="text-xs text-gray-300">
                    {selectedMatch.boutNumber && `#${selectedMatch.boutNumber} • `}
                    {selectedMatch.weightClass} lbs
                  </div>
                </div>
              </div>
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
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">SV1</SelectItem>
                        <SelectItem value="5">TB2</SelectItem>
                        <SelectItem value="6">UTB</SelectItem>
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
                  <Button size="sm" onClick={() => addPoints('my_wrestler', 1, 'escape')} 
                    style={{ backgroundColor: myWrestlerColor }} className="text-white">
                    +1 ESC
                  </Button>
                  <Button size="sm" onClick={() => addPoints('my_wrestler', 2, 'takedown')} 
                    style={{ backgroundColor: myWrestlerColor }} className="text-white">
                    +2 TD
                  </Button>
                  <Button size="sm" onClick={() => addPoints('my_wrestler', 2, 'reversal')} 
                    style={{ backgroundColor: myWrestlerColor }} className="text-white">
                    +2 REV
                  </Button>
                  <Button size="sm" onClick={() => addPoints('my_wrestler', 2, 'near_fall')} 
                    style={{ backgroundColor: myWrestlerColor }} className="text-white">
                    +2 NF
                  </Button>
                  <Button size="sm" onClick={() => addPoints('my_wrestler', 3, 'near_fall')} 
                    style={{ backgroundColor: myWrestlerColor }} className="text-white">
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
                  <Button size="sm" onClick={() => addPoints('opponent', 1, 'escape')} 
                    style={{ backgroundColor: opponentColor }} className="text-white">
                    +1 ESC
                  </Button>
                  <Button size="sm" onClick={() => addPoints('opponent', 2, 'takedown')} 
                    style={{ backgroundColor: opponentColor }} className="text-white">
                    +2 TD
                  </Button>
                  <Button size="sm" onClick={() => addPoints('opponent', 2, 'reversal')} 
                    style={{ backgroundColor: opponentColor }} className="text-white">
                    +2 REV
                  </Button>
                  <Button size="sm" onClick={() => addPoints('opponent', 2, 'near_fall')} 
                    style={{ backgroundColor: opponentColor }} className="text-white">
                    +2 NF
                  </Button>
                  <Button size="sm" onClick={() => addPoints('opponent', 3, 'near_fall')} 
                    style={{ backgroundColor: opponentColor }} className="text-white">
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