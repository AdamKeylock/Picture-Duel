// server.js - Picture Duel rounds v5
// Features:
// - Rooms with host & players
// - Host chooses category and round duration ONCE per game
// - Big word bank for each category
// - Word only visible to drawer
// - 45/60/75s timer with scoring by speed
// - Drawer gains +1 per correct guesser
// - Each player gets 3 drawing turns, then game ends
// - After each round: tally, then 5s "next turn" countdown
// - Next rounds start automatically (no need to click start again)

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
    "CAT","DOG","RABBIT","HAMSTER","GUINEA PIG","GERBIL","MOUSE","RAT","PARROT","GOLDFISH",
    "CANARY","BUDGIE","TURTLE","TORTOISE","LIZARD","SNAKE","FROG","TOAD","NEWT","HORSE",
    "PONY","DONKEY","MULE","COW","BULL","CALF","PIG","PIGLET","SHEEP","LAMB",
    "GOAT","CHICKEN","ROOSTER","HEN","DUCK","DRAKE","GOOSE","GANDER","TURKEY","RABBIT",
    "DEER","STAG","DOE","FOX","WOLF","BEAR","POLAR BEAR","PANDA","KOALA","KANGAROO",
    "WALLABY","ELEPHANT","GIRAFFE","HIPPOPOTAMUS","RHINOCEROS","ZEBRA","LION","TIGER","CHEETAH","LEOPARD",
    "JAGUAR","HYENA","MONKEY","GORILLA","CHIMPANZEE","ORANGUTAN","BABOON","MEERKAT","LEMUR","OTTER",
    "SEAL","SEA LION","WALRUS","DOLPHIN","WHALE","ORCA","SHARK","RAY","STINGRAY","OCTOPUS",
    "SQUID","CRAB","LOBSTER","PRAWN","SHRIMP","STARFISH","SEAHORSE","JELLYFISH","SALMON","TROUT",
    "CLOWNFISH","TUNA","EAGLE","HAWK","FALCON","OWL","BUZZARD","VULTURE","PIGEON","DOVE",
    "SPARROW","ROBIN","BLUE JAY","BLACKBIRD","CROW","RAVEN","MAGPIE","WOODPECKER","SWAN","DUCKLING",
    "GOSLING","OSTRICH","EMU","PEACOCK","FLAMINGO","HERON","STORK","CRANE","PENGUIN","SEAGULL",
    "BEE","WASP","ANT","BEETLE","BUTTERFLY","MOTH","DRAGONFLY","LADYBIRD","SPIDER","SCORPION",
    "WORM","SNAIL","SLUG","HEDGEHOG","BADGER","MOLE","SQUIRREL","CHIPMUNK","RACCOON","SKUNK",
    "BAT","BOAR","HARE","TURTLEDOVE","IBIS","PARAKEET","MACAW","COCKATOO","CHAMELEON","IGUANA",
    "GECKO","PYTHON","BOA","CROCODILE","ALLIGATOR","TAPIR","ANTELOPE","GAZELLE","MOOSE","ELK",
    "BUFFALO","BISON","CAMEL","ALPACA","LLAMA","PORCUPINE","PLATYPUS","WOMBAT","DINGO","TARSIER",
    "MANATEE","NARWHAL","WOLF PUP","LION CUB","TIGER CUB","BABY ELEPHANT","BABY SEAL","KITTEN","PUPPY","DUCKBILL PLATYPUS"
  ],
  objects: [
    "CHAIR","TABLE","SOFA","BED","PILLOW","BLANKET","LAMP","LIGHT","TV","REMOTE",
    "PHONE","TABLET","LAPTOP","KEYBOARD","MOUSE","HEADPHONES","CAMERA","CLOCK","WATCH","MUG",
    "CUP","BOTTLE","GLASS","PLATE","BOWL","FORK","KNIFE","SPOON","PAN","POT",
    "KETTLE","TOASTER","FRIDGE","FREEZER","OVEN","MICROWAVE","BLENDER","VACUUM","BUCKET","BRUSH",
    "BROOM","MOP","DUSTER","BIN","BACKPACK","SUITCASE","WALLET","PURSE","UMBRELLA","COAT",
    "HAT","SCARF","GLOVES","SHOES","BOOT","TRAINERS","SOCKS","BELT","TORCH","CANDLE",
    "BOOK","NOTEBOOK","PEN","PENCIL","RULER","ERASER","SCISSORS","GLUE","TAPE","STAPLER",
    "PAINTBRUSH","PAINT","MARKER","CRAYON","PAPER","LETTER","ENVELOPE","STAMP","PARCEL","BALL",
    "FOOTBALL","BASKETBALL","TENNIS BALL","SKIPPING ROPE","BAT","RACKET","SKATEBOARD","SCOOTER","BICYCLE","HELMET",
    "HAMMER","SCREWDRIVER","WRENCH","SAW","NAIL","SCREW","DRILL","TAPE MEASURE","TOOLBOX","LADDER",
    "HOSE","WATERING CAN","PLANT POT","FLOWER POT","BINOCULARS","MAP","COMPASS","GUITAR","DRUM","PIANO",
    "SPEAKER","MICROPHONE","RADIO","CHARGER","PLUG","CABLE","EXTENSION LEAD","FAN","HEATER","AIR CONDITIONER",
    "CALCULATOR","WHITEBOARD","CHALK","MAGNET","ROPE","CHAIN","PADLOCK","KEY","DOOR","WINDOW"
  ],
  food: [
    "APPLE","BANANA","ORANGE","PEAR","GRAPE","STRAWBERRY","BLUEBERRY","PINEAPPLE","MANGO","WATERMELON",
    "LEMON","LIME","CHERRY","PEACH","PLUM","KIWI","AVOCADO","TOMATO","CUCUMBER","CARROT",
    "POTATO","ONION","GARLIC","BROCCOLI","CAULIFLOWER","PEPPER","CHILLI","MUSHROOM","LETTUCE","SPINACH",
    "PEAS","SWEETCORN","BEANS","RICE","PASTA","NOODLES","BREAD","TOAST","BAGEL","SANDWICH",
    "BURGER","PIZZA","HOT DOG","TACO","BURRITO","WRAP","FRIES","NUGGETS","STEAK","CHICKEN",
    "BACON","HAM","SAUSAGE","MEATBALL","FISH","SALMON","TUNA","SHRIMP","CRAB","LOBSTER",
    "EGG","CHEESE","MILK","BUTTER","YOGURT","ICE CREAM","CHOCOLATE","CAKE","COOKIE","BROWNIE",
    "MUFFIN","CUPCAKE","PIE","DOUGHNUT","PANCAKE","WAFFLE","CEREAL","PORRIDGE","SOUP","SALAD",
    "CURRY","STIR FRY","PAELLA","KEBAB","CHILLI CON CARNE","OMELETTE","RISOTTO","SUSHI","RAMEN","DUMPLING",
    "CHIPS","POPCORN","CRISPS","NUTS","RAISINS","JELLY","CUSTARD","PUDDING","FRUIT SALAD","SMOOTHIE",
    "TEA","COFFEE","JUICE","WATER","SODA","LEMONADE","MILKSHAKE","HOT CHOCOLATE","ENERGY DRINK","ICED TEA"
  ],
  places: [
    "PARK","BEACH","MOUNTAIN","SCHOOL","HOUSE","SHOP","CASTLE","FOREST","BRIDGE","STATION",
    "HOSPITAL","LIBRARY","MUSEUM","AIRPORT","STADIUM","PLAYGROUND","FARM","CITY","VILLAGE","ISLAND",
    "OFFICE","FACTORY","WAREHOUSE","GARAGE","GARDEN","BACKYARD","TOWN HALL","POLICE STATION","FIRE STATION","ZOO",
    "AQUARIUM","THEME PARK","AMUSEMENT PARK","CINEMA","THEATRE","RESTAURANT","CAFE","SUPERMARKET","MARKET","CAR PARK",
    "BUS STOP","TRAIN PLATFORM","PORT","HARBOUR","LIGHTHOUSE","RIVER","LAKE","DESERT","JUNGLE","CAVE"
  ],
  sports: [
    "FOOTBALL","BASKETBALL","TENNIS","GOLF","SWIMMING","RUNNING","CYCLING","BOXING","SKIING",
    "SURFING","VOLLEYBALL","RUGBY","CRICKET","BASEBALL","TABLE TENNIS","BADMINTON","SKATEBOARDING",
    "HOCKEY","ICE HOCKEY","HANDBALL","ARCHERY","FENCING","GYMNASTICS","ROWING","SAILING","KARATE","JUDO",
    "TAEKWONDO","MARTIAL ARTS","CLIMBING","HORSE RIDING"
  ],
  jobs: [
    "TEACHER","DOCTOR","NURSE","POLICE OFFICER","FIREFIGHTER","CHEF","ARTIST","MUSICIAN","SCIENTIST",
    "PILOT","DRIVER","FARMER","BUILDER","ENGINEER","WRITER","DANCER","ACTOR","HAIRDRESSER",
    "MECHANIC","ELECTRICIAN","PLUMBER","VET","LAWYER","JUDGE","SHOP ASSISTANT","RECEPTIONIST","LIBRARIAN","POSTMAN",
    "DELIVERY DRIVER","SOFTWARE DEVELOPER","GAME DESIGNER","BARBER","BAKER","BUTCHER","NANNY","PHOTOGRAPHER","REPORTER","NEWSREADER"
  ],
  actions: [
    "RUN","JUMP","SLEEP","EAT","DRINK","DANCE","SING","READ","WRITE","DRAW","SWIM","FLY",
    "CLIMB","LAUGH","CRY","SMILE","COOK","DRIVE","THROW","CATCH","KICK","HUG","WAVE","SHAKE HANDS",
    "BRUSH TEETH","WASH HANDS","OPEN DOOR","CLOSE DOOR","TURN ON LIGHT","TURN OFF LIGHT","RING DOORBELL",
    "PLAY GUITAR","PLAY PIANO","TYPE","PHONE CALL","TAKE PHOTO","PAINT"
  ],
  transport: [
    "CAR","BUS","TRAIN","PLANE","BOAT","SHIP","BICYCLE","MOTORBIKE","TRAM","SUBWAY","HELICOPTER",
    "SCOOTER","ROCKET","TAXI","VAN","TRUCK","AMBULANCE","FIRE ENGINE","POLICE CAR","TRACTOR",
    "CANOE","KAYAK","FERRY","CRUISE SHIP","CABLE CAR","TANK","SUBMARINE"
  ],
  fantasy: [
    "DRAGON","UNICORN","WIZARD","CASTLE","KNIGHT","PRINCESS","GIANT","MERMAID","GHOST",
    "ROBOT","ALIEN","FAIRY","VAMPIRE","WEREWOLF","TREASURE","MAGIC WAND",
    "POTION","SPELL BOOK","MAGIC CARPET","TROLL","ELF","DWARF","PHOENIX","GRIFFIN","TIME MACHINE","SPACESHIP"
  ],
  wildcard: [
  "RAINBOW","VOLCANO","TORNADO","TREASURE","MAZE","PORTAL","MONSTER","SANDCASTLE","SNOWMAN","ROBOT",
  "ALIEN","DRAGON","ISLAND","CIRCUS","FUNFAIR","TIGHTROPE","MIRROR","CASTLE","GADGET","COMIC",

  "CLOUD","STORM","LIGHTNING","THUNDER","SUNRISE","SUNSET","OCEAN","FOREST","JUNGLE","DESERT",
  "MOUNTAIN","CAVE","RIVER","ISLAND","LAGOON","CANYON","GLACIER","HURRICANE","WILDFIRE","AURORA",

  "MAGNET","BATTERY","COMPASS","ROCKET","TELESCOPE","SATELLITE","PLANET","ASTEROID","COMET","GALAXY",
  "SPACESHIP","UFO","ANDROID","DRONE","LASER","BEACON","CRYSTAL","PUZZLE","LABYRINTH","BLUEPRINT",

  "TREASURE","RELlC","TOTEM","AMULET","ORACLE","FOSSIL","RELIC","CHARM","SPELL","POTION",
  "SCROLL","WAND","RUNES","ORB","GEM","JEWEL","CROWN","THRONE","SCEPTER","ALTAR",

  "KEYHOLE","DOORWAY","WINDOW","BRIDGE","TUNNEL","TOWER","FURNACE","CHAMBER","WORKSHOP","ARCHIVE",
  "MARKET","THEATRE","STUDIO","FACTORY","LIBRARY","GARDEN","PLAYGROUND","WORKSHOP","GARAGE","BASEMENT",

  "WHIRLWIND","FIREBALL","STARLIGHT","SHADOW","EMBER","SPARK","FLAME","WAVE","QUAKE","BLIZZARD",

  "ANVIL","HAMMER","CHISEL","BRUSH","PENCIL","NOTEBOOK","LANTERN","RADIO","CLOCK","LOCK",
  "SAFE","CHEST","BOTTLE","BARREL","BUCKET","BALLOON","KITE","PUZZLE","DICE","TOKEN",

  "MASK","HELMET","CAPE","ARMOR","SHIELD","SWORD","AXE","BOW","QUIVER","LANCE",

  "COOKIE","PANCAKE","BURGER","NOODLES","PIZZA","APPLE","BANANA","ORANGE","CARROT","BROCCOLI",

  "PUPPET","MARIONETTE","CLOWN","TRAPEZE","JUGGLER","MAGNET","RECORD","VINYL","CAMERA","MICROPHONE",

  "GHOST","SPIRIT","PHANTOM","SHADOW","ZOMBIE","GOBLIN","ORC","WIZARD","KNIGHT","FAIRY",

  "ROCKET","PORTAL","LAB","ARENA","TEMPLE","VILLAGE","CITY","KINGDOM","DUNGEON","WORKSHOP"
]

};

