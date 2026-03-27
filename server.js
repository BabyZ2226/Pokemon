// server.ts
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

// src/utils/battleLogic.ts
var TYPE_CHART = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, poison: 0.5, fighting: 2, dragon: 2, dark: 2, steel: 0.5 }
};
function getTypeEffectiveness(moveType, defenderTypes) {
  let effectiveness = 1;
  for (const defType of defenderTypes) {
    const multiplier = TYPE_CHART[moveType]?.[defType];
    if (multiplier !== void 0) {
      effectiveness *= multiplier;
    }
  }
  return effectiveness;
}
var NATURE_EFFECTS = {
  Adamant: { inc: "atk", dec: "spa" },
  Bold: { inc: "def", dec: "atk" },
  Brave: { inc: "atk", dec: "spe" },
  Calm: { inc: "spd", dec: "atk" },
  Careful: { inc: "spd", dec: "spa" },
  Gentle: { inc: "spd", dec: "def" },
  Hasty: { inc: "spe", dec: "def" },
  Impish: { inc: "def", dec: "spa" },
  Jolly: { inc: "spe", dec: "spa" },
  Lax: { inc: "def", dec: "spd" },
  Lonely: { inc: "atk", dec: "def" },
  Mild: { inc: "spa", dec: "def" },
  Modest: { inc: "spa", dec: "atk" },
  Naive: { inc: "spe", dec: "spd" },
  Naughty: { inc: "atk", dec: "spd" },
  Quiet: { inc: "spa", dec: "spe" },
  Quirky: { inc: "", dec: "" },
  Rash: { inc: "spa", dec: "spd" },
  Relaxed: { inc: "def", dec: "spe" },
  Sassy: { inc: "spd", dec: "spe" },
  Serious: { inc: "", dec: "" },
  Timid: { inc: "spe", dec: "atk" }
};
function calculateActualStat(pokemon, statName) {
  if (!pokemon || !pokemon.baseStats) return 100;
  const base = pokemon.baseStats[statName] || 50;
  const iv = (pokemon.ivs && pokemon.ivs[statName]) !== void 0 ? pokemon.ivs[statName] : 15;
  const ev = (pokemon.evs && pokemon.evs[statName]) !== void 0 ? pokemon.evs[statName] : 0;
  const level = pokemon.level || 50;
  if (statName === "hp") {
    return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100 + level + 10);
  }
  let statValue = Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100 + 5);
  const natureEffect = pokemon.nature ? NATURE_EFFECTS[pokemon.nature] : null;
  if (natureEffect) {
    if (natureEffect.inc === statName) statValue = Math.floor(statValue * 1.1);
    if (natureEffect.dec === statName) statValue = Math.floor(statValue * 0.9);
  }
  return statValue;
}
function calculateDamage({ attacker, defender, move, weather, isCritical }) {
  let statusApplied = void 0;
  if (move.category === "Status") {
    if (move.statusEffect && move.statusEffect !== "None") {
      const chance = move.statusChance || 100;
      if (Math.random() * 100 < chance) {
        statusApplied = move.statusEffect;
      }
    }
    return { damage: 0, statusApplied };
  }
  const attackStat = move.category === "Physical" ? calculateActualStat(attacker, "atk") : calculateActualStat(attacker, "spa");
  const defenseStat = move.category === "Physical" ? calculateActualStat(defender, "def") : calculateActualStat(defender, "spd");
  const levelFactor = 2 * attacker.level / 5 + 2;
  const baseDamage = levelFactor * move.power * (attackStat / defenseStat) / 50 + 2;
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const typeEffectiveness = getTypeEffectiveness(move.type, defender.types);
  let weatherModifier = 1;
  if (weather === "Sun" && move.type === "Fire") weatherModifier = 1.5;
  if (weather === "Sun" && move.type === "Water") weatherModifier = 0.5;
  if (weather === "Rain" && move.type === "Water") weatherModifier = 1.5;
  if (weather === "Rain" && move.type === "Fire") weatherModifier = 0.5;
  let itemModifier = 1;
  if (attacker.heldItem?.name === "Choice Band" && move.category === "Physical") {
    itemModifier = 1.5;
  }
  const randomFactor = (Math.floor(Math.random() * 16) + 85) / 100;
  const criticalModifier = isCritical ? 1.5 : 1;
  let burnModifier = 1;
  if (attacker.status === "Burn" && move.category === "Physical") {
    burnModifier = 0.5;
  }
  const finalDamage = Math.floor(
    baseDamage * weatherModifier * criticalModifier * randomFactor * stab * typeEffectiveness * itemModifier * burnModifier
  );
  if (move.statusEffect && move.statusEffect !== "None" && typeEffectiveness > 0) {
    const chance = move.statusChance || 0;
    if (Math.random() * 100 < chance) {
      statusApplied = move.statusEffect;
    }
  }
  return { damage: Math.max(1, finalDamage), statusApplied };
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  const PORT = 3e3;
  let queue = [];
  let battles = {};
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    socket.on("create-room", (data) => {
      const { roomId, userId, userName, team } = data;
      socket.join(roomId);
      battles[roomId] = {
        players: [{ socketId: socket.id, userId, userName, team }],
        turnData: {},
        state: {
          p1: { hp: team.map((p) => p.baseStats.hp * 3), activeIdx: 0 },
          p2: { hp: [], activeIdx: 0 },
          weather: "Clear",
          logs: ["Esperando oponente..."]
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
      battle.state.p2 = { hp: team.map((p) => p.baseStats.hp * 3), activeIdx: 0 };
      battle.state.logs = ["\xA1Combate Multijugador Iniciado!"];
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
      if (Object.keys(battle.turnData).length === 2) {
        const move0 = battle.turnData[0];
        const move1 = battle.turnData[1];
        const p1 = battle.players[0];
        const p2 = battle.players[1];
        const s1 = battle.state.p1;
        const s2 = battle.state.p2;
        const poke1 = p1.team[s1.activeIdx];
        const poke2 = p2.team[s2.activeIdx];
        const turnLogs = [];
        const results = {
          p1Damage: 0,
          p2Damage: 0,
          p1Fainted: false,
          p2Fainted: false
        };
        const p1First = poke1.baseStats.spe >= poke2.baseStats.spe;
        const resolveAttack = (attacker, defender, move2, attackerState, defenderState, isP1Attacking) => {
          const res = calculateDamage({
            attacker,
            defender,
            move: move2,
            weather: battle.state.weather,
            isCritical: Math.random() < 0.0625
          });
          defenderState.hp[defenderState.activeIdx] -= res.damage;
          if (isP1Attacking) {
            results.p2Damage = res.damage;
            turnLogs.push(`${attacker.name} de ${battle.players[0].userName} us\xF3 ${move2.name} y caus\xF3 ${res.damage} de da\xF1o.`);
          } else {
            results.p1Damage = res.damage;
            turnLogs.push(`${attacker.name} de ${battle.players[1].userName} us\xF3 ${move2.name} y caus\xF3 ${res.damage} de da\xF1o.`);
          }
          if (defenderState.hp[defenderState.activeIdx] <= 0) {
            defenderState.hp[defenderState.activeIdx] = 0;
            turnLogs.push(`\xA1${defender.name} se ha debilitado!`);
            if (isP1Attacking) results.p2Fainted = true;
            else results.p1Fainted = true;
            return true;
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
        if (s1.hp[s1.activeIdx] <= 0) s1.activeIdx++;
        if (s2.hp[s2.activeIdx] <= 0) s2.activeIdx++;
        let gameOver = false;
        let winnerIndex = -1;
        if (s1.activeIdx >= p1.team.length) {
          gameOver = true;
          winnerIndex = 1;
          turnLogs.push(`\xA1${p2.userName} ha ganado el combate!`);
        } else if (s2.activeIdx >= p2.team.length) {
          gameOver = true;
          winnerIndex = 0;
          turnLogs.push(`\xA1${p1.userName} ha ganado el combate!`);
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
      queue = queue.filter((q) => q.socketId !== socket.id);
      console.log("User disconnected:", socket.id);
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
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
