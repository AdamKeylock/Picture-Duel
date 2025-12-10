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
  animals: ['CAT', 'DOG', 'ELEPHANT', 'LION', 'TIGER', 'GIRAFFE', 'MONKEY', 'FISH', 'BIRD', 'SNAKE', 'RABBIT', 'HORSE', 'COW', 'PIG', 'SHEEP', 'GOAT', 'ZEBRA', 'KANGAROO', 'PANDA', 'BEAR', 'FOX', 'WOLF', 'MOUSE', 'RAT', 'OWL', 'EAGLE', 'SHARK', 'WHALE', 'DOLPHIN', 'PENGUIN', 'TURTLE', 'FROG', 'DUCK', 'CHICKEN', 'DEER', 'MOOSE', 'DONKEY', 'CAMEL', 'LLAMA', 'KOALA', 'SLOTH', 'BABOON', 'GORILLA', 'CHIMPANZEE', 'LEOPARD', 'CHEETAH', 'JAGUAR', 'PUMA', 'HYENA', 'OTTER', 'BEAVER', 'BADGER', 'FERRET', 'WEASEL', 'HARE', 'HAMSTER', 'GERBIL', 'SQUIRREL', 'BAT', 'MOLE', 'HEDGEHOG', 'BISON', 'BUFFALO', 'BOAR', 'WARTHOG', 'CROCODILE', 'ALLIGATOR', 'LIZARD', 'GECKO', 'IGUANA', 'PYTHON', 'COBRA', 'VIPER', 'TOAD', 'SALMON', 'TROUT', 'CARP', 'TUNA', 'MARLIN', 'OCTOPUS', 'SQUID', 'JELLYFISH', 'STARFISH', 'SEAHORSE', 'PORPOISE', 'EEL', 'STINGRAY', 'GOLDFISH', 'PARROT', 'MACAW', 'SWAN', 'GOOSE', 'PIGEON', 'SPARROW', 'ROBIN', 'CROW', 'RAVEN', 'VULTURE', 'CONDOR', 'HERON', 'FLAMINGO', 'PEACOCK', 'TURKEY', 'QUAIL', 'PHEASANT', 'FINCH', 'BLUEJAY', 'WOODPECKER', 'SWALLOW', 'MOTH', 'BUTTERFLY', 'BEE', 'WASP', 'ANT', 'DRAGONFLY', 'FIREFLY', 'SPIDER', 'SCORPION', 'CRAB', 'LOBSTER', 'SHRIMP', 'CLAM', 'OYSTER', 'MUSSEL', 'SNAIL', 'SLUG', 'MANATEE', 'SEAL', 'WALRUS', 'NARWHAL', 'ORCA', 'HIPPOPOTAMUS', 'RHINOCEROS', 'ANTELOPE', 'GAZELLE', 'OKAPI', 'TAPIR', 'YAK', 'MARMOT', 'LEMUR', 'MEERKAT', 'CARIBOU', 'REINDEER', 'ORANGUTAN', 'BONOBO', 'MANDRILL', 'PANGOLIN', 'ARMADILLO', 'PORCUPINE', 'WOMBAT', 'WALLABY', 'OPOSSUM', 'DUGONG', 'CHAMELEON', 'CAT', 'DOG', 'ELEPHANT', 'LION', 'TIGER', 'GIRAFFE', 'MONKEY', 'FISH', 'BIRD', 'SNAKE', 'RABBIT', 'HORSE', 'COW', 'PIG', 'SHEEP', 'GOAT', 'ZEBRA', 'KANGAROO', 'PANDA', 'BEAR', 'FOX', 'WOLF', 'MOUSE', 'RAT', 'OWL', 'EAGLE', 'SHARK', 'WHALE', 'DOLPHIN', 'PENGUIN', 'TURTLE', 'FROG', 'DUCK', 'CHICKEN', 'DEER', 'MOOSE', 'DONKEY', 'CAMEL', 'LLAMA', 'KOALA', 'SLOTH', 'BABOON', 'GORILLA', 'CHIMPANZEE', 'LEOPARD', 'CHEETAH'],
  objects: ['CHAIR', 'TABLE', 'CAR', 'BICYCLE', 'PHONE', 'LAPTOP', 'KEY', 'BOOK', 'BED', 'CUP', 'CLOCK', 'PENCIL', 'SCISSORS', 'BAG', 'UMBRELLA', 'LAMP', 'REMOTE', 'HEADPHONES', 'BOTTLE', 'GLASSES', 'TOOTHBRUSH', 'BACKPACK', 'SOFA', 'TV', 'CAMERA', 'WATCH', 'COMB', 'BRUSH', 'SPOON', 'FORK', 'PLATE', 'BOWL', 'MUG', 'NAPKIN', 'TOWEL', 'PILLOW', 'BLANKET', 'MIRROR', 'RADIO', 'STEREO', 'SPEAKER', 'NOTEBOOK', 'MARKER', 'PEN', 'ERASER', 'SHARPENER', 'STAPLER', 'PAPER', 'ENVELOPE', 'BIN', 'TRASHCAN', 'BROOM', 'MOP', 'BUCKET', 'TOASTER', 'KETTLE', 'OVEN', 'FRIDGE', 'FREEZER', 'MICROWAVE', 'BLENDER', 'MIXER', 'IRON', 'FAN', 'HEATER', 'COUCH', 'DESK', 'SHELF', 'DRAWER', 'WARDROBE', 'CUPBOARD', 'HANGER', 'RUG', 'CARPET', 'CURTAIN', 'DOOR', 'WINDOW', 'HANDLE', 'LOCK', 'KEYCHAIN', 'CHAIN', 'ROPE', 'STRING', 'TAPE', 'GUITAR', 'DRUM', 'PIANO', 'VIOLIN', 'TRUMPET', 'FLUTE', 'GAMEPAD', 'KEYBOARD', 'MOUSE', 'MONITOR', 'TABLET', 'CHARGER', 'BATTERY', 'CANDLE', 'MATCH', 'LIGHTER', 'TORCH', 'BASKET', 'SUITCASE', 'LUGGAGE', 'FRAME', 'PHOTO', 'PAINTING', 'STATUE', 'VASE', 'PLANT', 'FLOWER', 'POT', 'PAN', 'WALLET', 'CHAIR', 'TABLE', 'CAR', 'BICYCLE', 'PHONE', 'LAPTOP', 'KEY', 'BOOK', 'BED', 'CUP', 'CLOCK', 'PENCIL', 'SCISSORS', 'BAG', 'UMBRELLA', 'LAMP', 'REMOTE', 'HEADPHONES', 'BOTTLE', 'GLASSES', 'TOOTHBRUSH', 'BACKPACK', 'SOFA', 'TV', 'CAMERA', 'WATCH', 'COMB', 'BRUSH', 'SPOON', 'FORK', 'PLATE', 'BOWL', 'MUG', 'NAPKIN', 'TOWEL', 'PILLOW', 'BLANKET', 'MIRROR', 'RADIO', 'STEREO', 'SPEAKER', 'NOTEBOOK', 'MARKER', 'PEN', 'ERASER', 'SHARPENER', 'STAPLER', 'PAPER', 'ENVELOPE', 'BIN', 'TRASHCAN', 'BROOM', 'MOP', 'BUCKET', 'TOASTER', 'KETTLE', 'OVEN', 'FRIDGE', 'FREEZER', 'MICROWAVE', 'BLENDER', 'MIXER', 'IRON', 'FAN', 'HEATER', 'COUCH', 'DESK', 'SHELF', 'DRAWER', 'WARDROBE', 'CUPBOARD', 'HANGER', 'RUG', 'CARPET', 'CURTAIN', 'DOOR', 'WINDOW', 'HANDLE', 'LOCK', 'KEYCHAIN', 'CHAIN', 'ROPE', 'STRING', 'TAPE', 'GUITAR', 'DRUM'],
  food: ['PIZZA', 'BURGER', 'APPLE', 'BANANA', 'CAKE', 'SANDWICH', 'PASTA', 'CHEESE', 'CARROT', 'EGG', 'SALAD', 'SOUP', 'COOKIE', 'CHOCOLATE', 'DONUT', 'PANCAKE', 'WAFFLE', 'ORANGE', 'GRAPES', 'STRAWBERRY', 'WATERMELON', 'FRIES', 'RICE', 'NOODLES', 'PEAR', 'MANGO', 'PEACH', 'PLUM', 'KIWI', 'LEMON', 'LIME', 'CHERRY', 'BLUEBERRY', 'RASPBERRY', 'BLACKBERRY', 'PINEAPPLE', 'COCONUT', 'POMEGRANATE', 'APRICOT', 'BROCCOLI', 'CAULIFLOWER', 'SPINACH', 'LETTUCE', 'PEPPER', 'CUCUMBER', 'TOMATO', 'POTATO', 'ONION', 'GARLIC', 'PEA', 'BEAN', 'CORN', 'MUSHROOM', 'STEAK', 'CHICKEN', 'SAUSAGE', 'BACON', 'HAM', 'MEATBALL', 'YOGURT', 'BUTTER', 'CREAM', 'CUSTARD', 'ICECREAM', 'MILK', 'CHEESECAKE', 'BROWNIE', 'MUFFIN', 'CUPCAKE', 'BISCUIT', 'CRACKER', 'CRISPS', 'POPCORN', 'PRETZEL', 'NACHOS', 'SAUCE', 'KETCHUP', 'MAYONNAISE', 'MUSTARD', 'HONEY', 'JAM', 'JELLY', 'PUDDING', 'SMOOTHIE', 'JUICE', 'COFFEE', 'TEA', 'HOTCHOCOLATE', 'CEREAL', 'OATMEAL', 'PORRIDGE', 'PANINI', 'TACO', 'BURRITO', 'QUESADILLA', 'SUSHI', 'DUMPLING', 'CURRY', 'PAELLA', 'LASAGNE', 'PIE', 'PASTRY', 'BAGEL', 'CROISSANT', 'DONER', 'FALAFEL', 'HUMMUS', 'PIZZAROLL', 'MEATLOAF', 'PIZZA', 'BURGER', 'APPLE', 'BANANA', 'CAKE', 'SANDWICH', 'PASTA', 'CHEESE', 'CARROT', 'EGG', 'SALAD', 'SOUP', 'COOKIE', 'CHOCOLATE', 'DONUT', 'PANCAKE', 'WAFFLE', 'ORANGE', 'GRAPES', 'STRAWBERRY', 'WATERMELON', 'FRIES', 'RICE', 'NOODLES', 'PEAR', 'MANGO', 'PEACH', 'PLUM', 'KIWI', 'LEMON', 'LIME', 'CHERRY', 'BLUEBERRY', 'RASPBERRY', 'BLACKBERRY', 'PINEAPPLE', 'COCONUT', 'POMEGRANATE', 'APRICOT', 'BROCCOLI', 'CAULIFLOWER', 'SPINACH', 'LETTUCE', 'PEPPER', 'CUCUMBER', 'TOMATO', 'POTATO', 'ONION', 'GARLIC', 'PEA', 'BEAN', 'CORN', 'MUSHROOM', 'STEAK', 'CHICKEN', 'SAUSAGE', 'BACON', 'HAM', 'MEATBALL', 'YOGURT', 'BUTTER', 'CREAM', 'CUSTARD', 'ICECREAM', 'MILK', 'CHEESECAKE', 'BROWNIE', 'MUFFIN', 'CUPCAKE', 'BISCUIT', 'CRACKER', 'CRISPS', 'POPCORN', 'PRETZEL', 'NACHOS', 'SAUCE', 'KETCHUP', 'MAYONNAISE', 'MUSTARD', 'HONEY', 'JAM', 'JELLY', 'PUDDING', 'SMOOTHIE', 'JUICE', 'COFFEE', 'TEA', 'HOTCHOCOLATE', 'CEREAL', 'OATMEAL', 'PORRIDGE'],
  places: ['PARK', 'BEACH', 'MOUNTAIN', 'SCHOOL', 'HOUSE', 'SHOP', 'CASTLE', 'FOREST', 'BRIDGE', 'STATION', 'HOSPITAL', 'LIBRARY', 'MUSEUM', 'AIRPORT', 'STADIUM', 'PLAYGROUND', 'FARM', 'CITY', 'VILLAGE', 'ISLAND', 'OFFICE', 'FACTORY', 'WAREHOUSE', 'GARAGE', 'GARDEN', 'BACKYARD', 'ZOO', 'THEATRE', 'CHURCH', 'TEMPLE', 'MOSQUE', 'SYNAGOGUE', 'MARKET', 'SQUARE', 'TOWN', 'HARBOR', 'PORT', 'RIVER', 'LAKE', 'OCEAN', 'SEA', 'DESERT', 'JUNGLE', 'RAINFOREST', 'CANYON', 'VALLEY', 'HILL', 'CLIFF', 'CAVE', 'TUNNEL', 'ROAD', 'STREET', 'ALLEY', 'HIGHWAY', 'BRICKYARD', 'QUARRY', 'MINE', 'FARMYARD', 'BARN', 'STABLE', 'KITCHEN', 'BEDROOM', 'BATHROOM', 'LOUNGE', 'HALLWAY', 'ATTIC', 'BASEMENT', 'BALCONY', 'ROOFTOP', 'PORCH', 'CAMPSITE', 'TENT', 'CABIN', 'LODGE', 'HOTEL', 'MOTEL', 'HOSTEL', 'RESORT', 'SPA', 'GYM', 'POOL', 'AQUARIUM', 'PLANETARIUM', 'LABORATORY', 'CLASSROOM', 'PLAYROOM', 'COURTYARD', 'GALLERY', 'ARENA', 'RINK', 'PAVEMENT', 'FOOTPATH', 'ROUNDABOUT', 'CARPARK', 'SUBURB', 'DOWNTOWN', 'UPTOWN', 'MARKETPLACE', 'PLAZA', 'LANE', 'PARK', 'BEACH', 'MOUNTAIN', 'SCHOOL', 'HOUSE', 'SHOP', 'CASTLE', 'FOREST', 'BRIDGE', 'STATION', 'HOSPITAL', 'LIBRARY', 'MUSEUM', 'AIRPORT', 'STADIUM', 'PLAYGROUND', 'FARM', 'CITY', 'VILLAGE', 'ISLAND', 'OFFICE', 'FACTORY', 'WAREHOUSE', 'GARAGE', 'GARDEN', 'BACKYARD', 'ZOO', 'THEATRE', 'CHURCH', 'TEMPLE', 'MOSQUE', 'SYNAGOGUE', 'MARKET', 'SQUARE', 'TOWN', 'HARBOR', 'PORT', 'RIVER', 'LAKE', 'OCEAN', 'SEA', 'DESERT', 'JUNGLE', 'RAINFOREST', 'CANYON', 'VALLEY', 'HILL', 'CLIFF', 'CAVE', 'TUNNEL', 'ROAD', 'STREET', 'ALLEY', 'HIGHWAY', 'BRICKYARD', 'QUARRY', 'MINE', 'FARMYARD', 'BARN', 'STABLE', 'KITCHEN', 'BEDROOM', 'BATHROOM', 'LOUNGE', 'HALLWAY', 'ATTIC', 'BASEMENT', 'BALCONY', 'ROOFTOP', 'PORCH', 'CAMPSITE', 'TENT', 'CABIN', 'LODGE', 'HOTEL', 'MOTEL', 'HOSTEL', 'RESORT', 'SPA', 'GYM', 'POOL', 'AQUARIUM', 'PLANETARIUM', 'LABORATORY', 'CLASSROOM', 'PLAYROOM', 'COURTYARD', 'GALLERY', 'ARENA', 'RINK', 'PAVEMENT', 'FOOTPATH', 'ROUNDABOUT', 'CARPARK', 'SUBURB', 'DOWNTOWN', 'UPTOWN', 'MARKETPLACE', 'PLAZA', 'LANE'],
  sports: ['FOOTBALL', 'BASKETBALL', 'TENNIS', 'GOLF', 'SWIMMING', 'RUNNING', 'CYCLING', 'BOXING', 'SKIING', 'SURFING', 'VOLLEYBALL', 'RUGBY', 'CRICKET', 'BASEBALL', 'BADMINTON', 'HOCKEY', 'GYMNASTICS', 'ROWING', 'SAILING', 'ARCHERY', 'CLIMBING', 'WRESTLING', 'SKATING', 'SNOWBOARDING', 'JUDO', 'KARATE', 'TAEKWONDO', 'FENCING', 'HANDBALL', 'SQUASH', 'TABLETENNIS', 'DODGEBALL', 'LACROSSE', 'SOFTBALL', 'POLO', 'BOWLING', 'KAYAKING', 'CANOEING', 'TRIATHLON', 'MARATHON', 'SPRINTING', 'HURDLES', 'DISCUS', 'JAVELIN', 'SHOTPUT', 'HIGHJUMP', 'LONGJUMP', 'POLEVAULT', 'BIATHLON', 'PENTATHLON', 'DECATHLON', 'PETANQUE', 'BOCCIA', 'CURLING', 'SNORKELING', 'DIVING', 'ROWING', 'PADDLEBOARDING', 'WINDSURFING', 'KITESURFING', 'BODYBOARDING', 'ORIENTEERING', 'DANCING', 'CHEERLEADING', 'YOGA', 'PILATES', 'AEROBICS', 'ZUMBA', 'BOXERCISE', 'SPINNING', 'HANDBALL', 'RACQUETBALL', 'KABADDI', 'HURLING', 'EQUESTRIAN', 'DARTS', 'SNOOKER', 'BILLIARDS', 'POOL', 'CHESS', 'CHECKERS', 'ESPORTS', 'PARKOUR', 'FREECLIMBING', 'MOUNTAINEERING', 'SKATEBOARDING', 'FOOTBALL', 'BASKETBALL', 'TENNIS', 'GOLF', 'SWIMMING', 'RUNNING', 'CYCLING', 'BOXING', 'SKIING', 'SURFING', 'VOLLEYBALL', 'RUGBY', 'CRICKET', 'BASEBALL', 'BADMINTON', 'HOCKEY', 'GYMNASTICS', 'ROWING', 'SAILING', 'ARCHERY', 'CLIMBING', 'WRESTLING', 'SKATING', 'SNOWBOARDING', 'JUDO', 'KARATE', 'TAEKWONDO', 'FENCING', 'HANDBALL', 'SQUASH', 'TABLETENNIS', 'DODGEBALL', 'LACROSSE', 'SOFTBALL', 'POLO', 'BOWLING', 'KAYAKING', 'CANOEING', 'TRIATHLON', 'MARATHON', 'SPRINTING', 'HURDLES', 'DISCUS', 'JAVELIN', 'SHOTPUT', 'HIGHJUMP', 'LONGJUMP', 'POLEVAULT', 'BIATHLON', 'PENTATHLON', 'DECATHLON', 'PETANQUE', 'BOCCIA', 'CURLING', 'SNORKELING', 'DIVING', 'ROWING', 'PADDLEBOARDING', 'WINDSURFING', 'KITESURFING', 'BODYBOARDING', 'ORIENTEERING', 'DANCING', 'CHEERLEADING', 'YOGA', 'PILATES', 'AEROBICS', 'ZUMBA', 'BOXERCISE', 'SPINNING', 'HANDBALL', 'RACQUETBALL', 'KABADDI', 'HURLING', 'EQUESTRIAN', 'DARTS', 'SNOOKER', 'BILLIARDS', 'POOL', 'CHESS', 'CHECKERS', 'ESPORTS', 'PARKOUR', 'FREECLIMBING', 'MOUNTAINEERING', 'SKATEBOARDING', 'FOOTBALL', 'BASKETBALL', 'TENNIS', 'GOLF', 'SWIMMING', 'RUNNING', 'CYCLING', 'BOXING', 'SKIING', 'SURFING', 'VOLLEYBALL', 'RUGBY', 'CRICKET', 'BASEBALL', 'BADMINTON', 'HOCKEY', 'GYMNASTICS', 'ROWING', 'SAILING', 'ARCHERY', 'CLIMBING', 'WRESTLING', 'SKATING', 'SNOWBOARDING', 'JUDO', 'KARATE', 'TAEKWONDO', 'FENCING'],
  jobs: ['TEACHER', 'DOCTOR', 'NURSE', 'POLICE', 'FIREFIGHTER', 'CHEF', 'ARTIST', 'MUSICIAN', 'SCIENTIST', 'PILOT', 'DRIVER', 'FARMER', 'BUILDER', 'ENGINEER', 'WRITER', 'DANCER', 'ACTOR', 'HAIRDRESSER', 'MECHANIC', 'ELECTRICIAN', 'PLUMBER', 'VET', 'LAWYER', 'LIBRARIAN', 'BAKER', 'PHOTOGRAPHER', 'BARBER', 'DESIGNER', 'PROGRAMMER', 'DEVELOPER', 'CODER', 'ARCHITECT', 'ACCOUNTANT', 'BANKER', 'CASHIER', 'WAITER', 'WAITRESS', 'BUTCHER', 'TAILOR', 'GARDENER', 'JANITOR', 'CLEANER', 'RECEPTIONIST', 'MANAGER', 'DIRECTOR', 'SECRETARY', 'CLERK', 'DENTIST', 'OPTICIAN', 'SURGEON', 'THERAPIST', 'PSYCHOLOGIST', 'CHEMIST', 'PHARMACIST', 'DELIVERY', 'COURIER', 'DRUMMER', 'SINGER', 'PERCUSSIONIST', 'CONDUCTOR', 'PAINTER', 'SCULPTOR', 'POTTER', 'CARPENTER', 'JOINER', 'BRICKLAYER', 'ROOFER', 'PLASTERER', 'DRIVER', 'TRAINER', 'COACH', 'REFEREE', 'UMPIRE', 'BLOGGER', 'YOUTUBER', 'STREAMER', 'REPORTER', 'JOURNALIST', 'EDITOR', 'PRINTER', 'PUBLISHER', 'TRANSLATOR', 'INTERPRETER', 'GUIDE', 'TOURIST', 'AGENT', 'BROKER', 'CHEMIST', 'TEACHER', 'DOCTOR', 'NURSE', 'POLICE', 'FIREFIGHTER', 'CHEF', 'ARTIST', 'MUSICIAN', 'SCIENTIST', 'PILOT', 'DRIVER', 'FARMER', 'BUILDER', 'ENGINEER', 'WRITER', 'DANCER', 'ACTOR', 'HAIRDRESSER', 'MECHANIC', 'ELECTRICIAN', 'PLUMBER', 'VET', 'LAWYER', 'LIBRARIAN', 'BAKER', 'PHOTOGRAPHER', 'BARBER', 'DESIGNER', 'PROGRAMMER', 'DEVELOPER', 'CODER', 'ARCHITECT', 'ACCOUNTANT', 'BANKER', 'CASHIER', 'WAITER', 'WAITRESS', 'BUTCHER', 'TAILOR', 'GARDENER', 'JANITOR', 'CLEANER', 'RECEPTIONIST', 'MANAGER', 'DIRECTOR', 'SECRETARY', 'CLERK', 'DENTIST', 'OPTICIAN', 'SURGEON', 'THERAPIST', 'PSYCHOLOGIST', 'CHEMIST', 'PHARMACIST', 'DELIVERY', 'COURIER', 'DRUMMER', 'SINGER', 'PERCUSSIONIST', 'CONDUCTOR', 'PAINTER', 'SCULPTOR', 'POTTER', 'CARPENTER', 'JOINER', 'BRICKLAYER', 'ROOFER', 'PLASTERER', 'DRIVER', 'TRAINER', 'COACH', 'REFEREE', 'UMPIRE', 'BLOGGER', 'YOUTUBER', 'STREAMER', 'REPORTER', 'JOURNALIST', 'EDITOR', 'PRINTER', 'PUBLISHER', 'TRANSLATOR', 'INTERPRETER', 'GUIDE', 'TOURIST', 'AGENT', 'BROKER', 'CHEMIST', 'TEACHER', 'DOCTOR', 'NURSE', 'POLICE', 'FIREFIGHTER', 'CHEF', 'ARTIST', 'MUSICIAN', 'SCIENTIST', 'PILOT', 'DRIVER', 'FARMER', 'BUILDER', 'ENGINEER', 'WRITER', 'DANCER', 'ACTOR', 'HAIRDRESSER', 'MECHANIC', 'ELECTRICIAN', 'PLUMBER', 'VET', 'LAWYER', 'LIBRARIAN'],
  actions: ['RUN', 'JUMP', 'SLEEP', 'EAT', 'DRINK', 'DANCE', 'SING', 'READ', 'WRITE', 'DRAW', 'SWIM', 'FLY', 'CLIMB', 'LAUGH', 'CRY', 'SMILE', 'COOK', 'DRIVE', 'THROW', 'CATCH', 'KICK', 'HUG', 'WAVE', 'WALK', 'TALK', 'LISTEN', 'BUILD', 'BREAK', 'FIX', 'OPEN', 'CLOSE', 'PUSH', 'PULL', 'TURN', 'SPIN', 'DROP', 'LIFT', 'CARRY', 'BAKE', 'FRY', 'CUT', 'STIR', 'POUR', 'CHASE', 'SHOUT', 'WHISPER', 'JOG', 'SKIP', 'HOP', 'ROLL', 'SHAKE', 'NOD', 'POINT', 'WRITE', 'ERASE', 'RUB', 'SCRUB', 'POLISH', 'WASH', 'RINSE', 'DRY', 'SWEEP', 'MOP', 'CLAP', 'SNAP', 'KNEEL', 'STAND', 'SIT', 'LEAN', 'HIDE', 'SEEK', 'FIND', 'SEARCH', 'EAT', 'NIBBLE', 'BITE', 'CHEW', 'SWALLOW', 'SIP', 'GULP', 'SLURP', 'TASTE', 'SMELL', 'WATCH', 'LOOK', 'GLANCE', 'STARE', 'PEEK', 'PEEP', 'FROWN', 'GRIN', 'GIGGLE', 'YAWN', 'RUN', 'JUMP', 'SLEEP', 'EAT', 'DRINK', 'DANCE', 'SING', 'READ', 'WRITE', 'DRAW', 'SWIM', 'FLY', 'CLIMB', 'LAUGH', 'CRY', 'SMILE', 'COOK', 'DRIVE', 'THROW', 'CATCH', 'KICK', 'HUG', 'WAVE', 'WALK', 'TALK', 'LISTEN', 'BUILD', 'BREAK', 'FIX', 'OPEN', 'CLOSE', 'PUSH', 'PULL', 'TURN', 'SPIN', 'DROP', 'LIFT', 'CARRY', 'BAKE', 'FRY', 'CUT', 'STIR', 'POUR', 'CHASE', 'SHOUT', 'WHISPER', 'JOG', 'SKIP', 'HOP', 'ROLL', 'SHAKE', 'NOD', 'POINT', 'WRITE', 'ERASE', 'RUB', 'SCRUB', 'POLISH', 'WASH', 'RINSE', 'DRY', 'SWEEP', 'MOP', 'CLAP', 'SNAP', 'KNEEL', 'STAND', 'SIT', 'LEAN', 'HIDE', 'SEEK', 'FIND', 'SEARCH', 'EAT', 'NIBBLE', 'BITE', 'CHEW', 'SWALLOW', 'SIP', 'GULP', 'SLURP', 'TASTE', 'SMELL', 'WATCH', 'LOOK', 'GLANCE', 'STARE', 'PEEK', 'PEEP', 'FROWN', 'GRIN', 'GIGGLE', 'YAWN', 'RUN', 'JUMP', 'SLEEP', 'EAT', 'DRINK', 'DANCE', 'SING', 'READ', 'WRITE', 'DRAW', 'SWIM', 'FLY', 'CLIMB', 'LAUGH'],
  transport: ['CAR', 'BUS', 'TRAIN', 'PLANE', 'BOAT', 'SHIP', 'BICYCLE', 'MOTORBIKE', 'TRAM', 'SUBWAY', 'HELICOPTER', 'SCOOTER', 'ROCKET', 'TAXI', 'VAN', 'TRUCK', 'AMBULANCE', 'FIREENGINE', 'POLICECAR', 'TRACTOR', 'FERRY', 'CANOE', 'KAYAK', 'RAFT', 'YACHT', 'SAILBOAT', 'SUBMARINE', 'GLIDER', 'HOVERCRAFT', 'DIRIGIBLE', 'BALLOON', 'SKATEBOARD', 'ROLLERBLADES', 'SEGWAY', 'TROLLEY', 'TRAMCAR', 'MONORAIL', 'CARGOSHIP', 'CRUISESHIP', 'BARGE', 'CART', 'WAGON', 'RICKSHAW', 'SLED', 'SLEIGH', 'GONDOLA', 'CABLECAR', 'COACH', 'MINIBUS', 'TANK', 'CAR', 'BUS', 'TRAIN', 'PLANE', 'BOAT', 'SHIP', 'BICYCLE', 'MOTORBIKE', 'TRAM', 'SUBWAY', 'HELICOPTER', 'SCOOTER', 'ROCKET', 'TAXI', 'VAN', 'TRUCK', 'AMBULANCE', 'FIREENGINE', 'POLICECAR', 'TRACTOR', 'FERRY', 'CANOE', 'KAYAK', 'RAFT', 'YACHT', 'SAILBOAT', 'SUBMARINE', 'GLIDER', 'HOVERCRAFT', 'DIRIGIBLE', 'BALLOON', 'SKATEBOARD', 'ROLLERBLADES', 'SEGWAY', 'TROLLEY', 'TRAMCAR', 'MONORAIL', 'CARGOSHIP', 'CRUISESHIP', 'BARGE', 'CART', 'WAGON', 'RICKSHAW', 'SLED', 'SLEIGH', 'GONDOLA', 'CABLECAR', 'COACH', 'MINIBUS', 'TANK', 'CAR', 'BUS', 'TRAIN', 'PLANE', 'BOAT', 'SHIP', 'BICYCLE', 'MOTORBIKE', 'TRAM', 'SUBWAY', 'HELICOPTER', 'SCOOTER', 'ROCKET', 'TAXI', 'VAN', 'TRUCK', 'AMBULANCE', 'FIREENGINE', 'POLICECAR', 'TRACTOR', 'FERRY', 'CANOE', 'KAYAK', 'RAFT', 'YACHT', 'SAILBOAT', 'SUBMARINE', 'GLIDER', 'HOVERCRAFT', 'DIRIGIBLE', 'BALLOON', 'SKATEBOARD', 'ROLLERBLADES', 'SEGWAY', 'TROLLEY', 'TRAMCAR', 'MONORAIL', 'CARGOSHIP', 'CRUISESHIP', 'BARGE', 'CART', 'WAGON', 'RICKSHAW', 'SLED', 'SLEIGH', 'GONDOLA', 'CABLECAR', 'COACH', 'MINIBUS', 'TANK', 'CAR', 'BUS', 'TRAIN', 'PLANE', 'BOAT', 'SHIP', 'BICYCLE', 'MOTORBIKE', 'TRAM', 'SUBWAY', 'HELICOPTER', 'SCOOTER', 'ROCKET', 'TAXI', 'VAN', 'TRUCK', 'AMBULANCE', 'FIREENGINE', 'POLICECAR', 'TRACTOR', 'FERRY', 'CANOE', 'KAYAK', 'RAFT', 'YACHT', 'SAILBOAT', 'SUBMARINE', 'GLIDER', 'HOVERCRAFT', 'DIRIGIBLE', 'BALLOON', 'SKATEBOARD', 'ROLLERBLADES', 'SEGWAY', 'TROLLEY', 'TRAMCAR', 'MONORAIL', 'CARGOSHIP', 'CRUISESHIP', 'BARGE', 'CART', 'WAGON', 'RICKSHAW', 'SLED', 'SLEIGH', 'GONDOLA', 'CABLECAR', 'COACH', 'MINIBUS', 'TANK'],
  fantasy: ['DRAGON', 'UNICORN', 'WIZARD', 'CASTLE', 'KNIGHT', 'PRINCESS', 'GIANT', 'MERMAID', 'GHOST', 'ROBOT', 'ALIEN', 'FAIRY', 'VAMPIRE', 'WEREWOLF', 'TREASURE', 'TROLL', 'ELF', 'DWARF', 'PHOENIX', 'GRIFFIN', 'GOBLIN', 'OGRE', 'GOLEM', 'ORC', 'HYDRA', 'BASILISK', 'PEGASUS', 'WYVERN', 'DJINN', 'SPRITE', 'IMP', 'ANGEL', 'DEMON', 'SPIRIT', 'SPECTER', 'PIXIE', 'NYMPH', 'MERMAN', 'SEER', 'SORCERER', 'WARLOCK', 'MAGE', 'WITCH', 'ENCHANTER', 'PALADIN', 'RANGER', 'BARD', 'NECROMANCER', 'DRUID', 'DRAGON', 'UNICORN', 'WIZARD', 'CASTLE', 'KNIGHT', 'PRINCESS', 'GIANT', 'MERMAID', 'GHOST', 'ROBOT', 'ALIEN', 'FAIRY', 'VAMPIRE', 'WEREWOLF', 'TREASURE', 'TROLL', 'ELF', 'DWARF', 'PHOENIX', 'GRIFFIN', 'GOBLIN', 'OGRE', 'GOLEM', 'ORC', 'HYDRA', 'BASILISK', 'PEGASUS', 'WYVERN', 'DJINN', 'SPRITE', 'IMP', 'ANGEL', 'DEMON', 'SPIRIT', 'SPECTER', 'PIXIE', 'NYMPH', 'MERMAN', 'SEER', 'SORCERER', 'WARLOCK', 'MAGE', 'WITCH', 'ENCHANTER', 'PALADIN', 'RANGER', 'BARD', 'NECROMANCER', 'DRUID', 'DRAGON', 'UNICORN', 'WIZARD', 'CASTLE', 'KNIGHT', 'PRINCESS', 'GIANT', 'MERMAID', 'GHOST', 'ROBOT', 'ALIEN', 'FAIRY', 'VAMPIRE', 'WEREWOLF', 'TREASURE', 'TROLL', 'ELF', 'DWARF', 'PHOENIX', 'GRIFFIN', 'GOBLIN', 'OGRE', 'GOLEM', 'ORC', 'HYDRA', 'BASILISK', 'PEGASUS', 'WYVERN', 'DJINN', 'SPRITE', 'IMP', 'ANGEL', 'DEMON', 'SPIRIT', 'SPECTER', 'PIXIE', 'NYMPH', 'MERMAN', 'SEER', 'SORCERER', 'WARLOCK', 'MAGE', 'WITCH', 'ENCHANTER', 'PALADIN', 'RANGER', 'BARD', 'NECROMANCER', 'DRUID', 'DRAGON', 'UNICORN', 'WIZARD', 'CASTLE', 'KNIGHT', 'PRINCESS', 'GIANT', 'MERMAID', 'GHOST', 'ROBOT', 'ALIEN', 'FAIRY', 'VAMPIRE', 'WEREWOLF', 'TREASURE', 'TROLL', 'ELF', 'DWARF', 'PHOENIX', 'GRIFFIN', 'GOBLIN', 'OGRE', 'GOLEM', 'ORC', 'HYDRA', 'BASILISK', 'PEGASUS', 'WYVERN', 'DJINN', 'SPRITE', 'IMP', 'ANGEL', 'DEMON', 'SPIRIT', 'SPECTER', 'PIXIE', 'NYMPH', 'MERMAN', 'SEER', 'SORCERER', 'WARLOCK', 'MAGE', 'WITCH', 'ENCHANTER', 'PALADIN', 'RANGER', 'BARD', 'NECROMANCER', 'DRUID', 'DRAGON', 'UNICORN', 'WIZARD', 'CASTLE'],
  wildcard: ['RAINBOW', 'VOLCANO', 'STORM', 'TORNADO', 'TREASURE', 'MAZE', 'SANDBOX', 'SNOWMAN', 'ROBOT', 'ALIEN', 'DRAGON', 'ISLAND', 'CIRCUS', 'FUNFAIR', 'TIGHTROPE', 'MIRROR', 'PORTAL', 'ICEBERG', 'ASTEROID', 'COMET', 'PLANET', 'GALAXY', 'NEBULA', 'SPACESHIP', 'SATELLITE', 'ROCKET', 'LABYRINTH', 'PUZZLE', 'RIDDLE', 'SECRET', 'MYSTERY', 'PHANTOM', 'SHADOW', 'SPIRIT', 'GOBLIN', 'PIXIE', 'PORTAL', 'WIZARD', 'MAGIC', 'SPELL', 'POTION', 'CAULDRON', 'DUNGEON', 'TOWER', 'CASTLE', 'FORTRESS', 'KINGDOM', 'EMPIRE', 'THRONE', 'DUNGEON', 'RAINBOW', 'VOLCANO', 'STORM', 'TORNADO', 'TREASURE', 'MAZE', 'SANDBOX', 'SNOWMAN', 'ROBOT', 'ALIEN', 'DRAGON', 'ISLAND', 'CIRCUS', 'FUNFAIR', 'TIGHTROPE', 'MIRROR', 'PORTAL', 'ICEBERG', 'ASTEROID', 'COMET', 'PLANET', 'GALAXY', 'NEBULA', 'SPACESHIP', 'SATELLITE', 'ROCKET', 'LABYRINTH', 'PUZZLE', 'RIDDLE', 'SECRET', 'MYSTERY', 'PHANTOM', 'SHADOW', 'SPIRIT', 'GOBLIN', 'PIXIE', 'PORTAL', 'WIZARD', 'MAGIC', 'SPELL', 'POTION', 'CAULDRON', 'DUNGEON', 'TOWER', 'CASTLE', 'FORTRESS', 'KINGDOM', 'EMPIRE', 'THRONE', 'DUNGEON', 'RAINBOW', 'VOLCANO', 'STORM', 'TORNADO', 'TREASURE', 'MAZE', 'SANDBOX', 'SNOWMAN', 'ROBOT', 'ALIEN', 'DRAGON', 'ISLAND', 'CIRCUS', 'FUNFAIR', 'TIGHTROPE', 'MIRROR', 'PORTAL', 'ICEBERG', 'ASTEROID', 'COMET', 'PLANET', 'GALAXY', 'NEBULA', 'SPACESHIP', 'SATELLITE', 'ROCKET', 'LABYRINTH', 'PUZZLE', 'RIDDLE', 'SECRET', 'MYSTERY', 'PHANTOM', 'SHADOW', 'SPIRIT', 'GOBLIN', 'PIXIE', 'PORTAL', 'WIZARD', 'MAGIC', 'SPELL', 'POTION', 'CAULDRON', 'DUNGEON', 'TOWER', 'CASTLE', 'FORTRESS', 'KINGDOM', 'EMPIRE', 'THRONE', 'DUNGEON', 'RAINBOW', 'VOLCANO', 'STORM', 'TORNADO', 'TREASURE', 'MAZE', 'SANDBOX', 'SNOWMAN', 'ROBOT', 'ALIEN', 'DRAGON', 'ISLAND', 'CIRCUS', 'FUNFAIR', 'TIGHTROPE', 'MIRROR', 'PORTAL', 'ICEBERG', 'ASTEROID', 'COMET', 'PLANET', 'GALAXY', 'NEBULA', 'SPACESHIP', 'SATELLITE', 'ROCKET', 'LABYRINTH', 'PUZZLE', 'RIDDLE', 'SECRET', 'MYSTERY', 'PHANTOM', 'SHADOW', 'SPIRIT', 'GOBLIN', 'PIXIE', 'PORTAL', 'WIZARD', 'MAGIC', 'SPELL', 'POTION', 'CAULDRON', 'DUNGEON', 'TOWER', 'CASTLE', 'FORTRESS', 'KINGDOM', 'EMPIRE', 'THRONE', 'DUNGEON']
};