module.exports = { WORDS };

const DEFAULT_ROUND_DURATION_MS = 45000;
const MAX_DRAWS_PER_PLAYER = 3;
const PRE_ROUND_DELAY_MS = 2000;   // "tally" time
const PRE_ROUND_COUNTDOWN_MS = 5000; // visible 5s countdown
const AUTO_NEXT_ROUND_DELAY_MS = PRE_ROUND_DELAY_MS + PRE_ROUND_COUNTDOWN_MS;

// rooms = {
//   CODE: {
//     players: { socketId: { name, score, draws } },
//     hostId,
//     usedWords: Set<string>,
//     currentWord,
//     currentCategory,
//     drawerId,
//     roundActive,
//     roundStartTime,
//     roundDurationMs,
//     roundTimeout,
//     nextRoundTimeout,
//     guessState: { socketId: { correct, score, time } },
//     gameOver: boolean
//   }
// }
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

  // pick the player with the fewest draws; tie-breaker = join order
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
  // First 10s = 10 points, then -1 every 5s down to min 1
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
    const room2 = rooms[roomCode];
    if (!room2) return;
    room2.nextRoundTimeout = null;
    if (room2.gameOver) return;
    if (room2.roundActive) return;

    const category = room2.currentCategory;
    if (!category || !WORDS[category]) {
      io.to(roomCode).emit("round_error", {
        message: "No category set or words missing for next round."
      });
      return;
    }

    const drawerId = pickNextDrawer(room2);
    if (!drawerId) {
      io.to(roomCode).emit("round_error", {
        message: "No drawer available for next round."
      });
      return;
    }

    const word = pickWord(room2, category);
    if (!word) {
      io.to(roomCode).emit("round_error", {
        message: "No words left in this category."
      });
      return;
    }

    const dur = room2.roundDurationMs || DEFAULT_ROUND_DURATION_MS;

    room2.drawerId = drawerId;
    room2.currentWord = word;
    room2.roundActive = true;
    room2.roundStartTime = Date.now();
    room2.guessState = {};

    // Increment draws count for drawer
    room2.players[drawerId].draws = (room2.players[drawerId].draws || 0) + 1;

    // Setup timer
    if (room2.roundTimeout) {
      clearTimeout(room2.roundTimeout);
    }
    room2.roundTimeout = setTimeout(() => {
      endRound(roomCode, "time_up");
    }, dur);

    const endTime = room2.roundStartTime + dur;

    io.to(roomCode).emit("round_started", {
      drawerId,
      drawerName: room2.players[drawerId].name,
      category,
      roundDurationMs: dur,
      roundEndTime: endTime
    });

    // Secret word only to drawer
    io.to(drawerId).emit("your_word", { word });

    emitRoomState(roomCode);
  }, AUTO_NEXT_ROUND_DELAY_MS);
}

