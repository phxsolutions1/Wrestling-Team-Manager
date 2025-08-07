import { 
  type Team,
  type InsertTeam,
  type Wrestler,
  type InsertWrestler,
  type Competition,
  type InsertCompetition,
  type Match,
  type InsertMatch
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Team methods
  getTeams(): Promise<Team[]>;
  insertTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: string, updates: Partial<Team>): Promise<Team>;
  deleteTeam(id: string): Promise<void>;
  
  // Wrestler methods
  getWrestlers(): Promise<Wrestler[]>;
  insertWrestler(wrestler: InsertWrestler): Promise<Wrestler>;
  updateWrestler(id: string, updates: Partial<Wrestler>): Promise<Wrestler>;
  deleteWrestler(id: string): Promise<void>;
  
  // Competition methods
  getCompetitions(): Promise<Competition[]>;
  insertCompetition(competition: InsertCompetition): Promise<Competition>;
  
  // Match methods
  getMatches(): Promise<Match[]>;
  insertMatch(match: InsertMatch): Promise<Match>;
  updateMatch(id: string, updates: Partial<Match>): Promise<Match>;
}

export class MemStorage implements IStorage {
  private teams: Map<string, Team>;
  private wrestlers: Map<string, Wrestler>;
  private competitions: Map<string, Competition>;
  private matches: Map<string, Match>;

  constructor() {
    this.teams = new Map();
    this.wrestlers = new Map();
    this.competitions = new Map();
    this.matches = new Map();
  }

  // Team methods
  async getTeams(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  async insertTeam(insertTeam: InsertTeam): Promise<Team> {
    const id = randomUUID();
    const team: Team = { 
      ...insertTeam, 
      id, 
      createdAt: new Date()
    };
    this.teams.set(id, team);
    return team;
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team> {
    const existing = this.teams.get(id);
    if (!existing) {
      throw new Error(`Team with id ${id} not found`);
    }
    const updated: Team = { 
      ...existing, 
      ...updates, 
      id
    };
    this.teams.set(id, updated);
    return updated;
  }

  async deleteTeam(id: string): Promise<void> {
    this.teams.delete(id);
  }

  // Wrestler methods
  async getWrestlers(): Promise<Wrestler[]> {
    return Array.from(this.wrestlers.values());
  }

  async insertWrestler(insertWrestler: InsertWrestler): Promise<Wrestler> {
    const id = randomUUID();
    const wrestler: Wrestler = { 
      ...insertWrestler, 
      id, 
      createdAt: new Date()
    };
    this.wrestlers.set(id, wrestler);
    return wrestler;
  }

  async updateWrestler(id: string, updates: Partial<Wrestler>): Promise<Wrestler> {
    const existing = this.wrestlers.get(id);
    if (!existing) {
      throw new Error(`Wrestler with id ${id} not found`);
    }
    const updated: Wrestler = { 
      ...existing, 
      ...updates, 
      id
    };
    this.wrestlers.set(id, updated);
    return updated;
  }

  async deleteWrestler(id: string): Promise<void> {
    this.wrestlers.delete(id);
  }

  // Competition methods
  async getCompetitions(): Promise<Competition[]> {
    return Array.from(this.competitions.values());
  }

  async insertCompetition(insertCompetition: InsertCompetition): Promise<Competition> {
    const id = randomUUID();
    const competition: Competition = { 
      ...insertCompetition, 
      id, 
      createdAt: new Date()
    };
    this.competitions.set(id, competition);
    return competition;
  }

  // Match methods
  async getMatches(): Promise<Match[]> {
    return Array.from(this.matches.values());
  }

  async insertMatch(insertMatch: InsertMatch): Promise<Match> {
    const id = randomUUID();
    const match: Match = { 
      ...insertMatch, 
      id, 
      createdAt: new Date()
    };
    this.matches.set(id, match);
    return match;
  }

  async updateMatch(id: string, updates: Partial<Match>): Promise<Match> {
    const existing = this.matches.get(id);
    if (!existing) {
      throw new Error(`Match with id ${id} not found`);
    }
    const updated: Match = { 
      ...existing, 
      ...updates, 
      id
    };
    this.matches.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
