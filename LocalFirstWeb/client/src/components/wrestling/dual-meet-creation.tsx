import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Trophy, Plus, X, UserCheck, UserX, Edit3 } from 'lucide-react';
import { useWrestlingData } from '@/hooks/use-wrestling-data';
import { useToast } from '@/hooks/use-toast';
import { youthWeightClasses, type YouthGradeLevel, type DualMeet, type InsertDualMeet } from '@shared/schema';

interface DualMeetCreationProps {
  onBack: () => void;
  onDualMeetCreated: (dualMeetId: string) => void;
}

export function DualMeetCreation({ onBack, onDualMeetCreated }: DualMeetCreationProps) {
  const { teams, wrestlers, loading } = useWrestlingData();
  const { toast } = useToast();

  const [dualMeetName, setDualMeetName] = useState('');
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [homeTeamName, setHomeTeamName] = useState('');
  const [awayTeamName, setAwayTeamName] = useState('');
  const [isHomeTeamCustom, setIsHomeTeamCustom] = useState(false);
  const [isAwayTeamCustom, setIsAwayTeamCustom] = useState(false);
  const [gradeLevel, setGradeLevel] = useState<YouthGradeLevel>('high-school');
  const [selectedWeightClasses, setSelectedWeightClasses] = useState<number[]>([]);
  const [startingWeightClass, setStartingWeightClass] = useState<number | null>(null);
  const [customWeightClasses, setCustomWeightClasses] = useState<string>('');
  const [useCustomWeights, setUseCustomWeights] = useState(false);
  const [homeTeamOddsOrEvens, setHomeTeamOddsOrEvens] = useState<'odds' | 'evens'>('odds');
  const [homeRoster, setHomeRoster] = useState<Record<string, string | undefined>>({});
  const [awayRoster, setAwayRoster] = useState<Record<string, string | undefined>>({});
  const [currentStep, setCurrentStep] = useState(1);

  const availableWeightClasses = useCustomWeights 
    ? customWeightClasses.split(',').map(w => parseInt(w.trim())).filter(w => !isNaN(w))
    : youthWeightClasses[gradeLevel];
  const homeTeam = teams.find(t => t.id === homeTeamId);
  const awayTeam = teams.find(t => t.id === awayTeamId);
  const homeWrestlers = wrestlers.filter(w => w.teamId === homeTeamId);
  const awayWrestlers = wrestlers.filter(w => w.teamId === awayTeamId);

  // Auto-generate dual meet name when both teams are selected
  useEffect(() => {
    const homeDisplayName = isHomeTeamCustom ? homeTeamName : homeTeam?.name;
    const awayDisplayName = isAwayTeamCustom ? awayTeamName : awayTeam?.name;
    
    if (homeDisplayName && awayDisplayName) {
      setDualMeetName(`${homeDisplayName} vs ${awayDisplayName}`);
    }
  }, [homeTeam, awayTeam, homeTeamName, awayTeamName, isHomeTeamCustom, isAwayTeamCustom]);

  useEffect(() => {
    // Auto-select all weight classes when grade level changes or custom weights are updated
    if (!useCustomWeights || availableWeightClasses.length > 0) {
      setSelectedWeightClasses([...availableWeightClasses]);
      setStartingWeightClass(availableWeightClasses[0]);
    }
  }, [gradeLevel, useCustomWeights, availableWeightClasses]);

  const toggleWeightClass = (weightClass: number) => {
    setSelectedWeightClasses(prev => 
      prev.includes(weightClass) 
        ? prev.filter(w => w !== weightClass)
        : [...prev, weightClass].sort((a, b) => a - b)
    );
  };

  const generateHomeTeamChoiceMatches = () => {
    if (!startingWeightClass) return [];
    
    const startIndex = selectedWeightClasses.indexOf(startingWeightClass);
    const choiceMatches: number[] = [];
    
    // Every even position gets choice if team selected evens, odds if team selected odds
    selectedWeightClasses.forEach((weightClass, index) => {
      const adjustedIndex = (startIndex + index) % selectedWeightClasses.length;
      const isEvenPosition = adjustedIndex % 2 === 0;
      
      if ((homeTeamOddsOrEvens === 'evens' && isEvenPosition) || 
          (homeTeamOddsOrEvens === 'odds' && !isEvenPosition)) {
        choiceMatches.push(weightClass);
      }
    });
    
    return choiceMatches;
  };

  const setRosterWrestler = (team: 'home' | 'away', weightClass: string, wrestlerId: string | undefined) => {
    if (team === 'home') {
      setHomeRoster(prev => ({ ...prev, [weightClass]: wrestlerId }));
    } else {
      setAwayRoster(prev => ({ ...prev, [weightClass]: wrestlerId }));
    }
  };

  const createDualMeet = async () => {
    const hasHomeTeam = homeTeamId || homeTeamName.trim();
    const hasAwayTeam = awayTeamId || awayTeamName.trim();
    
    if (!dualMeetName.trim() || !hasHomeTeam || !hasAwayTeam || selectedWeightClasses.length === 0 || !startingWeightClass) {
      toast({ title: 'Please complete all required fields', variant: 'destructive' });
      return;
    }

    try {
      const homeTeamChoiceMatches = generateHomeTeamChoiceMatches();
      
      const dualMeetData: InsertDualMeet = {
        name: dualMeetName.trim(),
        homeTeamId: homeTeamId || `custom-${Date.now()}-home`,
        awayTeamId: awayTeamId || `custom-${Date.now()}-away`,
        gradeLevel,
        weightClasses: selectedWeightClasses,
        startingWeightClass,
        homeTeamOddsOrEvens,
        homeTeamChoiceMatches,
        homeRoster,
        awayRoster,
        status: 'setup'
      };

      // For now, store in localStorage since we don't have dual meet storage yet
      const dualMeetId = `dual-${Date.now()}`;
      const dualMeet: DualMeet = {
        ...dualMeetData,
        id: dualMeetId,
        matchIds: [],
        createdAt: new Date()
      };

      const existingDualMeets = JSON.parse(localStorage.getItem('wrestling-dual-meets') || '[]');
      existingDualMeets.push(dualMeet);
      localStorage.setItem('wrestling-dual-meets', JSON.stringify(existingDualMeets));

      toast({ title: 'Dual meet created successfully' });
      onDualMeetCreated(dualMeetId);
    } catch (error) {
      console.error('Failed to create dual meet:', error);
      toast({ title: 'Failed to create dual meet', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={onBack} className="mr-4">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Create Dual Meet</h2>
            <p className="text-gray-600">Set up a dual meet between two teams</p>
          </div>
        </div>

        {/* Step Progress */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`w-16 h-0.5 mx-2 ${
                    currentStep > step ? 'bg-primary' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="dual-name">Dual Meet Name</Label>
                <Input
                  id="dual-name"
                  value={dualMeetName}
                  onChange={(e) => setDualMeetName(e.target.value)}
                  placeholder="e.g., Hawks vs Eagles Dual"
                  data-testid="input-dual-name"
                />
              </div>

              <div>
                <Label>Grade Level</Label>
                <Select value={gradeLevel} onValueChange={(value: YouthGradeLevel) => setGradeLevel(value)}>
                  <SelectTrigger data-testid="select-grade-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="k-2">K-2 (Kindergarten - 2nd Grade)</SelectItem>
                    <SelectItem value="3-4">3-4 (3rd - 4th Grade)</SelectItem>
                    <SelectItem value="5-6">5-6 (5th - 6th Grade)</SelectItem>
                    <SelectItem value="7-8">7-8 (7th - 8th Grade / Middle School)</SelectItem>
                    <SelectItem value="high-school">High School</SelectItem>
                    <SelectItem value="college">College</SelectItem>
                    <SelectItem value="senior">Senior Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Home Team</Label>
                  <div className="space-y-2">
                    <Select 
                      value={isHomeTeamCustom ? 'custom' : homeTeamId} 
                      onValueChange={(value) => {
                        if (value === 'custom') {
                          setIsHomeTeamCustom(true);
                          setHomeTeamId('');
                        } else {
                          setIsHomeTeamCustom(false);
                          setHomeTeamId(value);
                          setHomeTeamName('');
                        }
                      }}
                    >
                      <SelectTrigger data-testid="select-home-team">
                        <SelectValue placeholder="Select home team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Enter team manually...</SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isHomeTeamCustom && (
                      <Input
                        value={homeTeamName}
                        onChange={(e) => setHomeTeamName(e.target.value)}
                        placeholder="Enter home team name"
                        data-testid="input-home-team-name"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <Label>Away Team</Label>
                  <div className="space-y-2">
                    <Select 
                      value={isAwayTeamCustom ? 'custom' : awayTeamId} 
                      onValueChange={(value) => {
                        if (value === 'custom') {
                          setIsAwayTeamCustom(true);
                          setAwayTeamId('');
                        } else {
                          setIsAwayTeamCustom(false);
                          setAwayTeamId(value);
                          setAwayTeamName('');
                        }
                      }}
                    >
                      <SelectTrigger data-testid="select-away-team">
                        <SelectValue placeholder="Select away team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Enter team manually...</SelectItem>
                        {teams.filter(t => t.id !== homeTeamId).map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isAwayTeamCustom && (
                      <Input
                        value={awayTeamName}
                        onChange={(e) => setAwayTeamName(e.target.value)}
                        placeholder="Enter away team name"
                        data-testid="input-away-team-name"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={() => setCurrentStep(2)}
                  disabled={!dualMeetName.trim() || 
                           (!homeTeamId && !homeTeamName.trim()) || 
                           (!awayTeamId && !awayTeamName.trim())}
                  data-testid="button-next-step1"
                >
                  Next: Weight Classes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Edit3 className="h-5 w-5 mr-2" />
                Weight Classes & Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Weight Classes</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="use-custom-weights"
                      checked={useCustomWeights}
                      onChange={(e) => setUseCustomWeights(e.target.checked)}
                      className="rounded border-gray-300"
                      data-testid="checkbox-custom-weights"
                    />
                    <Label htmlFor="use-custom-weights" className="text-sm">Use custom weight classes</Label>
                  </div>
                </div>

                {!useCustomWeights ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Standard weight classes for {gradeLevel === 'k-2' ? 'K-2' : 
                                                 gradeLevel === '3-4' ? '3-4' :
                                                 gradeLevel === '5-6' ? '5-6' :
                                                 gradeLevel === '7-8' ? '7-8' :
                                                 gradeLevel === 'high-school' ? 'High School' :
                                                 gradeLevel === 'college' ? 'College' :
                                                 'Senior Level'}
                    </p>
                    <div className="grid grid-cols-8 gap-2">
                      {youthWeightClasses[gradeLevel].map((weightClass) => (
                        <button
                          key={weightClass}
                          onClick={() => toggleWeightClass(weightClass)}
                          className={`p-2 text-sm rounded border transition-colors ${
                            selectedWeightClasses.includes(weightClass)
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                          data-testid={`toggle-weight-${weightClass}`}
                        >
                          {weightClass}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="custom-weights">Enter weight classes (comma-separated)</Label>
                    <Input
                      id="custom-weights"
                      value={customWeightClasses}
                      onChange={(e) => setCustomWeightClasses(e.target.value)}
                      placeholder="e.g., 106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285"
                      className="mt-1"
                      data-testid="input-custom-weights"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter weight classes separated by commas. Numbers only.
                    </p>
                    
                    {availableWeightClasses.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600 mb-2">Custom weight classes:</p>
                        <div className="grid grid-cols-8 gap-2">
                          {availableWeightClasses.map((weightClass) => (
                            <button
                              key={weightClass}
                              onClick={() => toggleWeightClass(weightClass)}
                              className={`p-2 text-sm rounded border transition-colors ${
                                selectedWeightClasses.includes(weightClass)
                                  ? 'bg-primary text-white border-primary'
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                              }`}
                              data-testid={`toggle-custom-weight-${weightClass}`}
                            >
                              {weightClass}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <p className="text-sm text-gray-600">
                  Click weight classes to select/deselect. Selected: {selectedWeightClasses.length}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Starting Weight Class (Match 1)</Label>
                  <Select 
                    value={startingWeightClass?.toString() || ''} 
                    onValueChange={(value) => setStartingWeightClass(parseInt(value))}
                  >
                    <SelectTrigger data-testid="select-starting-weight">
                      <SelectValue placeholder="Select starting weight" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedWeightClasses.map((weightClass) => (
                        <SelectItem key={weightClass} value={weightClass.toString()}>
                          {weightClass} lbs
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    This becomes Match 1. The dual meet proceeds in order through all selected weight classes.
                  </p>
                </div>

                <div>
                  <Label>Home Team Gets Choice On</Label>
                  <Select 
                    value={homeTeamOddsOrEvens} 
                    onValueChange={(value: 'odds' | 'evens') => setHomeTeamOddsOrEvens(value)}
                  >
                    <SelectTrigger data-testid="select-odds-evens">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="odds">Odd Matches (1st, 3rd, 5th...)</SelectItem>
                      <SelectItem value="evens">Even Matches (2nd, 4th, 6th...)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {startingWeightClass && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Match Order Preview</h4>
                  <p className="text-xs text-blue-700 mb-3">
                    Starting at {startingWeightClass} lbs (Match 1), proceeding in sequential order through all weight classes.
                  </p>
                  <div className="grid grid-cols-1 gap-1 text-sm">
                    {(() => {
                      const startIndex = selectedWeightClasses.indexOf(startingWeightClass);
                      const orderedMatches = [
                        ...selectedWeightClasses.slice(startIndex),
                        ...selectedWeightClasses.slice(0, startIndex)
                      ];
                      
                      return orderedMatches.map((weightClass, index) => {
                        const isEvenPosition = index % 2 === 0;
                        const homeGetsChoice = (homeTeamOddsOrEvens === 'evens' && !isEvenPosition) || 
                                             (homeTeamOddsOrEvens === 'odds' && isEvenPosition);
                        
                        return (
                          <div key={weightClass} className="flex justify-between items-center">
                            <span className="font-medium">Match {index + 1}: {weightClass} lbs</span>
                            <Badge variant={homeGetsChoice ? "default" : "secondary"}>
                              {homeGetsChoice ? `${isHomeTeamCustom ? homeTeamName : homeTeam?.name || 'Home'} Choice` : 
                                              `${isAwayTeamCustom ? awayTeamName : awayTeam?.name || 'Away'} Choice`}
                            </Badge>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button 
                  onClick={() => setCurrentStep(3)}
                  disabled={selectedWeightClasses.length === 0 || !startingWeightClass || 
                           (useCustomWeights && customWeightClasses.trim() === '')}
                  data-testid="button-next-step2"
                >
                  Next: Home Roster
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                {isHomeTeamCustom ? homeTeamName : homeTeam?.name || 'Home Team'} Roster
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedWeightClasses.map((weightClass) => (
                  <div key={weightClass} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="font-medium">{weightClass} lbs</div>
                    <div className="flex items-center space-x-2">
                      <Select 
                        value={homeRoster[weightClass.toString()] || 'forfeit'} 
                        onValueChange={(value) => setRosterWrestler('home', weightClass.toString(), value === 'forfeit' ? undefined : value)}
                      >
                        <SelectTrigger className="w-48" data-testid={`select-home-wrestler-${weightClass}`}>
                          <SelectValue placeholder="Select wrestler or forfeit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="forfeit">Forfeit</SelectItem>
                          {!isHomeTeamCustom && homeWrestlers.map((wrestler) => (
                            <SelectItem key={wrestler.id} value={wrestler.id}>
                              {wrestler.name} ({wrestler.grade})
                            </SelectItem>
                          ))}
                          {isHomeTeamCustom && (
                            <SelectItem value="manual-entry" disabled>
                              Manual entry - wrestlers from custom teams need to be added via Roster tab
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {homeRoster[weightClass.toString()] ? (
                        <UserCheck className="h-4 w-4 text-green-500" />
                      ) : (
                        <UserX className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  Back
                </Button>
                <Button onClick={() => setCurrentStep(4)} data-testid="button-next-step3">
                  Next: Away Roster
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                {isAwayTeamCustom ? awayTeamName : awayTeam?.name || 'Away Team'} Roster
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedWeightClasses.map((weightClass) => (
                  <div key={weightClass} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="font-medium">{weightClass} lbs</div>
                    <div className="flex items-center space-x-2">
                      <Select 
                        value={awayRoster[weightClass.toString()] || 'forfeit'} 
                        onValueChange={(value) => setRosterWrestler('away', weightClass.toString(), value === 'forfeit' ? undefined : value)}
                      >
                        <SelectTrigger className="w-48" data-testid={`select-away-wrestler-${weightClass}`}>
                          <SelectValue placeholder="Select wrestler or forfeit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="forfeit">Forfeit</SelectItem>
                          {!isAwayTeamCustom && awayWrestlers.map((wrestler) => (
                            <SelectItem key={wrestler.id} value={wrestler.id}>
                              {wrestler.name} ({wrestler.grade})
                            </SelectItem>
                          ))}
                          {isAwayTeamCustom && (
                            <SelectItem value="manual-entry" disabled>
                              Manual entry - wrestlers from custom teams need to be added via Roster tab
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {awayRoster[weightClass.toString()] ? (
                        <UserCheck className="h-4 w-4 text-green-500" />
                      ) : (
                        <UserX className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setCurrentStep(3)}>
                  Back
                </Button>
                <Button onClick={createDualMeet} data-testid="button-create-dual">
                  <Trophy className="h-4 w-4 mr-2" />
                  Create Dual Meet
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}