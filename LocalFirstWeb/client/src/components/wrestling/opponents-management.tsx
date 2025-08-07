import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, UserX, Trash2 } from 'lucide-react';
import { useWrestlingData } from '@/hooks/use-wrestling-data';
import { useToast } from '@/hooks/use-toast';

export function OpponentsManagement() {
  const { teams, createTeam, deleteTeam, loading } = useWrestlingData();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState('');

  // For now, show all teams - we'll improve this logic later
  const opponentTeams = teams;

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast({ title: 'Please enter a team name', variant: 'destructive' });
      return;
    }

    try {
      await createTeam({ name: teamName.trim() });
      toast({ title: 'Opponent team created successfully' });
      setTeamName('');
      setDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error creating team', variant: 'destructive' });
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      await deleteTeam(teamId);
      toast({ title: 'Opponent team deleted' });
    } catch (error) {
      toast({ title: 'Error deleting team', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Opponent Teams</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Opponent Team
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Opponent Team</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="teamName">Team Name</Label>
                  <Input
                    id="teamName"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Enter opponent team name"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateTeam();
                      }
                    }}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTeam}>
                    Add Team
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {opponentTeams.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <UserX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Opponent Teams</h3>
                <p className="text-gray-600 mb-4">
                  Add opponent teams that you'll compete against during meets.
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Opponent Team
                </Button>
              </CardContent>
            </Card>
          ) : (
            opponentTeams.map((team) => (
              <Card key={team.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <div className="flex items-center">
                      <UserX className="h-5 w-5 mr-2 text-gray-600" />
                      {team.name}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Opponent Team</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{team.name}"? This action cannot be undone.
                            This will not affect any completed matches.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteTeam(team.id)}
                            className="bg-red-600 text-white hover:bg-red-700"
                          >
                            Delete Team
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Opponent team - will be available when creating matches
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">About Opponent Teams</h3>
          <p className="text-blue-800 text-sm">
            Use this section to pre-add opponent teams you compete against regularly. 
            These teams will appear as suggestions when creating matches, making setup faster.
            You can also create new opponent teams directly when setting up matches.
          </p>
        </div>
      </div>
    </div>
  );
}