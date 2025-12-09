// server.js - Picture Duel rounds v7
// Features:
// - Rooms with host & players
// - Host chooses category and round duration ONCE per game
// - Big word bank including wildcard
// - Word only visible to drawer
// - Default round duration 90s; other options 75s (speed), 120s (relaxed)
// - Speed-based scoring
// - Drawer gains +1 per correct guesser
// - Each player gets 3 drawing turns, then game ends
// - After each round: tally, then 5s "next turn" countdown, then auto-start next round
// - Per-room drawing & chat
// - Drawing supports per-stroke colour (and clients can simulate eraser by sending background colour)

const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

// -------- Word bank --------
const WORDS = {
  animals: [
    "CAT","DOG","ELEPHANT","LION","TIGER","GIRAFFE","MONKEY","FISH","BIRD","SNAKE","RABBIT","HORSE",
    "COW","PIG","SHEEP","GOAT","ZEBRA","KANGAROO","PANDA","BEAR","FOX","WOLF","MOUSE","RAT",
    "OWL","EAGLE","SHARK","WHALE","DOLPHIN","PENGUIN","TURTLE","FROG","DUCK","CHICKEN"
  ],
  objects: [
    "CHAIR","TABLE","CAR","BICYCLE","PHONE","LAPTOP","KEY","BOOK","BED","CUP","CLOCK","PENCIL",
    "SCISSORS","BAG","UMBRELLA","LAMP","REMOTE","HEADPHONES","BOTTLE","GLASSES","TOOTHBRUSH",
    "BACKPACK","SOFA","TV","CAMERA","WATCH"
  ],
  food: [
    "PIZZA","BURGER","APPLE","BANANA","ICE CREAM","CAKE","SANDWICH","PASTA","CHEESE","CARROT","EGG",
    "HOT DOG","SALAD","SOUP","COOKIE","CHOCOLATE","DONUT","PANCAKE","WAFFLE","ORANGE","GRAPES",
    "STRAWBERRY","WATERMELON","FRIES","RICE","NOODLES"
  ],
  places: [
    "PARK","BEACH","MOUNTAIN","SCHOOL","HOUSE","SHOP","CASTLE","FOREST","BRIDGE","STATION",
    "HOSPITAL","LIBRARY","MUSEUM","AIRPORT","STADIUM","PLAYGROUND","FARM","CITY","VILLAGE","ISLAND",
    "OFFICE","FACTORY","WAREHOUSE","GARAGE","GARDEN","BACKYARD","ZOO","THEME PARK"
  ],
  sports: [
    "FOOTBALL","BASKETBALL","TENNIS","GOLF","SWIMMING","RUNNING","CYCLING","BOXING","SKIING",
    "SURFING","VOLLEYBALL","RUGBY","CRICKET","BASEBALL","TABLE TENNIS","BADMINTON","SKATEBOARDING",
    "HOCKEY","GYMNASTICS","ROWING","SAILING","ARCHERY","CLIMBING","HORSE RIDING"
  ],
  jobs: [
    "TEACHER","DOCTOR","NURSE","POLICE OFFICER","FIREFIGHTER","CHEF","ARTIST","MUSICIAN","SCIENTIST",
    "PILOT","DRIVER","FARMER","BUILDER","ENGINEER","WRITER","DANCER","ACTOR","HAIRDRESSER",
    "MECHANIC","ELECTRICIAN","PLUMBER","VET","LAWYER","LIBRARIAN","BAKER","PHOTOGRAPHER"
  ],
  actions: [
    "RUN","JUMP","SLEEP","EAT","DRINK","DANCE","SING","READ","WRITE","DRAW","SWIM","FLY",
    "CLIMB","LAUGH","CRY","SMILE","COOK","DRIVE","THROW","CATCH","KICK","HUG","WAVE",
    "BRUSH TEETH","WASH HANDS","OPEN DOOR","CLOSE DOOR","RING DOORBELL"
  ],
  transport: [
    "CAR","BUS","TRAIN","PLANE","BOAT","SHIP","BICYCLE","MOTORBIKE","TRAM","SUBWAY","HELICOPTER",
    "SCOOTER","ROCKET","TAXI","VAN","TRUCK","AMBULANCE","FIRE ENGINE","POLICE CAR","TRACTOR"
  ],
  fantasy: [
    "DRAGON","UNICORN","WIZARD","CASTLE","KNIGHT","PRINCESS","GIANT","MERMAID","GHOST",
    "ROBOT","ALIEN","FAIRY","VAMPIRE","WEREWOLF","TREASURE","MAGIC WAND","POTION","SPELL BOOK",
    "MAGIC CARPET","TROLL","ELF","DWARF","PHOENIX","GRIFFIN","TIME MACHINE","SPACESHIP"
  ],
  wildcard: [
    "TIME TRAVEL","SUPERHERO","PIRATE SHIP","HAUNTED HOUSE","DINOSAUR","SPACE STATION","RAINBOW","VOLCANO",
    "STORM","TORNADO","TREASURE MAP","SECRET DOOR","MAZE","INVISIBLE MAN","SHRINK RAY",
    "MONSTER UNDER THE BED","SANDCASTLE","SNOWMAN","ROBOT BUTLER","ALIEN PLANET","DRAGON EGG","FLOATING ISLAND",
    "MAGIC SCHOOL","PUPPET THEATRE","ESCAPE ROOM","GAME CONTROLLER","FIREWORKS","CIRCUS","FUNFAIR","TIGHTROPE",
    "MAGIC MIRROR","TIME PORTAL","ICE CASTLE","GIANT ROBOT","SPY GADGET","SECRET LAB","COMIC BOOK","BOARD GAME"
  ]
};

