import { useState, useEffect } from 'react';
import { queryClient } from '@/lib/queryClient';
import { Team, Wrestler, Competition, Match, EventLog, InsertTeam, InsertWrestler, InsertCompetition, InsertMatch, InsertEventLog } from '@shared/schema';

export function useWrestlingData() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [wrestlers, setWrestlers] = useState<Wrestler[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [teamsData, wrestlersData, competitionsData, matchesData] = await Promise.all([
        fetch('/api/teams').then(res => res.json()),
        fetch('/api/wrestlers').then(res => res.json()),
        fetch('/api/competitions').then(res => res.json()),
        fetch('/api/matches').then(res => res.json()),
      ]);

      setTeams(teamsData);
      setWrestlers(wrestlersData);
      setCompetitions(competitionsData);
      setMatches(matchesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Team operations
  const createTeam = async (team: InsertTeam) => {
    const response = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(team),
    });
    const newTeam = await response.json();
    setTeams(prev => [...prev, newTeam]);
    return newTeam;
  };

  const updateTeam = async (id: string, updates: Partial<InsertTeam>) => {
    const response = await fetch(`/api/teams/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const updated = await response.json();
    setTeams(prev => prev.map(t => t.id === id ? updated : t));
    return updated;
  };

  const deleteTeam = async (id: string) => {
    await fetch(`/api/teams/${id}`, { method: 'DELETE' });
    setTeams(prev => prev.filter(t => t.id !== id));
    // Also remove wrestlers from this team
    setWrestlers(prev => prev.filter(w => w.teamId !== id));
  };

  // Wrestler operations
  const createWrestler = async (wrestler: InsertWrestler) => {
    const response = await fetch('/api/wrestlers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wrestler),
    });
    const newWrestler = await response.json();
    setWrestlers(prev => [...prev, newWrestler]);
    return newWrestler;
  };

  const updateWrestler = async (id: string, updates: Partial<InsertWrestler>) => {
    const response = await fetch(`/api/wrestlers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const updated = await response.json();
    setWrestlers(prev => prev.map(w => w.id === id ? updated : w));
    return updated;
  };

  const deleteWrestler = async (id: string) => {
    await fetch(`/api/wrestlers/${id}`, { method: 'DELETE' });
    setWrestlers(prev => prev.filter(w => w.id !== id));
  };

  // Competition operations
  const createCompetition = async (competition: InsertCompetition) => {
    const response = await fetch('/api/competitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(competition),
    });
    const newCompetition = await response.json();
    setCompetitions(prev => [...prev, newCompetition]);
    return newCompetition;
  };

  const updateCompetition = async (id: string, updates: Partial<Competition>) => {
    const response = await fetch(`/api/competitions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const updated = await response.json();
    setCompetitions(prev => prev.map(c => c.id === id ? updated : c));
    return updated;
  };

  // Match operations
  const createMatch = async (match: InsertMatch) => {
    const response = await fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(match),
    });
    const newMatch = await response.json();
    setMatches(prev => [...prev, newMatch]);
    return newMatch;
  };

  const updateMatch = async (id: string, updates: Partial<Match>) => {
    const response = await fetch(`/api/matches/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const updated = await response.json();
    setMatches(prev => prev.map(m => m.id === id ? updated : m));
    return updated;
  };

  // Event log operations (simplified for now - can be enhanced later)
  const createEventLog = async (eventLog: InsertEventLog) => {
    // TODO: Implement event log API endpoints
    console.log('Event log created:', eventLog);
    return eventLog;
  };

  const getEventLogsByMatch = async (matchId: string) => {
    // TODO: Implement event log API endpoints
    console.log('Getting event logs for match:', matchId);
    return [];
  };

  // Helper functions
  const getWrestlersByTeam = (teamId: string) => {
    return wrestlers.filter(w => w.teamId === teamId);
  };

  const getMatchesByCompetition = (competitionId: string) => {
    return matches.filter(m => m.competitionId === competitionId);
  };

  const getTeamById = (id: string) => {
    return teams.find(t => t.id === id);
  };

  const getWrestlerById = (id: string) => {
    return wrestlers.find(w => w.id === id);
  };

  return {
    // Data
    teams,
    wrestlers,
    competitions,
    matches,
    loading,
    
    // Team operations
    createTeam,
    updateTeam,
    deleteTeam,
    
    // Wrestler operations
    createWrestler,
    updateWrestler,
    deleteWrestler,
    
    // Competition operations
    createCompetition,
    updateCompetition,
    
    // Match operations
    createMatch,
    updateMatch,
    
    // Event operations
    createEventLog,
    getEventLogsByMatch,
    
    // Helpers
    getWrestlersByTeam,
    getMatchesByCompetition,
    getTeamById,
    getWrestlerById,
    loadData,
  };
}