function endRound(roomCode, reason) {
  const room = rooms[roomCode];
  if (!room) return;
  if (!room.roundActive) return;

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

  // Check for game over: everyone has drawn MAX_DRAWS_PER_PLAYER times
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
      .sort((a, b) => a.score - b.score); // lowest to highest

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

      // unique name in room
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

      // leave old room if any
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

      // First player becomes host
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

  // Host starts the FIRST round with category + duration
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
      // Settings already locked for this game; ignore extra manual starts
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

    // Round duration from host selection: default 45s
    let dur = parseInt(durationMs, 10);
    if (!Number.isFinite(dur) || dur < 10000 || dur > 120000) {
      dur = DEFAULT_ROUND_DURATION_MS;
    }
    room.roundDurationMs = dur;

    // Lock in game settings
    room.currentCategory = category;

    room.drawerId = drawerId;
    room.currentWord = word;
    room.roundActive = true;
    room.roundStartTime = Date.now();
    room.guessState = {};

    // Increment draws count for drawer
    room.players[drawerId].draws = (room.players[drawerId].draws || 0) + 1;

    // Setup timer
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

    // Secret word only to drawer
    io.to(drawerId).emit("your_word", { word });

    emitRoomState(roomCode);
  });

  // Guessing
  socket.on("submit_guess", ({ guess }) => {
    const roomCode = socket.data.roomCode;
    const room = rooms[roomCode];
    if (!roomCode || !room) return;
    if (!room.roundActive) return;

    const playerId = socket.id;
    if (playerId === room.drawerId) {
      // Drawer cannot guess
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
      // Already guessed correctly this round
      return;
    }

    const normalisedGuess = text.toUpperCase();
    const normalisedWord = word.toUpperCase();

    if (normalisedGuess === normalisedWord) {
      const now = Date.now();
      const delta = now - room.roundStartTime;
      const score = scoreForDelta(delta);

      player.score = (player.score || 0) + score;

      // Drawer gets +1 per correct guess
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

      // Check if all non-drawers have guessed correctly
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

  // per-room drawing (drawer only)
  socket.on("draw_line", (data) => {
    const roomCode = socket.data.roomCode;
    const room = rooms[roomCode];
    if (!roomCode || !room) return;
    if (!room.roundActive) return;
    if (socket.id !== room.drawerId) return;
    if (!data) return;
    const { x0, y0, x1, y1, color } = data;
    if ([x0, y0, x1, y1].some((v) => typeof v !== "number")) return;
    // allow optional color string; just pass through to clients
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

  // Host can reset game (scores, draws, usedWords) but keep players
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
        // If host left, assign new host
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