const DEFAULT_ROUND_DURATION_MS = 90000; // 90 seconds default
const MAX_DRAWS_PER_PLAYER = 3;
const PRE_ROUND_DELAY_MS = 2000;   // "tally" time
const PRE_ROUND_COUNTDOWN_MS = 5000; // visible 5s countdown
const AUTO_NEXT_ROUND_DELAY_MS = PRE_ROUND_DELAY_MS + PRE_ROUND_COUNTDOWN_MS;

// rooms = {...} similar to earlier versions
const rooms = {};

function createRoom(code) {
  rooms[code] = {
    players: {},
    hostId: null,
    usedWords: new Set(),
    currentWord: null,
    currentCategory: null,
    drawerId: null,
    roundActive: false,
    roundStartTime: null,
    roundDurationMs: DEFAULT_ROUND_DURATION_MS,
    roundTimeout: null,
    nextRoundTimeout: null,
    guessState: {},
    gameOver: false
  };
}

function emitRoomState(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  const players = Object.entries(room.players).map(([id, p]) => ({
    id,
    name: p.name,
    score: p.score || 0,
    draws: p.draws || 0
  }));

  io.to(roomCode).emit("room_state", {
    roomCode,
    players,
    hostId: room.hostId,
    drawerId: room.drawerId,
    roundActive: room.roundActive,
    currentCategory: room.currentCategory
  });
}

function pickNextDrawer(room) {
  const ids = Object.keys(room.players);
  if (ids.length === 0) return null;
  let bestId = null;
  let bestDraws = Infinity;
  for (const id of ids) {
    const draws = room.players[id].draws || 0;
    if (draws < bestDraws) {
      bestDraws = draws;
      bestId = id;
    }
  }
  return bestId;
}

function pickWord(room, categoryKey) {
  const list = WORDS[categoryKey];
  if (!list) return null;
  const unused = list.filter((w) => !room.usedWords.has(w));
  if (unused.length === 0) return null;
  const idx = Math.floor(Math.random() * unused.length);
  const word = unused[idx];
  room.usedWords.add(word);
  return word;
}

function scoreForDelta(deltaMs) {
  if (deltaMs < 0) deltaMs = 0;
  let score = 10;
  if (deltaMs > 10000) {
    const extra = deltaMs - 10000;
    const steps = Math.floor(extra / 5000);
    score = 10 - steps;
  }
  if (score < 1) score = 1;
  return score;
}

