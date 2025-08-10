import { z } from "zod";

// Team Schema
export const teamSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.date(),
});

export const insertTeamSchema = teamSchema.omit({ id: true, createdAt: true });

export type Team = z.infer<typeof teamSchema>;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

// Weigh-in Record Schema
export const weighInRecordSchema = z.object({
  id: z.string(),
  wrestlerId: z.string(),
  weight: z.number(),
  unit: z.enum(['lbs', 'kg']),
  timestamp: z.date(),
  weightClass: z.string().optional(),
  status: z.enum(['made', 'over', 'pending']),
  type: z.enum(['competition', 'practice_in', 'practice_out']).default('competition'),
  notes: z.string().optional(),
  createdAt: z.date(),
});

export const insertWeighInRecordSchema = weighInRecordSchema.omit({ id: true, createdAt: true });

export type WeighInRecord = z.infer<typeof weighInRecordSchema>;
export type InsertWeighInRecord = z.infer<typeof insertWeighInRecordSchema>;

// Wrestler Schema
export const wrestlerSchema = z.object({
  id: z.string(),
  name: z.string(),
  teamId: z.string(),
  grade: z.string(),
  weighIn: z.object({
    weight: z.number(),
    unit: z.enum(['lbs', 'kg']),
    timestamp: z.date(),
    weightClass: z.string().optional(),
    status: z.enum(['made', 'over', 'pending']),
  }).optional(),
  createdAt: z.date(),
});

export const insertWrestlerSchema = wrestlerSchema.omit({ id: true, createdAt: true });

export type Wrestler = z.infer<typeof wrestlerSchema>;
export type InsertWrestler = z.infer<typeof insertWrestlerSchema>;

// Competition Schema
export const competitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  format: z.enum(['dual', 'individual', 'round_robin']),
  teamIds: z.array(z.string()),
  matchIds: z.array(z.string()),
  status: z.enum(['setup', 'active', 'completed']),
  createdAt: z.date(),
});

export const insertCompetitionSchema = competitionSchema.omit({ id: true, createdAt: true, matchIds: true });

export type Competition = z.infer<typeof competitionSchema>;
export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;

// Wrestling weight classes by level
export const youthWeightClasses = {
  'k-2': [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110],
  '3-4': [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130],
  '5-6': [60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145],
  '7-8': [70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165],
  'high-school': [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285],
  'college': [125, 133, 141, 149, 157, 165, 174, 184, 197, 285],
  'senior': [57, 61, 65, 70, 74, 79, 86, 92, 97, 125]
} as const;

export type YouthGradeLevel = keyof typeof youthWeightClasses;

// Tournament Schema
export const tournamentSchema = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string(),
  location: z.string().optional(),
  type: z.enum(['individual', 'team']).default('individual'),
  createdAt: z.date(),
});

export const insertTournamentSchema = tournamentSchema.omit({ id: true, createdAt: true });

export type Tournament = z.infer<typeof tournamentSchema>;
export type InsertTournament = z.infer<typeof insertTournamentSchema>;

// Dual Meet Schema
export const dualMeetSchema = z.object({
  id: z.string(),
  name: z.string(),
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  gradeLevel: z.enum(['k-2', '3-4', '5-6', '7-8', 'high-school', 'college', 'senior']),
  weightClasses: z.array(z.number()),
  startingWeightClass: z.number(),
  homeTeamOddsOrEvens: z.enum(['odds', 'evens']),
  homeTeamChoiceMatches: z.array(z.number()), // Weight classes where home team gets choice
  homeRoster: z.record(z.string(), z.string().optional()), // weightClass -> wrestlerId (optional for forfeits)
  awayRoster: z.record(z.string(), z.string().optional()),
  matchIds: z.array(z.string()),
  status: z.enum(['setup', 'active', 'completed']),
  createdAt: z.date(),
});

export const insertDualMeetSchema = dualMeetSchema.omit({ id: true, createdAt: true, matchIds: true });

export type DualMeet = z.infer<typeof dualMeetSchema>;
export type InsertDualMeet = z.infer<typeof insertDualMeetSchema>;

// Match Schema
export const matchSchema = z.object({
  id: z.string(),
  competitionId: z.string().optional(),
  tournamentId: z.string().optional(),
  competitionType: z.enum(['dual', 'multidual', 'tournament']).default('dual'),
  boutNumber: z.string().optional(),
  weightClass: z.string(),
  myWrestlerId: z.string(),
  myTeamId: z.string(),
  opponentName: z.string(),
  opponentTeam: z.string(),
  periods: z.array(z.object({
    number: z.number(),
    duration: z.number(), // in seconds
    myScore: z.number(),
    opponentScore: z.number(),
  })),
  currentPeriod: z.number(),
  currentTime: z.number(), // seconds remaining
  myScore: z.number(),
  opponentScore: z.number(),
  isRunning: z.boolean(),
  finalResult: z.object({
    winner: z.enum(['my_wrestler', 'opponent']),
    winType: z.enum(['decision', 'pin', 'technical_fall', 'forfeit', 'injury']),
    finalScore: z.object({
      myWrestler: z.number(),
      opponent: z.number(),
    }),
    duration: z.string(),
  }).optional(),
  videoPath: z.string().optional(),
  status: z.enum(['pending', 'active', 'completed']),
  createdAt: z.date(),
});

export const insertMatchSchema = matchSchema.omit({ id: true, createdAt: true });

export type Match = z.infer<typeof matchSchema>;
export type InsertMatch = z.infer<typeof insertMatchSchema>;

// Event Log Schema
export const eventLogSchema = z.object({
  id: z.string(),
  matchId: z.string(),
  timestamp: z.date(),
  period: z.number(),
  timeRemaining: z.number(),
  action: z.enum(['takedown', 'escape', 'reversal', 'near_fall', 'penalty', 'caution', 'pin', 'period_start', 'period_end', 'match_start', 'match_end']),
  wrestler: z.enum(['my_wrestler', 'opponent']).optional(),
  points: z.number(),
  scoreAfter: z.object({
    myWrestler: z.number(),
    opponent: z.number(),
  }),
  description: z.string(),
});

export const insertEventLogSchema = eventLogSchema.omit({ id: true });

export type EventLog = z.infer<typeof eventLogSchema>;
export type InsertEventLog = z.infer<typeof insertEventLogSchema>;
