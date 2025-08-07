import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Weight, Activity, TrendingUp, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import { useWrestlingData } from '@/hooks/use-wrestling-data';
import { useToast } from '@/hooks/use-toast';

const WEIGHT_CLASSES = ['106', '113', '120', '126', '132', '138', '145', '152', '160', '170', '182', '195', '220', '285'];

export function WeighInsManagement() {
  const {
    teams,
    wrestlers,
    competitions,
    matches,
    updateWrestler,
    getWrestlersByTeam,
    getTeamById,
    loading
  } = useWrestlingData();

  const { toast } = useToast();

  // Competition context - persists until changed or new day
  const [competitionContext, setCompetitionContext] = useState<{
    name: string;
    type: string;
    date: string;
    opponentTeam?: string;
    opponentTeams?: string[];
  } | null>(() => {
    const saved = localStorage.getItem('weighin-competition-context');
    if (saved) {
      const parsed = JSON.parse(saved);
      const savedDate = new Date(parsed.date).toDateString();
      const today = new Date().toDateString();
      // Reset if it's a new day
      if (savedDate !== today) {
        localStorage.removeItem('weighin-competition-context');
        return null;
      }
      return parsed;
    }
    return null;
  });

  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedWrestler, setSelectedWrestler] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs');
  const [weighInTime, setWeighInTime] = useState<string>(
    new Date().toISOString().slice(0, 16)
  );
  const [weighType, setWeighType] = useState<'in' | 'out'>('in');
  const [practiceWeighIns, setPracticeWeighIns] = useState<Map<string, Array<{
    weight: number;
    unit: 'lbs' | 'kg';
    timestamp: Date;
    type: 'in' | 'out';
  }>>>(new Map());

  // Competition context form
  const [showCompetitionForm, setShowCompetitionForm] = useState<boolean>(!competitionContext);
  const [newCompetitionName, setNewCompetitionName] = useState<string>('');
  const [newCompetitionType, setNewCompetitionType] = useState<string>('single_dual');
  const [newOpponentTeam, setNewOpponentTeam] = useState<string>('');
  const [selectedOpponents, setSelectedOpponents] = useState<string[]>([]);

  const availableWrestlers = selectedTeam === 'all' 
    ? wrestlers 
    : getWrestlersByTeam(selectedTeam);

  // Get existing opponent teams from matches
  const existingOpponentTeams = Array.from(new Set(
    matches.map(m => m.opponentTeam)
      .filter(Boolean)
      .filter(team => team!.trim().length > 0)
  )).sort();

  const setCompetitionContextAndSave = (context: { name: string; type: string; date: string; opponentTeam?: string; opponentTeams?: string[] }) => {
    setCompetitionContext(context);
    localStorage.setItem('weighin-competition-context', JSON.stringify(context));
  };

  const handleSetCompetitionContext = () => {
    if (!newCompetitionName.trim()) {
      toast({ title: 'Please enter competition name', variant: 'destructive' });
      return;
    }

    if (newCompetitionType === 'single_dual' && (!newOpponentTeam.trim() || newOpponentTeam === 'custom')) {
      toast({ title: 'Please enter opponent team name for dual meet', variant: 'destructive' });
      return;
    }

    if (newCompetitionType === 'multi_dual' && selectedOpponents.length === 0) {
      toast({ title: 'Please select at least one opponent team for multi dual', variant: 'destructive' });
      return;
    }

    const context = {
      name: newCompetitionName.trim(),
      type: newCompetitionType,
      date: new Date().toISOString(),
      opponentTeam: newCompetitionType === 'single_dual' ? newOpponentTeam.trim() : undefined,
      opponentTeams: newCompetitionType === 'multi_dual' ? selectedOpponents : undefined
    };

    setCompetitionContextAndSave(context);
    setShowCompetitionForm(false);
    setNewCompetitionName('');
    setNewOpponentTeam('');
    setSelectedOpponents([]);
    
    let description = `Now weighing in for: ${context.name}`;
    if (context.opponentTeam) {
      description += ` vs ${context.opponentTeam}`;
    } else if (context.opponentTeams && context.opponentTeams.length > 0) {
      description += ` vs ${context.opponentTeams.join(', ')}`;
    }
    
    toast({ 
      title: 'Competition context set', 
      description
    });
  };

  const handleChangeCompetition = () => {
    setShowCompetitionForm(true);
  };

  const handleClearCompetition = () => {
    setCompetitionContext(null);
    localStorage.removeItem('weighin-competition-context');
    setShowCompetitionForm(true);
    toast({ title: 'Competition context cleared' });
  };

  const wrestlersWithWeighIns = wrestlers.filter(w => w.weighIn);

  const filteredWeighIns = selectedTeam === 'all' 
    ? wrestlersWithWeighIns 
    : wrestlersWithWeighIns.filter(w => w.teamId === selectedTeam);

  const handleRecordWeight = async () => {
    if (!selectedWrestler || !weight) {
      toast({ title: 'Please select wrestler and enter weight', variant: 'destructive' });
      return;
    }

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      toast({ title: 'Please enter a valid weight', variant: 'destructive' });
      return;
    }

    try {
      const wrestler = wrestlers.find(w => w.id === selectedWrestler);
      if (!wrestler) return;

      const weighIn = {
        weight: weightNum,
        unit,
        timestamp: new Date(weighInTime),
        status: 'pending' as const,
        competition: competitionContext ? {
          name: competitionContext.name,
          type: competitionContext.type
        } : undefined,
      };

      await updateWrestler(selectedWrestler, {
        ...wrestler,
        weighIn,
      });

      toast({ 
        title: 'Weight recorded successfully',
        description: competitionContext ? `For ${competitionContext.name}` : undefined
      });
      setSelectedWrestler('');
      setWeight('');
      setWeighInTime(new Date().toISOString().slice(0, 16));
    } catch (error) {
      toast({ title: 'Error recording weight', variant: 'destructive' });
    }
  };

  const handlePracticeWeighIn = async () => {
    if (!selectedWrestler || !weight) {
      toast({ title: 'Please select wrestler and enter weight', variant: 'destructive' });
      return;
    }

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      toast({ title: 'Please enter a valid weight', variant: 'destructive' });
      return;
    }

    const newEntry = {
      weight: weightNum,
      unit,
      timestamp: new Date(weighInTime),
      type: weighType
    };

    setPracticeWeighIns(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(selectedWrestler) || [];
      newMap.set(selectedWrestler, [...existing, newEntry]);
      return newMap;
    });

    toast({ 
      title: `Practice weigh-${weighType} recorded successfully`,
      description: `${weightNum} ${unit} for ${weighType === 'in' ? 'pre-practice' : 'post-practice'}`
    });
    
    setWeight('');
    setWeighInTime(new Date().toISOString().slice(0, 16));
  };

  const getTodaysPracticeWeighIns = (wrestlerId: string) => {
    const entries = practiceWeighIns.get(wrestlerId) || [];
    const today = new Date().toDateString();
    return entries.filter(entry => entry.timestamp.toDateString() === today);
  };

  const getWeightChange = (wrestlerId: string) => {
    const todaysEntries = getTodaysPracticeWeighIns(wrestlerId);
    const weighIn = todaysEntries.find(e => e.type === 'in');
    const weighOut = todaysEntries.find(e => e.type === 'out');
    
    if (weighIn && weighOut) {
      return weighOut.weight - weighIn.weight;
    }
    return null;
  };

  const getWeightStatus = (wrestler: any) => {
    if (!wrestler.weighIn) return 'pending';
    
    // Simple logic - in real app, this would be more sophisticated
    const weightClass = parseFloat(wrestler.weighIn.weightClass || '0');
    if (weightClass === 0) return 'pending';
    
    return wrestler.weighIn.weight <= weightClass ? 'made' : 'over';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'made':
        return <Badge className="bg-green-100 text-green-800">Made Weight</Badge>;
      case 'over':
        return <Badge className="bg-red-100 text-red-800">Over Weight</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const exportResults = () => {
    const csvContent = [
      ['Wrestler', 'Team', 'Weight', 'Weight Class', 'Status', 'Time'],
      ...filteredWeighIns.map(wrestler => {
        const team = getTeamById(wrestler.teamId);
        const status = getWeightStatus(wrestler);
        return [
          wrestler.name,
          team?.name || '',
          wrestler.weighIn ? `${wrestler.weighIn.weight} ${wrestler.weighIn.unit}` : '',
          wrestler.weighIn?.weightClass || '',
          status,
          wrestler.weighIn ? new Date(wrestler.weighIn.timestamp).toLocaleString() : ''
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weigh-ins-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Weigh-ins Management</h2>

        {/* Competition Context Section */}
        {showCompetitionForm ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Set Competition Context</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="competition-name">Competition Name</Label>
                  <Input
                    id="competition-name"
                    data-testid="input-competition-name"
                    placeholder="e.g., vs. Lincoln High, District Tournament"
                    value={newCompetitionName}
                    onChange={(e) => setNewCompetitionName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="competition-type">Competition Type</Label>
                  <Select value={newCompetitionType} onValueChange={setNewCompetitionType}>
                    <SelectTrigger data-testid="select-competition-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual_tournament">Individual Tournament</SelectItem>
                      <SelectItem value="single_dual">Single Dual</SelectItem>
                      <SelectItem value="multi_dual">Multi Dual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newCompetitionType === 'single_dual' && (
                  <div>
                    <Label htmlFor="opponent-team">Opponent Team</Label>
                    {existingOpponentTeams.length > 0 ? (
                      <Select value={newOpponentTeam} onValueChange={setNewOpponentTeam}>
                        <SelectTrigger data-testid="select-opponent-team">
                          <SelectValue placeholder="Select or enter opponent team" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Enter new team...</SelectItem>
                          {existingOpponentTeams.map(team => (
                            <SelectItem key={team} value={team}>{team}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="opponent-team"
                        data-testid="input-opponent-team"
                        placeholder="e.g., Lincoln High School"
                        value={newOpponentTeam}
                        onChange={(e) => setNewOpponentTeam(e.target.value)}
                      />
                    )}
                    {newOpponentTeam === 'custom' && existingOpponentTeams.length > 0 && (
                      <Input
                        className="mt-2"
                        placeholder="Enter new opponent team name"
                        value=""
                        onChange={(e) => setNewOpponentTeam(e.target.value)}
                      />
                    )}
                  </div>
                )}
                {newCompetitionType === 'multi_dual' && (
                  <div>
                    <Label>Opponent Teams</Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                      {existingOpponentTeams.length === 0 ? (
                        <p className="text-sm text-gray-500">No opponent teams available. Create matches first to add opponents.</p>
                      ) : (
                        existingOpponentTeams.map(team => (
                          <label key={team} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedOpponents.includes(team)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedOpponents(prev => [...prev, team]);
                                } else {
                                  setSelectedOpponents(prev => prev.filter(t => t !== team));
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">{team}</span>
                          </label>
                        ))
                      )}
                    </div>
                    {selectedOpponents.length > 0 && (
                      <p className="text-sm text-gray-600 mt-1">
                        Selected: {selectedOpponents.join(', ')}
                      </p>
                    )}
                  </div>
                )}
                <div className="flex items-end">
                  <Button onClick={handleSetCompetitionContext} data-testid="button-set-competition">
                    Set Competition
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-900">Current Competition:</p>
                  <p className="text-blue-800">{competitionContext?.name} ({competitionContext?.type.replace('_', ' ')})</p>
                  {competitionContext?.opponentTeam && (
                    <p className="text-blue-700 font-medium">vs {competitionContext.opponentTeam}</p>
                  )}
                  {competitionContext?.opponentTeams && competitionContext.opponentTeams.length > 0 && (
                    <p className="text-blue-700 font-medium">vs {competitionContext.opponentTeams.join(', ')}</p>
                  )}
                  <p className="text-sm text-blue-600">Set on {new Date(competitionContext?.date || '').toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleChangeCompetition} data-testid="button-change-competition">
                    Change
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleClearCompetition} data-testid="button-clear-competition">
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Tabs defaultValue="competition" className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="competition" className="flex items-center">
              <Weight className="h-4 w-4 mr-2" />
              Competition Weigh-ins
            </TabsTrigger>
            <TabsTrigger value="practice" className="flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Practice Tracking
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="competition" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Official Competition Weigh-ins</h3>
              <div className="flex space-x-3">
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={exportResults}
              className="bg-primary text-white hover:bg-blue-700"
              disabled={filteredWeighIns.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Results
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Weight Entry Panel */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Weight className="h-5 w-5 mr-2" />
                  Record Weight
                  {competitionContext && (
                    <Badge variant="outline" className="ml-2">
                      {competitionContext.name}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="wrestler">Select Wrestler</Label>
                  <Select value={selectedWrestler} onValueChange={setSelectedWrestler}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose wrestler..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableWrestlers.map(wrestler => {
                        const team = getTeamById(wrestler.teamId);
                        return (
                          <SelectItem key={wrestler.id} value={wrestler.id}>
                            {wrestler.name} - {team?.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="weight">Weight</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="flex-1"
                    />
                    <Select value={unit} onValueChange={(value: 'lbs' | 'kg') => setUnit(value)}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lbs">lbs</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="timestamp">Timestamp</Label>
                  <Input
                    id="timestamp"
                    type="datetime-local"
                    value={weighInTime}
                    onChange={(e) => setWeighInTime(e.target.value)}
                  />
                </div>

                {!competitionContext && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                    <p className="font-medium">Set Competition Context</p>
                    <p>Set the competition name above to track weigh-ins for a specific event.</p>
                  </div>
                )}

                <Button 
                  onClick={handleRecordWeight}
                  className="w-full bg-success text-white hover:bg-green-600"
                  disabled={!selectedWrestler || !weight}
                  data-testid="button-record-weight"
                >
                  <Weight className="h-4 w-4 mr-2" />
                  Record Weight
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Weigh-in Results */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Weigh-in Results</CardTitle>
                <p className="text-sm text-gray-600">
                  Session: {new Date().toLocaleDateString()} - {new Date().toLocaleTimeString()}
                </p>
              </CardHeader>
              <CardContent>
                {filteredWeighIns.length === 0 ? (
                  <div className="text-center py-8">
                    <Weight className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No weigh-ins recorded</h3>
                    <p className="text-gray-600">Start by recording your first wrestler's weight.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Wrestler
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Team
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Weight
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Weight Class
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Time
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredWeighIns.map((wrestler) => {
                          const team = getTeamById(wrestler.teamId);
                          const status = getWeightStatus(wrestler);
                          return (
                            <tr key={wrestler.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="font-medium text-gray-900">{wrestler.name}</div>
                                <div className="text-sm text-gray-500">Grade {wrestler.grade}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {team?.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {wrestler.weighIn ? `${wrestler.weighIn.weight} ${wrestler.weighIn.unit}` : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {wrestler.weighIn?.weightClass || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {getStatusBadge(status)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {wrestler.weighIn ? new Date(wrestler.weighIn.timestamp).toLocaleTimeString() : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
          </TabsContent>
          
          <TabsContent value="practice" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Practice Weight Tracking</h2>
                <p className="text-gray-600">Track daily practice weights for hydration and weight cutting monitoring</p>
              </div>
              <div className="text-sm text-gray-500">
                <Clock className="h-4 w-4 inline mr-1" />
                {new Date().toLocaleDateString()} - Today's Practice
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Practice Weight Entry Panel */}
              <div className="lg:col-span-1">
                <Card className="sticky top-4">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Activity className="h-5 w-5 mr-2" />
                      Record Practice Weight
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="practiceWrestler">Select Wrestler</Label>
                      <Select value={selectedWrestler} onValueChange={setSelectedWrestler}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose wrestler..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableWrestlers.map(wrestler => {
                            const team = getTeamById(wrestler.teamId);
                            return (
                              <SelectItem key={wrestler.id} value={wrestler.id}>
                                {wrestler.name} - {team?.name}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="practiceWeight">Weight</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="practiceWeight"
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          className="flex-1"
                        />
                        <Select value={unit} onValueChange={(value: 'lbs' | 'kg') => setUnit(value)}>
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lbs">lbs</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Weigh-in Type</Label>
                      <div className="flex space-x-2 mt-2">
                        <Button
                          variant={weighType === 'in' ? 'default' : 'outline'}
                          onClick={() => setWeighType('in')}
                          className="flex-1"
                        >
                          <ArrowDown className="h-4 w-4 mr-2" />
                          Weigh In (Pre-Practice)
                        </Button>
                        <Button
                          variant={weighType === 'out' ? 'default' : 'outline'}
                          onClick={() => setWeighType('out')}
                          className="flex-1"
                        >
                          <ArrowUp className="h-4 w-4 mr-2" />
                          Weigh Out (Post-Practice)
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="practiceTimestamp">Timestamp</Label>
                      <Input
                        id="practiceTimestamp"
                        type="datetime-local"
                        value={weighInTime}
                        onChange={(e) => setWeighInTime(e.target.value)}
                      />
                    </div>

                    <Button 
                      onClick={handlePracticeWeighIn}
                      className={`w-full text-white ${weighType === 'in' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
                      disabled={!selectedWrestler || !weight}
                    >
                      {weighType === 'in' ? (
                        <>
                          <ArrowDown className="h-4 w-4 mr-2" />
                          Record Weigh In
                        </>
                      ) : (
                        <>
                          <ArrowUp className="h-4 w-4 mr-2" />
                          Record Weigh Out
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Practice Results */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Today's Practice Tracking</CardTitle>
                    <p className="text-sm text-gray-600">
                      Monitor weight changes throughout practice sessions
                    </p>
                  </CardHeader>
                  <CardContent>
                    {availableWrestlers.length === 0 ? (
                      <div className="text-center py-8">
                        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No wrestlers available</h3>
                        <p className="text-gray-600">Add wrestlers to your team to start practice tracking.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {availableWrestlers.map((wrestler) => {
                          const team = getTeamById(wrestler.teamId);
                          const todaysEntries = getTodaysPracticeWeighIns(wrestler.id);
                          const weighIn = todaysEntries.find(e => e.type === 'in');
                          const weighOut = todaysEntries.find(e => e.type === 'out');
                          const weightChange = getWeightChange(wrestler.id);

                          return (
                            <Card key={wrestler.id} className="border-l-4 border-l-blue-500">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="flex items-center">
                                      <h4 className="font-medium text-gray-900">{wrestler.name}</h4>
                                      <Badge variant="outline" className="ml-2">
                                        {team?.name} - Grade {wrestler.grade}
                                      </Badge>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-4 mt-3">
                                      <div>
                                        <Label className="text-xs text-gray-500">Pre-Practice</Label>
                                        <div className="font-medium">
                                          {weighIn ? (
                                            <span className="text-blue-600">
                                              {weighIn.weight} {weighIn.unit}
                                            </span>
                                          ) : (
                                            <span className="text-gray-400">Not recorded</span>
                                          )}
                                        </div>
                                        {weighIn && (
                                          <div className="text-xs text-gray-500">
                                            {weighIn.timestamp.toLocaleTimeString()}
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div>
                                        <Label className="text-xs text-gray-500">Post-Practice</Label>
                                        <div className="font-medium">
                                          {weighOut ? (
                                            <span className="text-green-600">
                                              {weighOut.weight} {weighOut.unit}
                                            </span>
                                          ) : (
                                            <span className="text-gray-400">Not recorded</span>
                                          )}
                                        </div>
                                        {weighOut && (
                                          <div className="text-xs text-gray-500">
                                            {weighOut.timestamp.toLocaleTimeString()}
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div>
                                        <Label className="text-xs text-gray-500">Weight Change</Label>
                                        <div className="font-medium">
                                          {weightChange !== null ? (
                                            <span className={weightChange > 0 ? 'text-red-600' : weightChange < 0 ? 'text-green-600' : 'text-gray-600'}>
                                              {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} {unit}
                                            </span>
                                          ) : (
                                            <span className="text-gray-400">Incomplete</span>
                                          )}
                                        </div>
                                        {weightChange !== null && (
                                          <div className="text-xs text-gray-500">
                                            {Math.abs(weightChange).toFixed(1)} {unit} {weightChange < 0 ? 'lost' : 'gained'}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex space-x-2">
                                    {!weighIn && (
                                      <Badge variant="outline" className="text-blue-600">
                                        Need weigh-in
                                      </Badge>
                                    )}
                                    {weighIn && !weighOut && (
                                      <Badge variant="outline" className="text-green-600">
                                        Need weigh-out
                                      </Badge>
                                    )}
                                    {weighIn && weighOut && (
                                      <Badge className="bg-green-100 text-green-800">
                                        Complete
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