function scheduleNextRound(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;
  if (room.nextRoundTimeout) {
    clearTimeout(room.nextRoundTimeout);
    room.nextRoundTimeout = null;
  }
  if (room.gameOver) return;

  room.nextRoundTimeout = setTimeout(() => {
    const r = rooms[roomCode];
    if (!r) return;
    r.nextRoundTimeout = null;
    if (r.gameOver) return;
    if (r.roundActive) return;

    const category = r.currentCategory;
    if (!category || !WORDS[category]) {
      io.to(roomCode).emit("round_error", {
        message: "No category set or words missing for next round."
      });
      return;
    }

    const drawerId = pickNextDrawer(r);
    if (!drawerId) {
      io.to(roomCode).emit("round_error", {
        message: "No drawer available for next round."
      });
      return;
    }

    const word = pickWord(r, category);
    if (!word) {
      io.to(roomCode).emit("round_error", {
        message: "No words left in this category."
      });
      return;
    }

    const dur = r.roundDurationMs || DEFAULT_ROUND_DURATION_MS;

    r.drawerId = drawerId;
    r.currentWord = word;
    r.roundActive = true;
    r.roundStartTime = Date.now();
    r.guessState = {};
    r.players[drawerId].draws = (r.players[drawerId].draws || 0) + 1;

    if (r.roundTimeout) clearTimeout(r.roundTimeout);
    r.roundTimeout = setTimeout(() => {
      endRound(roomCode, "time_up");
    }, dur);

    const endTime = r.roundStartTime + dur;

    io.to(roomCode).emit("round_started", {
      drawerId,
      drawerName: r.players[drawerId].name,
      category,
      roundDurationMs: dur,
      roundEndTime: endTime
    });

    io.to(drawerId).emit("your_word", { word });

    emitRoomState(roomCode);
  }, AUTO_NEXT_ROUND_DELAY_MS);
}

function endRound(roomCode, reason) {
  const room = rooms[roomCode];
  if (!room || !room.roundActive) return;

  room.roundActive = false;
  if (room.roundTimeout) {
    clearTimeout(room.roundTimeout);
    room.roundTimeout = null;
  }

  const drawerId = room.drawerId;
  const drawer = drawerId ? room.players[drawerId] : null;

  const results = [];
  for (const [id, p] of Object.entries(room.players)) {
    const gs = room.guessState[id];
    const roundScore = gs && gs.correct ? gs.score : 0;
    results.push({
      id,
      name: p.name,
      roundScore,
      totalScore: p.score || 0
    });
  }

  io.to(roomCode).emit("round_ended", {
    word: room.currentWord,
    category: room.currentCategory,
    drawerId,
    drawerName: drawer ? drawer.name : null,
    results,
    reason
  });

  room.currentWord = null;
  room.drawerId = null;
  room.roundStartTime = null;
  room.guessState = {};

  let done = true;
  for (const p of Object.values(room.players)) {
    if ((p.draws || 0) < MAX_DRAWS_PER_PLAYER) {
      done = false;
      break;
    }
  }

  if (done) {
    room.gameOver = true;
    if (room.nextRoundTimeout) {
      clearTimeout(room.nextRoundTimeout);
      room.nextRoundTimeout = null;
    }
    const leaderboard = Object.entries(room.players)
      .map(([id, p]) => ({
        id,
        name: p.name,
        score: p.score || 0
      }))
      .sort((a, b) => a.score - b.score);

    io.to(roomCode).emit("game_over", {
      leaderboard,
      maxDraws: MAX_DRAWS_PER_PLAYER
    });
  } else {
    const nextDrawerId = pickNextDrawer(room);
    const nextDrawerName =
      nextDrawerId && room.players[nextDrawerId]
        ? room.players[nextDrawerId].name
        : null;
    io.to(roomCode).emit("ready_for_next_round", {
      nextDrawerId,
      nextDrawerName
    });
    scheduleNextRound(roomCode);
  }

  emitRoomState(roomCode);
}

