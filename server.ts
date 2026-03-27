
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { calculateDamage } from "./src/utils/battleLogic";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Matchmaking Queue
  let queue: { socketId: string; userId: string; userName: string; team: any[] }[] = [];
  // Active Battles
  let battles: Record<string, {
    players: { socketId: string; userId: string; userName: string; team: any[] }[];
    turnData: Record<string, any>;
    state: {
      p1: { hp: number[]; activeIdx: number };
      p2: { hp: number[]; activeIdx: number };
      weather: string;
      logs: string[];
    };
  }> = {};

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("create-room", (data) => {
      const { roomId, userId, userName, team } = data;
      socket.join(roomId);
      battles[roomId] = {
        players: [{ socketId: socket.id, userId, userName, team }],
        turnData: {},
        state: {
          p1: { hp: team.map((p: any) => p.baseStats.hp * 3), activeIdx: 0 },
          p2: { hp: [], activeIdx: 0 },
          weather: 'Clear',
          logs: ['Esperando oponente...']
        }
      };
      console.log(`Room ${roomId} created by ${userName}`);
    });

    socket.on("join-room", (data) => {
      const { roomId, userId, userName, team } = data;
      const battle = battles[roomId];
      if (!battle || battle.players.length >= 2) {
        socket.emit("error", "Room not found or full");
        return;
      }

      socket.join(roomId);
      battle.players.push({ socketId: socket.id, userId, userName, team });
      battle.state.p2 = { hp: team.map((p: any) => p.baseStats.hp * 3), activeIdx: 0 };
      battle.state.logs = ['¡Combate Multijugador Iniciado!'];

      const p1 = battle.players[0];
      const p2 = battle.players[1];

      io.to(p1.socketId).emit("match-found", {
        roomId,
        opponent: { userId: p2.userId, userName: p2.userName, team: p2.team },
        playerIndex: 0,
        initialState: battle.state
      });

      io.to(p2.socketId).emit("match-found", {
        roomId,
        opponent: { userId: p1.userId, userName: p1.userName, team: p1.team },
        playerIndex: 1,
        initialState: battle.state
      });

      console.log(`Match found in room ${roomId}: ${p1.userName} vs ${p2.userName}`);
    });

    socket.on("submit-move", (data) => {
      const { roomId, move, playerIndex } = data;
      const battle = battles[roomId];
      if (!battle) return;

      battle.turnData[playerIndex] = move;

      // If both players submitted moves
      if (Object.keys(battle.turnData).length === 2) {
        const move0 = battle.turnData[0];
        const move1 = battle.turnData[1];
        
        const p1 = battle.players[0];
        const p2 = battle.players[1];
        const s1 = battle.state.p1;
        const s2 = battle.state.p2;

        const poke1 = p1.team[s1.activeIdx];
        const poke2 = p2.team[s2.activeIdx];

        const turnLogs: string[] = [];
        const results = {
          p1Damage: 0,
          p2Damage: 0,
          p1Fainted: false,
          p2Fainted: false
        };

        // Speed check for turn order
        const p1First = poke1.baseStats.spe >= poke2.baseStats.spe;

        const resolveAttack = (attacker: any, defender: any, move: any, attackerState: any, defenderState: any, isP1Attacking: boolean) => {
          const res = calculateDamage({
            attacker,
            defender,
            move,
            weather: battle.state.weather as any,
            isCritical: Math.random() < 0.0625
          });

          defenderState.hp[defenderState.activeIdx] -= res.damage;
          if (isP1Attacking) {
            results.p2Damage = res.damage;
            turnLogs.push(`${attacker.name} de ${battle.players[0].userName} usó ${move.name} y causó ${res.damage} de daño.`);
          } else {
            results.p1Damage = res.damage;
            turnLogs.push(`${attacker.name} de ${battle.players[1].userName} usó ${move.name} y causó ${res.damage} de daño.`);
          }

          if (defenderState.hp[defenderState.activeIdx] <= 0) {
            defenderState.hp[defenderState.activeIdx] = 0;
            turnLogs.push(`¡${defender.name} se ha debilitado!`);
            if (isP1Attacking) results.p2Fainted = true;
            else results.p1Fainted = true;
            return true; // Fainted
          }
          return false;
        };

        if (p1First) {
          const fainted = resolveAttack(poke1, poke2, move0, s1, s2, true);
          if (!fainted) {
            resolveAttack(poke2, poke1, move1, s2, s1, false);
          }
        } else {
          const fainted = resolveAttack(poke2, poke1, move1, s2, s1, false);
          if (!fainted) {
            resolveAttack(poke1, poke2, move0, s1, s2, true);
          }
        }

        // Check if active pokemon fainted and move to next
        if (s1.hp[s1.activeIdx] <= 0) s1.activeIdx++;
        if (s2.hp[s2.activeIdx] <= 0) s2.activeIdx++;

        // Check for game over
        let gameOver = false;
        let winnerIndex = -1;
        if (s1.activeIdx >= p1.team.length) {
          gameOver = true;
          winnerIndex = 1;
          turnLogs.push(`¡${p2.userName} ha ganado el combate!`);
        } else if (s2.activeIdx >= p2.team.length) {
          gameOver = true;
          winnerIndex = 0;
          turnLogs.push(`¡${p1.userName} ha ganado el combate!`);
        }

        io.to(roomId).emit("turn-resolved", {
          state: battle.state,
          logs: turnLogs,
          gameOver,
          winnerIndex
        });

        if (gameOver) {
          delete battles[roomId];
        }

        // Reset turn data
        battle.turnData = {};
      } else {
        socket.to(roomId).emit("opponent-ready");
      }
    });

    socket.on("join-battle", (roomId) => {
      socket.join(roomId);
    });

    socket.on("battle-message", (data) => {
      const { roomId, message } = data;
      socket.to(roomId).emit("opponent-message", message);
    });

    socket.on("disconnect", () => {
      queue = queue.filter(q => q.socketId !== socket.id);
      // Handle disconnection during battle if needed
      console.log("User disconnected:", socket.id);
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