const DEFAULT_ROUND_DURATION_MS = 90000; // 90 seconds default
const MAX_DRAWS_PER_PLAYER = 3;
const PRE_ROUND_DELAY_MS = 2000;   // "tally" time
const PRE_ROUND_COUNTDOWN_MS = 10000; // visible 5s countdown
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

    // Build fun stats for the end-of-game screen
    const playersArr = Object.values(room.players);

    let quickestGuesser = null;
    for (const p of playersArr) {
      if (typeof p.fastestGuessMs !== "number") continue;
      if (!quickestGuesser || p.fastestGuessMs < quickestGuesser.fastestGuessMs) {
        quickestGuesser = {
          name: p.name,
          fastestMs: p.fastestGuessMs
        };
      }
    }

    let keenGuesser = null;
    for (const p of playersArr) {
      const guesses = p.totalGuesses || 0;
      if (guesses <= 0) continue;
      if (!keenGuesser || guesses > keenGuesser.totalGuesses) {
        keenGuesser = {
          name: p.name,
          totalGuesses: guesses
        };
      }
    }

    let mostArtistic = null;
    for (const p of playersArr) {
      const strokes = p.strokes || 0;
      if (strokes <= 0) continue;
      if (!mostArtistic || strokes > mostArtistic.strokes) {
        mostArtistic = {
          name: p.name,
          strokes
        };
      }
    }

    let mostCorrect = null;
    for (const p of playersArr) {
      const correct = p.correctGuesses || 0;
      if (correct <= 0) continue;
      if (!mostCorrect || correct > mostCorrect.correctGuesses) {
        mostCorrect = {
          name: p.name,
          correctGuesses: correct
        };
      }
    }

    const funStats = {
      quickestGuesser,
      keenGuesser,
      mostArtistic,
      mostCorrect
    };

    io.to(roomCode).emit("game_over", {
      leaderboard,
      maxDraws: MAX_DRAWS_PER_PLAYER,
      funStats
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
      const base = existing || {};
      room.players[socket.id] = {
        name: finalName,
        score: base.score || 0,
        draws: base.draws || 0,
        totalGuesses: base.totalGuesses || 0,
        correctGuesses: base.correctGuesses || 0,
        fastestGuessMs: typeof base.fastestGuessMs === "number" ? base.fastestGuessMs : null,
        strokes: base.strokes || 0
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

    // Count every meaningful guess for "keen guesser"
    player.totalGuesses = (player.totalGuesses || 0) + 1;

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

      // Update score & per-player fun stats
      player.score = (player.score || 0) + score;
      player.correctGuesses = (player.correctGuesses || 0) + 1;
      if (player.fastestGuessMs == null || delta < player.fastestGuessMs) {
        player.fastestGuessMs = delta;
      }

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

    // Track strokes for "most artistic" fun stat
    const drawer = room.players[room.drawerId];
    if (drawer) {
      drawer.strokes = (drawer.strokes || 0) + 1;
    }

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
