import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Team, Wrestler, Competition, Match, EventLog, InsertTeam, InsertWrestler, InsertCompetition, InsertMatch, InsertEventLog } from '@shared/schema';

interface WrestlingDB extends DBSchema {
  teams: {
    key: string;
    value: Team;
  };
  wrestlers: {
    key: string;
    value: Wrestler;
    indexes: { 'by-team': string };
  };
  competitions: {
    key: string;
    value: Competition;
  };
  matches: {
    key: string;
    value: Match;
    indexes: { 'by-competition': string };
  };
  eventLogs: {
    key: string;
    value: EventLog;
    indexes: { 'by-match': string };
  };
}

class WrestlingStorage {
  private db: IDBPDatabase<WrestlingDB> | null = null;

  async init() {
    this.db = await openDB<WrestlingDB>('wrestling-db', 1, {
      upgrade(db) {
        // Teams store
        db.createObjectStore('teams', { keyPath: 'id' });

        // Wrestlers store
        const wrestlerStore = db.createObjectStore('wrestlers', { keyPath: 'id' });
        wrestlerStore.createIndex('by-team', 'teamId');

        // Competitions store
        db.createObjectStore('competitions', { keyPath: 'id' });

        // Matches store
        const matchStore = db.createObjectStore('matches', { keyPath: 'id' });
        matchStore.createIndex('by-competition', 'competitionId');

        // Event logs store
        const eventLogStore = db.createObjectStore('eventLogs', { keyPath: 'id' });
        eventLogStore.createIndex('by-match', 'matchId');
      },
    });
  }

  private generateId() {
    return crypto.randomUUID();
  }

  // Teams
  async createTeam(team: InsertTeam): Promise<Team> {
    if (!this.db) await this.init();
    const newTeam: Team = {
      ...team,
      id: this.generateId(),
      createdAt: new Date(),
    };
    await this.db!.add('teams', newTeam);
    return newTeam;
  }

  async getTeams(): Promise<Team[]> {
    if (!this.db) await this.init();
    return this.db!.getAll('teams');
  }

  async getTeam(id: string): Promise<Team | undefined> {
    if (!this.db) await this.init();
    return this.db!.get('teams', id);
  }

  async updateTeam(id: string, updates: Partial<InsertTeam>): Promise<Team | undefined> {
    if (!this.db) await this.init();
    const existing = await this.db!.get('teams', id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    await this.db!.put('teams', updated);
    return updated;
  }

  async deleteTeam(id: string): Promise<boolean> {
    if (!this.db) await this.init();
    await this.db!.delete('teams', id);
    return true;
  }

  // Wrestlers
  async createWrestler(wrestler: InsertWrestler): Promise<Wrestler> {
    if (!this.db) await this.init();
    const newWrestler: Wrestler = {
      ...wrestler,
      id: this.generateId(),
      createdAt: new Date(),
    };
    await this.db!.add('wrestlers', newWrestler);
    return newWrestler;
  }

  async getWrestlers(): Promise<Wrestler[]> {
    if (!this.db) await this.init();
    return this.db!.getAll('wrestlers');
  }

  async getWrestlersByTeam(teamId: string): Promise<Wrestler[]> {
    if (!this.db) await this.init();
    return this.db!.getAllFromIndex('wrestlers', 'by-team', teamId);
  }

  async getWrestler(id: string): Promise<Wrestler | undefined> {
    if (!this.db) await this.init();
    return this.db!.get('wrestlers', id);
  }

  async updateWrestler(id: string, updates: Partial<InsertWrestler>): Promise<Wrestler | undefined> {
    if (!this.db) await this.init();
    const existing = await this.db!.get('wrestlers', id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    await this.db!.put('wrestlers', updated);
    return updated;
  }

  async deleteWrestler(id: string): Promise<boolean> {
    if (!this.db) await this.init();
    await this.db!.delete('wrestlers', id);
    return true;
  }

  // Competitions
  async createCompetition(competition: InsertCompetition): Promise<Competition> {
    if (!this.db) await this.init();
    const newCompetition: Competition = {
      ...competition,
      id: this.generateId(),
      matchIds: [],
      createdAt: new Date(),
    };
    await this.db!.add('competitions', newCompetition);
    return newCompetition;
  }

  async getCompetitions(): Promise<Competition[]> {
    if (!this.db) await this.init();
    return this.db!.getAll('competitions');
  }

  async getCompetition(id: string): Promise<Competition | undefined> {
    if (!this.db) await this.init();
    return this.db!.get('competitions', id);
  }

  async updateCompetition(id: string, updates: Partial<Competition>): Promise<Competition | undefined> {
    if (!this.db) await this.init();
    const existing = await this.db!.get('competitions', id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    await this.db!.put('competitions', updated);
    return updated;
  }

  // Matches
  async createMatch(match: InsertMatch): Promise<Match> {
    if (!this.db) await this.init();
    const newMatch: Match = {
      ...match,
      id: this.generateId(),
      createdAt: new Date(),
    };
    await this.db!.add('matches', newMatch);
    
    // Update competition with new match ID
    const competition = await this.getCompetition(match.competitionId);
    if (competition) {
      await this.updateCompetition(competition.id, {
        ...competition,
        matchIds: [...competition.matchIds, newMatch.id],
      });
    }
    
    return newMatch;
  }

  async getMatches(): Promise<Match[]> {
    if (!this.db) await this.init();
    return this.db!.getAll('matches');
  }

  async getMatchesByCompetition(competitionId: string): Promise<Match[]> {
    if (!this.db) await this.init();
    return this.db!.getAllFromIndex('matches', 'by-competition', competitionId);
  }

  async getMatch(id: string): Promise<Match | undefined> {
    if (!this.db) await this.init();
    return this.db!.get('matches', id);
  }

  async updateMatch(id: string, updates: Partial<Match>): Promise<Match | undefined> {
    if (!this.db) await this.init();
    const existing = await this.db!.get('matches', id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    await this.db!.put('matches', updated);
    return updated;
  }

  // Event Logs
  async createEventLog(eventLog: InsertEventLog): Promise<EventLog> {
    if (!this.db) await this.init();
    const newEventLog: EventLog = {
      ...eventLog,
      id: this.generateId(),
    };
    await this.db!.add('eventLogs', newEventLog);
    return newEventLog;
  }

  async getEventLogsByMatch(matchId: string): Promise<EventLog[]> {
    if (!this.db) await this.init();
    const events = await this.db!.getAllFromIndex('eventLogs', 'by-match', matchId);
    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}

export const wrestlingStorage = new WrestlingStorage();
