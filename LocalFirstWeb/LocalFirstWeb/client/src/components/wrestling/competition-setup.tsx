import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Trophy, Users, Calendar } from 'lucide-react';
import { useWrestlingData } from '@/hooks/use-wrestling-data';
import { InsertCompetition } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

export function CompetitionSetup() {
  const {
    teams,
    competitions,
    wrestlers,
    createCompetition,
    updateCompetition,
    getWrestlersByTeam,
    getMatchesByCompetition,
    loading
  } = useWrestlingData();

  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [competitionForm, setCompetitionForm] = useState<InsertCompetition>({
    name: '',
    format: 'dual',
    teamIds: [],
    status: 'setup',
  });

  const handleCreateCompetition = async () => {
    try {
      if (!competitionForm.name.trim()) {
        toast({ title: 'Please enter a competition name', variant: 'destructive' });
        return;
      }

      if (competitionForm.teamIds.length < 2) {
        toast({ title: 'Please select at least 2 teams', variant: 'destructive' });
        return;
      }

      await createCompetition(competitionForm);
      toast({ title: 'Competition created successfully' });
      setCompetitionForm({
        name: '',
        format: 'dual',
        teamIds: [],
        status: 'setup',
      });
      setShowForm(false);
    } catch (error) {
      toast({ title: 'Error creating competition', variant: 'destructive' });
    }
  };

  const handleTeamSelection = (teamId: string, checked: boolean) => {
    setCompetitionForm(prev => ({
      ...prev,
      teamIds: checked 
        ? [...prev.teamIds, teamId]
        : prev.teamIds.filter(id => id !== teamId)
    }));
  };

  const handleStartCompetition = async (competitionId: string) => {
    try {
      await updateCompetition(competitionId, { status: 'active' });
      toast({ title: 'Competition started successfully' });
    } catch (error) {
      toast({ title: 'Error starting competition', variant: 'destructive' });
    }
  };

  const generateMatches = (competition: any) => {
    // Get wrestlers from participating teams who have weigh-ins
    const participatingWrestlers = competition.teamIds.flatMap((teamId: string) => 
      getWrestlersByTeam(teamId).filter(w => w.weighIn)
    );

    // Group by weight class
    const wrestlersByWeight = participatingWrestlers.reduce((acc: any, wrestler: any) => {
      const weightClass = wrestler.weighIn?.weightClass || 'No Weight Class';
      if (!acc[weightClass]) acc[weightClass] = [];
      acc[weightClass].push(wrestler);
      return acc;
    }, {});

    // Generate potential matches
    const potentialMatches: any[] = [];
    Object.entries(wrestlersByWeight).forEach(([weightClass, wrestlers]: [string, any]) => {
      if (wrestlers.length >= 2) {
        // For dual meets, pair wrestlers from different teams
        if (competition.format === 'dual' && competition.teamIds.length === 2) {
          const team1Wrestlers = wrestlers.filter((w: any) => w.teamId === competition.teamIds[0]);
          const team2Wrestlers = wrestlers.filter((w: any) => w.teamId === competition.teamIds[1]);
          
          team1Wrestlers.forEach((w1: any) => {
            team2Wrestlers.forEach((w2: any) => {
              potentialMatches.push({
                weightClass,
                wrestlerA: w1,
                wrestlerB: w2,
                status: 'pending'
              });
            });
          });
        }
      }
    });

    return potentialMatches;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'setup':
        return <Badge variant="outline">Setup</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getFormatDisplay = (format: string) => {
    switch (format) {
      case 'dual':
        return 'Dual Meet';
      case 'individual':
        return 'Individual Tournament';
      case 'round_robin':
        return 'Round Robin';
      default:
        return format;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Competition Setup</h2>
          <Button 
            onClick={() => setShowForm(!showForm)}
            className="bg-primary text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Competition
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Create Competition</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="competitionName">Competition Name</Label>
                  <Input
                    id="competitionName"
                    placeholder="Enter competition name"
                    value={competitionForm.name}
                    onChange={(e) => setCompetitionForm({ ...competitionForm, name: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="format">Format</Label>
                  <Select 
                    value={competitionForm.format} 
                    onValueChange={(value: 'dual' | 'individual' | 'round_robin') => 
                      setCompetitionForm({ ...competitionForm, format: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dual">Dual Meet</SelectItem>
                      <SelectItem value="individual">Individual Tournament</SelectItem>
                      <SelectItem value="round_robin">Round Robin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-6">
                <Label>Participating Teams</Label>
                <div className="space-y-2 mt-2">
                  {teams.length === 0 ? (
                    <p className="text-sm text-gray-500">No teams available. Please create teams first.</p>
                  ) : (
                    teams.map(team => (
                      <label key={team.id} className="flex items-center space-x-2">
                        <Checkbox
                          checked={competitionForm.teamIds.includes(team.id)}
                          onCheckedChange={(checked) => handleTeamSelection(team.id, checked as boolean)}
                        />
                        <span>{team.name}</span>
                        <span className="text-sm text-gray-500">
                          ({getWrestlersByTeam(team.id).filter(w => w.weighIn).length} wrestlers with weigh-ins)
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCompetition}>
                  Create Competition
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {competitions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No competitions yet</h3>
              <p className="text-gray-600 mb-4">Create your first competition to get started.</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Competition
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Active Competitions</h3>
            
            {competitions.map((competition) => {
              const potentialMatches = generateMatches(competition);
              const competitionTeams = teams.filter(t => competition.teamIds.includes(t.id));
              
              return (
                <Card key={competition.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center">
                          <Trophy className="h-5 w-5 mr-2" />
                          {competition.name}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(competition.createdAt).toLocaleDateString()} - {new Date(competition.createdAt).toLocaleTimeString()}
                        </p>
                        <p className="text-sm text-gray-600">{getFormatDisplay(competition.format)}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(competition.status)}
                        {competition.status === 'setup' && (
                          <Button 
                            size="sm"
                            onClick={() => handleStartCompetition(competition.id)}
                            className="bg-primary text-white hover:bg-blue-700"
                          >
                            Start Matches
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        Participating Teams
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {competitionTeams.map(team => (
                          <Badge key={team.id} variant="outline">{team.name}</Badge>
                        ))}
                      </div>
                    </div>

                    {potentialMatches.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          Match Schedule ({potentialMatches.length} matches)
                        </h5>
                        <div className="space-y-2 text-sm max-h-60 overflow-y-auto">
                          {potentialMatches.slice(0, 10).map((match, index) => (
                            <div key={index} className="flex justify-between items-center py-2 px-3 bg-white rounded">
                              <div>
                                <span className="font-medium">{match.weightClass}:</span>
                                <span className="ml-2">
                                  {match.wrestlerA.name} ({teams.find(t => t.id === match.wrestlerA.teamId)?.name}) 
                                  vs {match.wrestlerB.name} ({teams.find(t => t.id === match.wrestlerB.teamId)?.name})
                                </span>
                              </div>
                              <span className="text-gray-500">{match.status}</span>
                            </div>
                          ))}
                          {potentialMatches.length > 10 && (
                            <p className="text-gray-500 text-center py-2">
                              And {potentialMatches.length - 10} more matches...
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {potentialMatches.length === 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-yellow-800 text-sm">
                          No matches can be generated yet. Make sure wrestlers have completed weigh-ins and are assigned to weight classes.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
