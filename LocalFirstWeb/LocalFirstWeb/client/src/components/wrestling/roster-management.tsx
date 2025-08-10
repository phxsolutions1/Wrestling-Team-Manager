import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Users, User, TrendingUp, Scale, Settings } from 'lucide-react';
import { useWrestlingData } from '@/hooks/use-wrestling-data';
import { InsertTeam, InsertWrestler, Wrestler } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

// Standard wrestling weight classes
const WEIGHT_CLASSES = [
  '106', '113', '120', '126', '132', '138', '145', '152', 
  '160', '170', '182', '195', '220', '285'
];

export function RosterManagement() {
  const {
    teams,
    wrestlers,
    createTeam,
    updateTeam,
    deleteTeam,
    createWrestler,
    updateWrestler,
    deleteWrestler,
    getWrestlersByTeam,
    loading
  } = useWrestlingData();

  const { toast } = useToast();

  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [wrestlerDialogOpen, setWrestlerDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editingWrestler, setEditingWrestler] = useState<string | null>(null);
  const [selectedTeamForWrestler, setSelectedTeamForWrestler] = useState<string>('');
  const [wrestlerProfileOpen, setWrestlerProfileOpen] = useState(false);
  const [selectedWrestler, setSelectedWrestler] = useState<Wrestler | null>(null);
  const [editingWeightClass, setEditingWeightClass] = useState(false);
  const [tempWeightClass, setTempWeightClass] = useState('');

  const [teamForm, setTeamForm] = useState<InsertTeam>({
    name: '',
  });

  const [wrestlerForm, setWrestlerForm] = useState<InsertWrestler>({
    name: '',
    teamId: '',
    grade: '',
  });

  const handleCreateTeam = async () => {
    try {
      if (editingTeam) {
        await updateTeam(editingTeam, teamForm);
        toast({ title: 'Team updated successfully' });
      } else {
        await createTeam(teamForm);
        toast({ title: 'Team created successfully' });
      }
      setTeamForm({ name: '' });
      setEditingTeam(null);
      setTeamDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error saving team', variant: 'destructive' });
    }
  };

  const handleCreateWrestler = async () => {
    try {
      const wrestlerData = {
        ...wrestlerForm,
        teamId: selectedTeamForWrestler || wrestlerForm.teamId,
      };
      
      if (editingWrestler) {
        await updateWrestler(editingWrestler, wrestlerData);
        toast({ title: 'Wrestler updated successfully' });
      } else {
        await createWrestler(wrestlerData);
        toast({ title: 'Wrestler added successfully' });
      }
      setWrestlerForm({ name: '', teamId: '', grade: '' });
      setEditingWrestler(null);
      setSelectedTeamForWrestler('');
      setWrestlerDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error saving wrestler', variant: 'destructive' });
    }
  };

  const handleEditTeam = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      setTeamForm({ name: team.name });
      setEditingTeam(teamId);
      setTeamDialogOpen(true);
    }
  };

  const handleEditWrestler = (wrestlerId: string) => {
    const wrestler = wrestlers.find(w => w.id === wrestlerId);
    if (wrestler) {
      setWrestlerForm({
        name: wrestler.name,
        teamId: wrestler.teamId,
        grade: wrestler.grade,
      });
      setEditingWrestler(wrestlerId);
      setWrestlerDialogOpen(true);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      await deleteTeam(teamId);
      toast({ title: 'Team deleted successfully' });
    } catch (error) {
      toast({ title: 'Error deleting team', variant: 'destructive' });
    }
  };

  const handleDeleteWrestler = async (wrestlerId: string) => {
    try {
      await deleteWrestler(wrestlerId);
      toast({ title: 'Wrestler removed successfully' });
    } catch (error) {
      toast({ title: 'Error removing wrestler', variant: 'destructive' });
    }
  };

  const openAddWrestlerDialog = (teamId: string) => {
    setSelectedTeamForWrestler(teamId);
    setWrestlerForm({ name: '', teamId, grade: '' });
    setEditingWrestler(null);
    setWrestlerDialogOpen(true);
  };

  const handleUpdateWeightClass = async (wrestlerId: string, newWeightClass: string) => {
    try {
      const wrestler = wrestlers.find(w => w.id === wrestlerId);
      if (wrestler) {
        const updatedWrestler = {
          ...wrestler,
          weighIn: wrestler.weighIn ? {
            ...wrestler.weighIn,
            weightClass: newWeightClass
          } : undefined
        };
        await updateWrestler(wrestlerId, updatedWrestler);
        setSelectedWrestler(updatedWrestler);
        setEditingWeightClass(false);
        toast({ title: 'Weight class updated successfully' });
      }
    } catch (error) {
      toast({ title: 'Error updating weight class', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">My Team Roster</h2>
        </div>
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Team Management</h3>
          <p className="text-blue-800 text-sm">
            Manage your wrestling team roster. Create your team and add wrestlers here. 
            Opponent teams are managed in the separate "Opponents" tab.
          </p>
        </div>
        <div className="flex justify-between items-center mb-6">
          <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTeam ? 'Edit Team' : 'Add New Team'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="teamName">Team Name</Label>
                  <Input
                    id="teamName"
                    value={teamForm.name}
                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                    placeholder="Enter team name"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => {
                    setTeamDialogOpen(false);
                    setEditingTeam(null);
                    setTeamForm({ name: '' });
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTeam} disabled={!teamForm.name.trim()}>
                    {editingTeam ? 'Update Team' : 'Create Team'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {teams.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No teams yet</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first team.</p>
              <Button onClick={() => setTeamDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Team
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {teams.map((team) => {
              const teamWrestlers = getWrestlersByTeam(team.id);
              return (
                <Card key={team.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{team.name}</CardTitle>
                        <p className="text-sm text-gray-600">{teamWrestlers.length} wrestlers</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditTeam(team.id)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteTeam(team.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      {teamWrestlers.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No wrestlers added yet</p>
                      ) : (
                        teamWrestlers.map((wrestler) => (
                          <div key={wrestler.id} className="flex justify-between items-center py-3 px-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                            <div 
                              className="flex-1 cursor-pointer"
                              onClick={() => {
                                setSelectedWrestler(wrestler);
                                setWrestlerProfileOpen(true);
                              }}
                            >
                              <div className="flex items-center">
                                <User className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="font-medium text-blue-600 hover:text-blue-800">{wrestler.name}</span>
                                <span className="text-sm text-gray-600 ml-2">Grade {wrestler.grade}</span>
                              </div>
                              <div className="flex items-center mt-1">
                                <Scale className="h-3 w-3 text-gray-400 mr-1" />
                                <span className="text-sm text-gray-500">
                                  Last weigh-in: {wrestler.weighIn ? 
                                    `${wrestler.weighIn.weight} ${wrestler.weighIn.unit} (${wrestler.weighIn.weightClass || 'No class'})` : 
                                    'No weight recorded'
                                  }
                                </span>
                                {wrestler.weighIn?.status && (
                                  <Badge 
                                    variant={wrestler.weighIn.status === 'made' ? 'default' : 'destructive'} 
                                    className="ml-2 text-xs"
                                  >
                                    {wrestler.weighIn.status}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm" onClick={() => handleEditWrestler(wrestler.id)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteWrestler(wrestler.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full text-primary border-primary hover:bg-blue-50"
                      onClick={() => openAddWrestlerDialog(team.id)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Wrestler
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={wrestlerDialogOpen} onOpenChange={setWrestlerDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingWrestler ? 'Edit Wrestler' : 'Add New Wrestler'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="wrestlerName">Wrestler Name</Label>
                <Input
                  id="wrestlerName"
                  value={wrestlerForm.name}
                  onChange={(e) => setWrestlerForm({ ...wrestlerForm, name: e.target.value })}
                  placeholder="Enter wrestler name"
                />
              </div>
              
              {!selectedTeamForWrestler && (
                <div>
                  <Label htmlFor="team">Team</Label>
                  <Select value={wrestlerForm.teamId} onValueChange={(value) => setWrestlerForm({ ...wrestlerForm, teamId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <Label htmlFor="grade">Grade</Label>
                <Select value={wrestlerForm.grade} onValueChange={(value) => setWrestlerForm({ ...wrestlerForm, grade: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 8 }, (_, i) => i + 9).map((grade) => (
                      <SelectItem key={grade} value={grade.toString()}>
                        Grade {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => {
                  setWrestlerDialogOpen(false);
                  setEditingWrestler(null);
                  setSelectedTeamForWrestler('');
                  setWrestlerForm({ name: '', teamId: '', grade: '' });
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateWrestler} 
                  disabled={!wrestlerForm.name.trim() || !wrestlerForm.grade || (!selectedTeamForWrestler && !wrestlerForm.teamId)}
                >
                  {editingWrestler ? 'Update Wrestler' : 'Add Wrestler'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Wrestler Profile Dialog */}
        <Dialog open={wrestlerProfileOpen} onOpenChange={setWrestlerProfileOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                {selectedWrestler?.name} - Profile
              </DialogTitle>
              <DialogDescription>
                View and manage wrestler details, weight class, and performance history.
              </DialogDescription>
            </DialogHeader>
            
            {selectedWrestler && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Name</Label>
                    <p className="text-lg font-semibold">{selectedWrestler.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Grade</Label>
                    <p className="text-lg font-semibold">Grade {selectedWrestler.grade}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Team</Label>
                    <p className="text-lg font-semibold">
                      {teams.find(t => t.id === selectedWrestler.teamId)?.name || 'Unknown Team'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Current Weight</Label>
                    <p className="text-lg font-semibold">
                      {selectedWrestler.weighIn ? 
                        `${selectedWrestler.weighIn.weight} ${selectedWrestler.weighIn.unit}` : 
                        'No weight recorded'
                      }
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-600">Weight Class</Label>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setEditingWeightClass(true);
                          setTempWeightClass(selectedWrestler.weighIn?.weightClass || '');
                        }}
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                    {editingWeightClass ? (
                      <div className="flex items-center space-x-2 mt-1">
                        <Select value={tempWeightClass} onValueChange={setTempWeightClass}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select weight class" />
                          </SelectTrigger>
                          <SelectContent>
                            {WEIGHT_CLASSES.map((weightClass) => (
                              <SelectItem key={weightClass} value={weightClass}>
                                {weightClass} lbs
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          size="sm" 
                          onClick={() => handleUpdateWeightClass(selectedWrestler.id, tempWeightClass)}
                          disabled={!tempWeightClass}
                        >
                          Save
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setEditingWeightClass(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <p className="text-lg font-semibold">
                        {selectedWrestler.weighIn?.weightClass || 'Not assigned'} 
                        {selectedWrestler.weighIn?.weightClass && ' lbs'}
                      </p>
                    )}
                  </div>
                </div>

                <Tabs defaultValue="weigh-ins" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="weigh-ins">Weigh-in History</TabsTrigger>
                    <TabsTrigger value="stats">Season Stats</TabsTrigger>
                    <TabsTrigger value="records">Match Records</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="weigh-ins" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Weigh-in History</h3>
                      <Scale className="h-5 w-5 text-gray-400" />
                    </div>
                    
                    {/* Current weigh-in display */}
                    {selectedWrestler.weighIn ? (
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="flex items-center">
                                <Badge variant="outline" className="mr-2">Latest</Badge>
                                <span className="font-medium">
                                  {selectedWrestler.weighIn.weight} {selectedWrestler.weighIn.unit}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                Weight Class: {selectedWrestler.weighIn.weightClass || 'Not assigned'}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge 
                                variant={selectedWrestler.weighIn.status === 'made' ? 'default' : 'destructive'}
                              >
                                {selectedWrestler.weighIn.status}
                              </Badge>
                              <p className="text-sm text-gray-500 mt-1">
                                {new Date(selectedWrestler.weighIn.timestamp).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardContent className="p-8 text-center">
                          <Scale className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No Weigh-ins Yet</h3>
                          <p className="text-gray-600">
                            Weigh-in data will appear here once recorded in the Weigh-ins tab.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="stats" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Season Statistics</h3>
                      <TrendingUp className="h-5 w-5 text-gray-400" />
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold text-blue-600">0</p>
                          <p className="text-sm text-gray-600">Matches</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold text-green-600">0</p>
                          <p className="text-sm text-gray-600">Wins</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold text-red-600">0</p>
                          <p className="text-sm text-gray-600">Losses</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold text-purple-600">0</p>
                          <p className="text-sm text-gray-600">Pins</p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <Card>
                      <CardContent className="p-6 text-center">
                        <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Stats Coming Soon</h3>
                        <p className="text-gray-600">
                          Match statistics will be calculated automatically as matches are completed.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="records" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Match Records</h3>
                      <Users className="h-5 w-5 text-gray-400" />
                    </div>
                    
                    <Card>
                      <CardContent className="p-6 text-center">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Matches Yet</h3>
                        <p className="text-gray-600">
                          Match history and detailed records will appear here once matches are completed.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