io.on("connection", (socket) => {
  console.log("client connected:", socket.id);
  socket.data.name = null;
  socket.data.roomCode = null;

  socket.on("set_name", (name) => {
    if (typeof name !== "string") return;
    socket.data.name = name.trim().slice(0, 20) || null;
  });

  socket.on("join_room", (payload) => {
    try {
      const { roomCode } = payload || {};
      let { name } = payload || {};

      if (!roomCode || typeof roomCode !== "string") {
        socket.emit("join_error", { message: "Invalid room code." });
        return;
      }

      const code = roomCode.toUpperCase().slice(0, 8);
      name = (name || socket.data.name || "").toString().trim().slice(0, 20);

      if (!name) {
        socket.emit("join_error", { message: "Please enter a name first." });
        return;
      }

      if (!rooms[code]) {
        createRoom(code);
        console.log("Created room", code);
      }
      const room = rooms[code];

      const existingNames = Object.values(room.players).map((p) =>
        p.name.toLowerCase()
      );
      let finalName = name;
      let n = 2;
      while (existingNames.includes(finalName.toLowerCase())) {
        finalName = `${name} (${n})`;
        n++;
      }
      socket.data.name = finalName;

      const oldCode = socket.data.roomCode;
      if (oldCode && oldCode !== code && rooms[oldCode]) {
        const oldRoom = rooms[oldCode];
        socket.leave(oldCode);
        delete oldRoom.players[socket.id];
        if (oldRoom.roundActive && oldRoom.drawerId === socket.id) {
          endRound(oldCode, "drawer_left");
        } else if (Object.keys(oldRoom.players).length === 0) {
          if (oldRoom.roundTimeout) clearTimeout(oldRoom.roundTimeout);
          if (oldRoom.nextRoundTimeout) clearTimeout(oldRoom.nextRoundTimeout);
          delete rooms[oldCode];
        } else {
          emitRoomState(oldCode);
        }
      }

      socket.join(code);
      socket.data.roomCode = code;
      const existing = room.players[socket.id];
      room.players[socket.id] = {
        name: finalName,
        score: existing ? existing.score : 0,
        draws: existing ? existing.draws : 0
      };

      if (!room.hostId) {
        room.hostId = socket.id;
      }

      console.log(`Socket ${socket.id} (${finalName}) joined room ${code}`);
      socket.emit("joined_room", { roomCode: code, name: finalName });
      emitRoomState(code);
    } catch (err) {
      console.error("join_room error:", err);
      socket.emit("join_error", { message: "Something went wrong joining." });
    }
  });

  socket.on("chat_message", (text) => {
    const roomCode = socket.data.roomCode;
    const room = rooms[roomCode];
    const name = socket.data.name || "Player";
    if (!roomCode || !room) return;
    if (typeof text !== "string") return;
    const trimmed = text.trim().slice(0, 200);
    if (!trimmed) return;
    io.to(roomCode).emit("chat_message", {
      name,
      text: trimmed,
      ts: Date.now()
    });
  });

  socket.on("host_start_round", ({ category, durationMs }) => {
    const roomCode = socket.data.roomCode;
    const room = rooms[roomCode];
    if (!roomCode || !room) return;
    if (room.gameOver) {
      socket.emit("round_error", { message: "Game has finished. Start a new game." });
      return;
    }
    if (socket.id !== room.hostId) {
      socket.emit("round_error", { message: "Only the host can start rounds." });
      return;
    }
    if (room.roundActive) {
      socket.emit("round_error", { message: "Round already active." });
      return;
    }
    if (room.currentCategory && room.usedWords.size > 0) {
      socket.emit("round_error", { message: "Game already in progress." });
      return;
    }
    if (!category || !WORDS[category]) {
      socket.emit("round_error", { message: "Please select a valid category." });
      return;
    }
    if (Object.keys(room.players).length < 1) {
      socket.emit("round_error", { message: "Need at least 1 player to start (2 for real games)." });
      return;
    }

    const drawerId = pickNextDrawer(room);
    if (!drawerId) {
      socket.emit("round_error", { message: "No drawer available." });
      return;
    }

    const word = pickWord(room, category);
    if (!word) {
      socket.emit("round_error", { message: "No words left in this category." });
      return;
    }

    let dur = parseInt(durationMs, 10);
    if (!Number.isFinite(dur) || dur < 10000 || dur > 120000) {
      dur = DEFAULT_ROUND_DURATION_MS;
    }
    room.roundDurationMs = dur;
    room.currentCategory = category;

    room.drawerId = drawerId;
    room.currentWord = word;
    room.roundActive = true;
    room.roundStartTime = Date.now();
    room.guessState = {};
    room.players[drawerId].draws = (room.players[drawerId].draws || 0) + 1;

    if (room.roundTimeout) {
      clearTimeout(room.roundTimeout);
    }
    room.roundTimeout = setTimeout(() => {
      endRound(roomCode, "time_up");
    }, dur);

    const endTime = room.roundStartTime + dur;

    io.to(roomCode).emit("round_started", {
      drawerId,
      drawerName: room.players[drawerId].name,
      category,
      roundDurationMs: dur,
      roundEndTime: endTime
    });

    io.to(drawerId).emit("your_word", { word });

    emitRoomState(roomCode);
  });

  socket.on("submit_guess", ({ guess }) => {
    const roomCode = socket.data.roomCode;
    const room = rooms[roomCode];
    if (!roomCode || !room) return;
    if (!room.roundActive) return;

    const playerId = socket.id;
    if (playerId === room.drawerId) {
      return;
    }
    const player = room.players[playerId];
    if (!player) return;

    const text = (guess || "").toString().trim();
    if (!text) return;

    const word = room.currentWord;
    if (!word) return;

    const already = room.guessState[playerId];
    if (already && already.correct) {
      return;
    }

    const normalisedGuess = text.toUpperCase();
    const normalisedWord = word.toUpperCase();

    if (normalisedGuess === normalisedWord) {
      const now = Date.now();
      const delta = now - room.roundStartTime;
      const score = scoreForDelta(delta);

      player.score = (player.score || 0) + score;

      if (room.drawerId && room.players[room.drawerId]) {
        room.players[room.drawerId].score =
          (room.players[room.drawerId].score || 0) + 1;
      }

      room.guessState[playerId] = {
        correct: true,
        score,
        time: delta
      };

      io.to(roomCode).emit("player_guessed", {
        playerId,
        name: player.name
      });

      socket.emit("guess_result", { correct: true, score });

      let allCorrect = true;
      for (const [id, p] of Object.entries(room.players)) {
        if (id === room.drawerId) continue;
        const gs = room.guessState[id];
        if (!gs || !gs.correct) {
          allCorrect = false;
          break;
        }
      }
      if (allCorrect) {
        endRound(roomCode, "all_guessed");
      } else {
        emitRoomState(roomCode);
      }
    } else {
      socket.emit("guess_result", { correct: false });
    }
  });

  // per-room drawing (drawer only) with optional colour
  socket.on("draw_line", (data) => {
    const roomCode = socket.data.roomCode;
    const room = rooms[roomCode];
    if (!roomCode || !room) return;
    if (!room.roundActive) return;
    if (socket.id !== room.drawerId) return;
    if (!data) return;
    const { x0, y0, x1, y1, color } = data;
    if ([x0, y0, x1, y1].some((v) => typeof v !== "number")) return;
    socket.to(roomCode).emit("draw_line", data);
  });

  socket.on("clear", () => {
    const roomCode = socket.data.roomCode;
    const room = rooms[roomCode];
    if (!roomCode || !room) return;
    if (!room.roundActive) return;
    if (socket.id !== room.drawerId) return;
    socket.to(roomCode).emit("clear");
  });

  socket.on("host_reset_game", () => {
    const roomCode = socket.data.roomCode;
    const room = rooms[roomCode];
    if (!roomCode || !room) return;
    if (socket.id !== room.hostId) return;

    if (room.roundTimeout) {
      clearTimeout(room.roundTimeout);
      room.roundTimeout = null;
    }
    if (room.nextRoundTimeout) {
      clearTimeout(room.nextRoundTimeout);
      room.nextRoundTimeout = null;
    }

    for (const p of Object.values(room.players)) {
      p.score = 0;
      p.draws = 0;
    }
    room.usedWords = new Set();
    room.currentWord = null;
    room.currentCategory = null;
    room.drawerId = null;
    room.roundActive = false;
    room.roundStartTime = null;
    room.roundDurationMs = DEFAULT_ROUND_DURATION_MS;
    room.guessState = {};
    room.gameOver = false;

    io.to(roomCode).emit("game_reset");
    emitRoomState(roomCode);
  });

  socket.on("disconnect", () => {
    const roomCode = socket.data.roomCode;
    const name = socket.data.name;
    console.log("client disconnected:", socket.id, name || "");
    if (roomCode && rooms[roomCode]) {
      const room = rooms[roomCode];
      const wasDrawer = room.drawerId === socket.id;

      delete room.players[socket.id];

      if (Object.keys(room.players).length === 0) {
        if (room.roundTimeout) clearTimeout(room.roundTimeout);
        if (room.nextRoundTimeout) clearTimeout(room.nextRoundTimeout);
        delete rooms[roomCode];
      } else {
        if (room.hostId === socket.id) {
          room.hostId = Object.keys(room.players)[0];
        }

        if (room.roundActive && wasDrawer) {
          endRound(roomCode, "drawer_left");
        } else {
          emitRoomState(roomCode);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Picture Duel server at http://localhost:" + PORT);
});
