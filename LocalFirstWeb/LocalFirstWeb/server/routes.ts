import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Teams routes
  app.get("/api/teams", async (req, res) => {
    try {
      const teams = await storage.getTeams();
      res.json(teams);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.post("/api/teams", async (req, res) => {
    try {
      const team = await storage.insertTeam(req.body);
      res.json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to create team" });
    }
  });

  // Wrestlers routes
  app.get("/api/wrestlers", async (req, res) => {
    try {
      const wrestlers = await storage.getWrestlers();
      res.json(wrestlers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch wrestlers" });
    }
  });

  app.post("/api/wrestlers", async (req, res) => {
    try {
      const wrestler = await storage.insertWrestler(req.body);
      res.json(wrestler);
    } catch (error) {
      res.status(500).json({ error: "Failed to create wrestler" });
    }
  });

  app.patch("/api/wrestlers/:id", async (req, res) => {
    try {
      const wrestler = await storage.updateWrestler(req.params.id, req.body);
      res.json(wrestler);
    } catch (error) {
      res.status(500).json({ error: "Failed to update wrestler" });
    }
  });

  // Competitions routes
  app.get("/api/competitions", async (req, res) => {
    try {
      const competitions = await storage.getCompetitions();
      res.json(competitions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch competitions" });
    }
  });

  app.post("/api/competitions", async (req, res) => {
    try {
      const competition = await storage.insertCompetition(req.body);
      res.json(competition);
    } catch (error) {
      res.status(500).json({ error: "Failed to create competition" });
    }
  });

  // Matches routes
  app.get("/api/matches", async (req, res) => {
    try {
      const matches = await storage.getMatches();
      res.json(matches);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch matches" });
    }
  });

  app.post("/api/matches", async (req, res) => {
    try {
      const match = await storage.insertMatch(req.body);
      res.json(match);
    } catch (error) {
      res.status(500).json({ error: "Failed to create match" });
    }
  });

  app.patch("/api/matches/:id", async (req, res) => {
    try {
      const match = await storage.updateMatch(req.params.id, req.body);
      res.json(match);
    } catch (error) {
      res.status(500).json({ error: "Failed to update match" });
    }
  });

  // Additional routes for delete operations
  app.delete("/api/teams/:id", async (req, res) => {
    try {
      await storage.deleteTeam(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete team" });
    }
  });

  app.delete("/api/wrestlers/:id", async (req, res) => {
    try {
      await storage.deleteWrestler(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete wrestler" });
    }
  });

  app.patch("/api/teams/:id", async (req, res) => {
    try {
      const team = await storage.updateTeam(req.params.id, req.body);
      res.json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to update team" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
