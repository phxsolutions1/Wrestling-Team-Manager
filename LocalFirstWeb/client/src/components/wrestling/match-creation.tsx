import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trophy, Users, Check, ChevronsUpDown } from 'lucide-react';
import { useWrestlingData } from '@/hooks/use-wrestling-data';
import { InsertMatch } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MatchCreationProps {
  onMatchCreated?: (matchId: string) => void;
}

export function MatchCreation({ onMatchCreated }: MatchCreationProps) {
  const {
    teams,
    wrestlers,
    matches,
    createMatch,
    createTeam,
    getWrestlersByTeam,
    loading
  } = useWrestlingData();

  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [opponentNameOpen, setOpponentNameOpen] = useState(false);
  const [opponentTeamOpen, setOpponentTeamOpen] = useState(false);
  const [tournamentNameOpen, setTournamentNameOpen] = useState(false);
  const [previousOpponents, setPreviousOpponents] = useState<string[]>([]);
  const [previousTeams, setPreviousTeams] = useState<string[]>([]);
  const [todayTournaments, setTodayTournaments] = useState<string[]>([]);
  const [matchForm, setMatchForm] = useState<Partial<InsertMatch>>({
    boutNumber: '',
    weightClass: '',
    competitionType: 'dual',
    tournamentId: '',
    myWrestlerId: '',
    myTeamId: '',
    opponentName: '',
    opponentTeam: '',
    periods: [],
    currentPeriod: 1,
    currentTime: 180,
    myScore: 0,
    opponentScore: 0,
    isRunning: false,
    status: 'pending',
  });
  
  const [tournamentName, setTournamentName] = useState('');

  // Get my teams (teams with wrestlers that have weigh-ins)
  const myTeams = teams.filter(team => 
    getWrestlersByTeam(team.id).some(wrestler => wrestler.weighIn)
  );

  const availableWrestlers = matchForm.myTeamId 
    ? getWrestlersByTeam(matchForm.myTeamId).filter(wrestler => wrestler.weighIn)
    : [];

  // Load previous opponents, teams, and today's tournaments from existing matches
  useEffect(() => {
    const opponentNames = Array.from(new Set(matches.map(m => m.opponentName).filter(Boolean)));
    const teamNames = Array.from(new Set(matches.map(m => m.opponentTeam).filter(Boolean)));
    
    // Get tournaments from today
    const today = new Date().toISOString().split('T')[0];
    const tournamentsToday = Array.from(new Set(
      matches
        .filter(m => m.createdAt.toISOString().split('T')[0] === today && m.competitionType === 'tournament')
        .map(m => {
          // Extract tournament name from match data or generate from opponent team
          return m.opponentTeam || 'Individual Tournament';
        })
        .filter(Boolean)
    ));
    
    // Check if there's a competition context with opponent team or tournament
    const competitionContext = localStorage.getItem('weighin-competition-context');
    if (competitionContext) {
      const context = JSON.parse(competitionContext);
      if (context.opponentTeam && context.type === 'single_dual') {
        // Auto-fill opponent team for single dual meets
        setMatchForm(prev => ({
          ...prev,
          opponentTeam: context.opponentTeam,
          competitionType: 'dual'
        }));
      } else if (context.opponentTeams && context.type === 'multi_dual' && context.opponentTeams.length > 0) {
        // For multi-dual, set competition type to dual and let user pick from available teams
        setMatchForm(prev => ({
          ...prev,
          competitionType: 'dual'
        }));
        // Add the opponent teams to the available teams list
        const multiDualTeams = context.opponentTeams.filter((team: string) => !teamNames.includes(team));
        setPreviousTeams(prev => [...prev, ...multiDualTeams]);
      } else if (context.type === 'individual_tournament') {
        // Auto-fill tournament info for individual tournaments
        setMatchForm(prev => ({
          ...prev,
          competitionType: 'tournament'
        }));
        setTournamentName(context.name);
        // Add to today's tournaments if not already there
        if (!tournamentsToday.includes(context.name)) {
          tournamentsToday.push(context.name);
        }
      }
    }
    
    setPreviousOpponents(opponentNames);
    setPreviousTeams(teamNames);
    setTodayTournaments(tournamentsToday);
  }, [matches]);

  const handleCreateMatch = async () => {
    try {
      // Validation
      if (!matchForm.myWrestlerId || !matchForm.opponentName || !matchForm.weightClass) {
        toast({ title: 'Please fill in all required fields', variant: 'destructive' });
        return;
      }

      // Additional validation for tournament matches
      if (matchForm.competitionType === 'tournament' && !tournamentName.trim()) {
        toast({ title: 'Please enter a tournament name', variant: 'destructive' });
        return;
      }

      // Create opponent team if it doesn't exist
      if (matchForm.opponentTeam && !teams.some(t => t.name.toLowerCase() === matchForm.opponentTeam?.toLowerCase())) {
        await createTeam({ name: matchForm.opponentTeam });
      }

      // For tournament matches, store tournament name in opponent team field for tracking
      const finalMatchForm = {
        ...matchForm,
        opponentTeam: matchForm.competitionType === 'tournament' ? tournamentName : matchForm.opponentTeam
      };

      const newMatch = await createMatch(finalMatchForm as InsertMatch);
      
      toast({ title: 'Match created successfully' });
      
      // Reset form
      setMatchForm({
        boutNumber: '',
        weightClass: '',
        competitionType: 'dual',
        tournamentId: '',
        myWrestlerId: '',
        myTeamId: '',
        opponentName: '',
        opponentTeam: '',
        periods: [],
        currentPeriod: 1,
        currentTime: 180,
        myScore: 0,
        opponentScore: 0,
        isRunning: false,
        status: 'pending',
      });
      setTournamentName('');
      
      setDialogOpen(false);
      onMatchCreated?.(newMatch.id);
    } catch (error) {
      toast({ title: 'Error creating match', variant: 'destructive' });
    }
  };

  const pendingMatches = matches.filter(m => m.status === 'pending');
  const activeMatches = matches.filter(m => m.status === 'active');

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Match Setup</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Match
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Match</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="competitionType">Competition Type</Label>
                  <Select 
                    value={matchForm.competitionType || 'dual'} 
                    onValueChange={(value) => setMatchForm({ ...matchForm, competitionType: value as 'dual' | 'multidual' | 'tournament' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select competition type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dual">Dual Meet (head-to-head team scoring)</SelectItem>
                      <SelectItem value="multidual">Multi-Dual (multiple team scoring)</SelectItem>
                      <SelectItem value="tournament">Individual Tournament</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {matchForm.competitionType === 'tournament' && (
                  <div>
                    <Label htmlFor="tournamentName">Tournament Name</Label>
                    <Popover open={tournamentNameOpen} onOpenChange={setTournamentNameOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={tournamentNameOpen}
                          className="w-full justify-between"
                          data-testid="button-tournament-name"
                        >
                          {tournamentName || "Enter tournament name..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Search or enter tournament name..." 
                            value={tournamentName}
                            onValueChange={setTournamentName}
                          />
                          <CommandEmpty>No tournaments found from today.</CommandEmpty>
                          <CommandGroup>
                            <CommandList>
                              {todayTournaments.map((tournament) => (
                                <CommandItem
                                  key={tournament}
                                  value={tournament}
                                  onSelect={() => {
                                    setTournamentName(tournament);
                                    setTournamentNameOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      tournamentName === tournament ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {tournament}
                                </CommandItem>
                              ))}
                            </CommandList>
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-gray-500 mt-1">
                      Select from today's tournaments or enter a new tournament name (e.g., "Boys Varsity Tournament", "JV Championship")
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="boutNumber">Bout Number</Label>
                    <Input
                      id="boutNumber"
                      value={matchForm.boutNumber || ''}
                      onChange={(e) => setMatchForm({ ...matchForm, boutNumber: e.target.value })}
                      placeholder="e.g. 1, 2A, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="weightClass">Weight Class</Label>
                    <Input
                      id="weightClass"
                      value={matchForm.weightClass || ''}
                      onChange={(e) => setMatchForm({ ...matchForm, weightClass: e.target.value })}
                      placeholder="e.g. 106, 113"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="myTeam">My Team</Label>
                  <Select 
                    value={matchForm.myTeamId || ''} 
                    onValueChange={(value) => setMatchForm({ ...matchForm, myTeamId: value, myWrestlerId: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your team" />
                    </SelectTrigger>
                    <SelectContent>
                      {myTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="myWrestler">My Wrestler</Label>
                  <Select 
                    value={matchForm.myWrestlerId || ''} 
                    onValueChange={(value) => setMatchForm({ ...matchForm, myWrestlerId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select wrestler" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableWrestlers.map((wrestler) => (
                        <SelectItem key={wrestler.id} value={wrestler.id}>
                          {wrestler.name} ({wrestler.weighIn?.weight} {wrestler.weighIn?.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="opponentName">Opponent Name</Label>
                  <Popover open={opponentNameOpen} onOpenChange={setOpponentNameOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={opponentNameOpen}
                        className="w-full justify-between"
                      >
                        {matchForm.opponentName || "Enter opponent's name..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Search or type new name..." 
                          value={matchForm.opponentName || ''}
                          onValueChange={(value) => setMatchForm({ ...matchForm, opponentName: value })}
                        />
                        <CommandList>
                          <CommandEmpty>
                            Press Enter to use "{matchForm.opponentName}"
                          </CommandEmpty>
                          <CommandGroup>
                            {previousOpponents
                              .filter(name => 
                                name.toLowerCase().includes((matchForm.opponentName || '').toLowerCase())
                              )
                              .map((name) => (
                                <CommandItem
                                  key={name}
                                  value={name}
                                  onSelect={() => {
                                    setMatchForm({ ...matchForm, opponentName: name });
                                    setOpponentNameOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      matchForm.opponentName === name ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {name}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="opponentTeam">Opponent Team</Label>
                  <Popover open={opponentTeamOpen} onOpenChange={setOpponentTeamOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={opponentTeamOpen}
                        className="w-full justify-between"
                      >
                        {matchForm.opponentTeam || "Enter opponent's team..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Search or type new team..." 
                          value={matchForm.opponentTeam || ''}
                          onValueChange={(value) => setMatchForm({ ...matchForm, opponentTeam: value })}
                        />
                        <CommandList>
                          <CommandEmpty>
                            Press Enter to use "{matchForm.opponentTeam}"
                          </CommandEmpty>
                          <CommandGroup>
                            {previousTeams
                              .filter(team => 
                                team.toLowerCase().includes((matchForm.opponentTeam || '').toLowerCase())
                              )
                              .map((team) => (
                                <CommandItem
                                  key={team}
                                  value={team}
                                  onSelect={() => {
                                    setMatchForm({ ...matchForm, opponentTeam: team });
                                    setOpponentTeamOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      matchForm.opponentTeam === team ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {team}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateMatch}>
                    Create Match
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tournament Scoring Summary */}
        {todayTournaments.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
                Today's Tournament Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todayTournaments.map((tournament) => {
                  const tournamentMatches = matches.filter(m => 
                    m.competitionType === 'tournament' && 
                    m.opponentTeam === tournament &&
                    m.createdAt.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
                  );
                  const completedMatches = tournamentMatches.filter(m => m.status === 'completed');
                  const wins = completedMatches.filter(m => m.finalResult?.winner === 'my_wrestler').length;
                  const losses = completedMatches.filter(m => m.finalResult?.winner === 'opponent').length;
                  
                  return (
                    <div key={tournament} className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-blue-900">{tournament}</h4>
                          <p className="text-sm text-blue-700">
                            {completedMatches.length} matches completed • {wins}W - {losses}L
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-900">{wins}/{completedMatches.length}</div>
                          <div className="text-xs text-blue-600">Wins</div>
                        </div>
                      </div>
                      {tournamentMatches.length > completedMatches.length && (
                        <p className="text-xs text-blue-600 mt-2">
                          {tournamentMatches.length - completedMatches.length} matches remaining
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Matches */}
        {pendingMatches.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
                Pending Matches ({pendingMatches.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingMatches.map((match) => {
                  const myWrestler = wrestlers.find(w => w.id === match.myWrestlerId);
                  const myTeam = teams.find(t => t.id === match.myTeamId);
                  
                  return (
                    <div key={match.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">
                          {match.boutNumber && <span className="text-primary mr-2">#{match.boutNumber}</span>}
                          {match.weightClass} lbs - {myWrestler?.name} vs {match.opponentName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {match.competitionType === 'tournament' ? (
                            <span className="flex items-center">
                              <Trophy className="h-3 w-3 mr-1" />
                              {match.opponentTeam}
                            </span>
                          ) : (
                            `${myTeam?.name} vs ${match.opponentTeam}`
                          )}
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => onMatchCreated?.(match.id)}
                        className="bg-primary text-white hover:bg-blue-700"
                      >
                        Start Match
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Matches */}
        {activeMatches.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center text-green-600">
                <Trophy className="h-5 w-5 mr-2" />
                Active Matches ({activeMatches.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeMatches.map((match) => {
                  const myWrestler = wrestlers.find(w => w.id === match.myWrestlerId);
                  
                  return (
                    <div key={match.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <div>
                        <div className="font-medium">
                          {match.boutNumber && <span className="text-primary mr-2">#{match.boutNumber}</span>}
                          {match.weightClass} lbs - {myWrestler?.name} vs {match.opponentName}
                        </div>
                        <div className="text-sm text-gray-600">
                          Score: {match.myScore} - {match.opponentScore} • Period {match.currentPeriod}
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => onMatchCreated?.(match.id)}
                        className="bg-success text-white hover:bg-green-600"
                      >
                        Continue
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {pendingMatches.length === 0 && activeMatches.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No matches created</h3>
              <p className="text-gray-600 mb-4">Create your first match to get started.</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Match
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}