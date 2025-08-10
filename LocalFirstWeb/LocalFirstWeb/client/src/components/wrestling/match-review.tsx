import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, Play, List, Share, Trophy, Clock } from 'lucide-react';
import { useWrestlingData } from '@/hooks/use-wrestling-data';
import { Match } from '@shared/schema';

export function MatchReview() {
  const {
    competitions,
    matches,
    wrestlers,
    teams,
    getWrestlerById,
    getTeamById,
    loading
  } = useWrestlingData();

  const [selectedCompetition, setSelectedCompetition] = useState<string>('all');
  const [completedMatches, setCompletedMatches] = useState<Match[]>([]);

  useEffect(() => {
    const completed = matches.filter(m => m.status === 'completed');
    const filtered = selectedCompetition === 'all' 
      ? completed 
      : completed.filter(m => m.competitionId === selectedCompetition);
    
    setCompletedMatches(filtered);
  }, [matches, selectedCompetition]);

  const getWinTypeDisplay = (winType: string) => {
    switch (winType) {
      case 'pin':
        return 'Pin';
      case 'decision':
        return 'Decision';
      case 'technical_fall':
        return 'Technical Fall';
      case 'forfeit':
        return 'Forfeit';
      case 'injury':
        return 'Injury';
      default:
        return winType;
    }
  };

  const getWinTypeBadge = (winType: string) => {
    switch (winType) {
      case 'pin':
        return <Badge className="bg-red-100 text-red-800">Pin</Badge>;
      case 'decision':
        return <Badge className="bg-blue-100 text-blue-800">Decision</Badge>;
      case 'technical_fall':
        return <Badge className="bg-purple-100 text-purple-800">Tech Fall</Badge>;
      case 'forfeit':
        return <Badge className="bg-gray-100 text-gray-800">Forfeit</Badge>;
      default:
        return <Badge variant="outline">{getWinTypeDisplay(winType)}</Badge>;
    }
  };

  const calculateTeamPoints = () => {
    const teamPoints: Record<string, { wins: number; losses: number; points: number; name: string }> = {};

    // Initialize team points
    teams.forEach(team => {
      teamPoints[team.id] = {
        wins: 0,
        losses: 0,
        points: 0,
        name: team.name
      };
    });

    // Calculate points from completed matches
    completedMatches.forEach(match => {
      if (!match.finalResult) return;

      const winnerTeam = getWrestlerById(match.finalResult.winnerId)?.teamId;
      const loserTeam = winnerTeam === getWrestlerById(match.wrestlerAId)?.teamId 
        ? getWrestlerById(match.wrestlerBId)?.teamId
        : getWrestlerById(match.wrestlerAId)?.teamId;

      if (winnerTeam && teamPoints[winnerTeam]) {
        teamPoints[winnerTeam].wins++;
        
        // Point values based on win type
        switch (match.finalResult.winType) {
          case 'pin':
          case 'technical_fall':
          case 'forfeit':
            teamPoints[winnerTeam].points += 6;
            break;
          case 'decision':
            const scoreDiff = Math.abs(match.finalResult.finalScore.wrestlerA - match.finalResult.finalScore.wrestlerB);
            teamPoints[winnerTeam].points += scoreDiff > 7 ? 5 : 3;
            break;
          default:
            teamPoints[winnerTeam].points += 3;
        }
      }

      if (loserTeam && teamPoints[loserTeam]) {
        teamPoints[loserTeam].losses++;
      }
    });

    return teamPoints;
  };

  const exportResults = () => {
    const csvContent = [
      ['Weight Class', 'Winner', 'Winner Team', 'Loser', 'Loser Team', 'Win Type', 'Score', 'Duration', 'Date'],
      ...completedMatches.map(match => {
        if (!match.finalResult) return [];
        
        const winner = getWrestlerById(match.finalResult.winnerId);
        const loser = match.finalResult.winnerId === match.wrestlerAId 
          ? getWrestlerById(match.wrestlerBId)
          : getWrestlerById(match.wrestlerAId);
        
        const winnerTeam = getTeamById(winner?.teamId || '');
        const loserTeam = getTeamById(loser?.teamId || '');
        
        return [
          match.weightClass,
          winner?.name || '',
          winnerTeam?.name || '',
          loser?.name || '',
          loserTeam?.name || '',
          getWinTypeDisplay(match.finalResult.winType),
          `${match.finalResult.finalScore.wrestlerA}-${match.finalResult.finalScore.wrestlerB}`,
          match.finalResult.duration,
          new Date(match.createdAt).toLocaleDateString()
        ];
      }).filter(row => row.length > 0)
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `match-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const teamPoints = calculateTeamPoints();
  const sortedTeams = Object.entries(teamPoints).sort((a, b) => b[1].points - a[1].points);

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Match Review</h2>
          <div className="flex space-x-3">
            <Select value={selectedCompetition} onValueChange={setSelectedCompetition}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Competitions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Competitions</SelectItem>
                {competitions.map(comp => (
                  <SelectItem key={comp.id} value={comp.id}>{comp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={exportResults}
              className="bg-primary text-white hover:bg-blue-700"
              disabled={completedMatches.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Results
            </Button>
          </div>
        </div>

        {completedMatches.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No completed matches</h3>
              <p className="text-gray-600">Matches will appear here after they are completed.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Match Results Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
              {completedMatches.map((match) => {
                if (!match.finalResult) return null;
                
                const winner = getWrestlerById(match.finalResult.winnerId);
                const loser = match.finalResult.winnerId === match.wrestlerAId 
                  ? getWrestlerById(match.wrestlerBId)
                  : getWrestlerById(match.wrestlerAId);
                
                const winnerTeam = getTeamById(winner?.teamId || '');
                const loserTeam = getTeamById(loser?.teamId || '');
                
                return (
                  <Card key={match.id} className="overflow-hidden">
                    {/* Video Thumbnail Placeholder */}
                    <div className="relative bg-gray-900 h-48 flex items-center justify-center">
                      <Play className="h-12 w-12 text-white opacity-70" />
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                        {match.finalResult.duration}
                      </div>
                      <div className="absolute top-2 left-2">
                        {getWinTypeBadge(match.finalResult.winType)}
                      </div>
                    </div>

                    <CardContent className="p-4">
                      <div className="mb-3">
                        <h3 className="font-semibold text-gray-900">{match.weightClass} lbs</h3>
                        <p className="text-sm text-gray-600 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(match.createdAt).toLocaleDateString()} - {new Date(match.createdAt).toLocaleTimeString()}
                        </p>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium text-green-600">{winner?.name}</span>
                            <span className="text-sm text-gray-500 ml-1">({winnerTeam?.name})</span>
                          </div>
                          <span className="font-mono font-bold text-green-600">
                            {match.finalResult.winnerId === match.wrestlerAId 
                              ? match.finalResult.finalScore.wrestlerA
                              : match.finalResult.finalScore.wrestlerB}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <span>{loser?.name}</span>
                            <span className="text-sm text-gray-500 ml-1">({loserTeam?.name})</span>
                          </div>
                          <span className="font-mono font-bold text-gray-600">
                            {match.finalResult.winnerId === match.wrestlerAId 
                              ? match.finalResult.finalScore.wrestlerB
                              : match.finalResult.finalScore.wrestlerA}
                          </span>
                        </div>
                      </div>

                      <div className="text-sm text-gray-600 mb-3">
                        <span className="font-medium">{getWinTypeDisplay(match.finalResult.winType)}</span>
                        <span className="mx-1">•</span>
                        <span>{match.finalResult.duration}</span>
                      </div>

                      <div className="flex space-x-2">
                        <Button className="flex-1 bg-primary text-white hover:bg-blue-700 text-sm">
                          <Play className="h-3 w-3 mr-1" />
                          Watch
                        </Button>
                        <Button variant="outline" size="sm">
                          <List className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Share className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Team Points Summary */}
            {sortedTeams.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Trophy className="h-5 w-5 mr-2" />
                    Team Points Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedTeams.map(([teamId, stats], index) => (
                      <div key={teamId} className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          {index === 0 && <Trophy className="h-5 w-5 text-yellow-500 mr-2" />}
                          <h4 className={`text-xl font-semibold ${index === 0 ? 'text-yellow-600' : 'text-primary'}`}>
                            {stats.name}
                          </h4>
                        </div>
                        <div className={`text-4xl font-bold mt-2 ${index === 0 ? 'text-yellow-600' : 'text-primary'}`}>
                          {stats.points}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Team Points</p>
                        <div className="mt-3 text-sm space-y-1">
                          <div className="flex justify-between">
                            <span>Wins:</span>
                            <span className="font-medium">{stats.wins}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Losses:</span>
                            <span className="font-medium">{stats.losses}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
