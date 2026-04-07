// src/types.ts

// -----------------------------
// Game Types
// -----------------------------
export enum GameType {
  MEMORY = "MEMORY",
  HANGMAN = "HANGMAN",
  DEFINITIONS = "DEFINITIONS",
  JEOPARDY = "JEOPARDY",
  FAMILY_FEUD = "FAMILY_FEUD",
  CHAIN_REACTION = "CHAIN_REACTION",
  PYRAMID = "PYRAMID",
  ROSCO = "ROSCO",
  PRICE_IS_RIGHT = "PRICE_IS_RIGHT",
  WHEEL_OF_FORTUNE = "WHEEL_OF_FORTUNE",
  LOTTERY = "LOTTERY",
  BINGO = "BINGO", // ✅ NEW
}


// Jeopardy point values
export const JEOPARDY_POINT_VALUES = [100, 200, 300, 400, 500] as const;
export type JeopardyPointValue = (typeof JEOPARDY_POINT_VALUES)[number];

// -----------------------------
// Shared Base
// -----------------------------
export interface GameBase {
  id: string;
  name: string;
  type: GameType; // ✅ Keep this broad
  description: string;
  createdAt: string;
  slug?: string;
}
// -----------------------------
// Pyramid Game
// -----------------------------
export interface PyramidQuestion {
  id: string;
  level: number;
  value: number;
  question: string;
  options: { a: string; b: string; c: string };
  correct: "a" | "b" | "c";
}

export interface PyramidGame extends GameBase {
  type: GameType.PYRAMID;
  metadata: {
    questions: PyramidQuestion[];
  };
}


// -----------------------------
// Chain Reaction (replaces Trivia)
// -----------------------------
export interface ChainQuestion {
  id: string;
  prompt: string;           // The actual question/clue
  answer: string;           // Expected answer
  linkHint?: string;        // Optional hint for the connection
  points: number;           // e.g., ascending per link
}

export interface ChainRound {
  id: string;
  theme: string;            // Round theme/topic
  chain: ChainQuestion[];   // Ordered questions; each depends on prior
  timePerQuestion?: number; // default 20s
}

export interface ChainReactionGame extends GameBase {
  type: GameType.CHAIN_REACTION;
  title: string;
  rounds: ChainRound[];
}

// -----------------------------
// Jeopardy
// -----------------------------
export interface JeopardyQuestion {
  id: string;
  question: string;
  correctAnswer: string;
  points: JeopardyPointValue;
  type?: "DIRECT" | "MULTIPLE_CHOICE";
  options?: string[];
  explanation?: string;
  explanationPlacement?: "WITH_QUESTION" | "WITH_ANSWER";
  questionMediaUrl?: string;
  questionMediaType?: "IMAGE" | "AUDIO" | "VIDEO";
  answerMediaUrl?: string;
  answerMediaType?: "IMAGE" | "AUDIO" | "VIDEO";
}

export interface JeopardyCategory {
  id: string;
  name: string;
  questions: JeopardyQuestion[];
}

export enum JeopardyTurnMode {
  CONTINUE_ON_CORRECT = "CONTINUE_ON_CORRECT",
  ALTERNATE_AFTER_QUESTION = "ALTERNATE_AFTER_QUESTION",
}

export interface JeopardyGame extends GameBase {
  type: GameType.JEOPARDY;
  categories: JeopardyCategory[];
  teams: [string, string];
  turnMode?: JeopardyTurnMode;
  allowRebounds?: boolean;
  cluesPerTeam?: number;
}

// -----------------------------
// Family Feud
// -----------------------------
export interface FamilyFeudAnswer {
  text: string;
  points: number;
}

export interface FamilyFeudRound {
  id: string;
  category: string;
  question: string;
  surveySize: number;
  answers: FamilyFeudAnswer[];
}

export interface FamilyFeudGame extends GameBase {
  type: GameType.FAMILY_FEUD;
  rounds: FamilyFeudRound[];
}

// -----------------------------
// Memory
// -----------------------------
export interface MemoryTile {
  id: string;
  matchId: string;
  content: string; // emoji or image URL
  sourceType: "AI" | "UPLOAD";
}

export interface MemoryGame extends GameBase {
  type: GameType.MEMORY;
  gridSize: "Small" | "Medium" | "Large";
  tileSource?: "AI" | "UPLOAD";
  tiles: MemoryTile[];
}

// -----------------------------
// Hangman
// -----------------------------
export interface HangmanPhrase {
  id: string;
  text: string;
  category: string;
  hint?: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Custom";
}

export interface HangmanGame extends GameBase {
  type: GameType.HANGMAN;
  phrases: HangmanPhrase[];
  difficulty: "Easy" | "Medium" | "Hard" | "Custom";
  maxAttempts: number;
  hasTimeLimit?: boolean; // ✅ Added optional time limit toggle
  timeLimit?: number;     // ✅ Added optional time limit in seconds
  language?: "en" | "es"; // ✅ Added optional language field
}


// -----------------------------
// Rosco
// -----------------------------
export interface RoscoClue {
  letter: string;
  definition: string;
  answer: string;
}

export interface RoscoGame extends GameBase {
  type: GameType.ROSCO;
  clues: RoscoClue[];
}

// -----------------------------
// Definitions
// -----------------------------
export interface DefinitionClue {
  id: string;
  word: string;
  definition: string;
}

export interface DefinitionsGame extends GameBase {
  type: GameType.DEFINITIONS;
  clues: DefinitionClue[];
}
// -----------------------------
// The Price Is Right
// -----------------------------
export interface PriceItem {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  actualPrice: number;
}

export interface PriceIsRightGame extends GameBase {
  type: GameType.PRICE_IS_RIGHT;
  items: PriceItem[];
}

// -----------------------------
// Wheel of Fortune
// -----------------------------
export interface WheelRound {
  id: string;
  category: string;
  puzzle: string;
  prizeValue: number;
  revealed?: Set<string>;
}


export interface WheelOfFortuneGame extends GameBase {
  type: GameType.WHEEL_OF_FORTUNE;
  rounds: WheelRound[];
}

// -----------------------------
// Lottery
// -----------------------------

export interface LotteryDraw {
  id: string;
  drawNumbers: (string | number)[];
  date: string;
}

export interface LotteryTicket {
  id: string;
  numbers: (string | number)[];
  owner?: string;
  isWinner?: boolean;
}

export interface LotteryGame extends GameBase {
  type: GameType.LOTTERY;
  mode: "TRADITIONAL" | "CONCEPTUAL";
  draw: LotteryDraw | null;
  tickets: LotteryTicket[];
}
// -----------------------------
// Bingo
// -----------------------------
export interface BingoCard {
  id: string;
  grid: (number | string)[][];   // 5x5 matrix of numbers or words
  hasFreeSpace?: boolean;  // if true, center is free
}

export interface BingoRound {
  id: string;
  topic: string;
  mode: "CLASSIC" | "90BALL" | "CONCEPTUAL";
  cards: BingoCard[];
  createdAt: string;
}

export interface BingoGame extends GameBase {
  type: GameType.BINGO;
  round: BingoRound | null;
}


// -----------------------------
// ✅ Unified Game Union
// -----------------------------
export type Game =
  | ChainReactionGame
  | JeopardyGame
  | FamilyFeudGame
  | MemoryGame
  | HangmanGame
  | RoscoGame
  | PyramidGame
  | DefinitionsGame
  | PriceIsRightGame
  | WheelOfFortuneGame
  | LotteryGame
  | BingoGame; // ✅ NEW

// -----------------------------
// Shows & Teams
// -----------------------------
export interface Player {
  id: string;
  name: string;
  role?: string;
}

export interface Team {
  id: string;
  name: string;
  score: number;
  color?: string;
  emoji?: string;
  players: Player[];
}

export interface ShowSettings {
  numTeams: number;
  playersPerTeam: number;
  totalRounds: number;
  notes?: string;
  introMusic?: "viktoria" | "show_don_start";
  hostControl?: "ipad" | "manual";
  playerControl?: "ipad" | "manual";
  language?: "en" | "es";
}

export interface ShowRound {
  id: string;
  name: string;
  theme?: string;
  order: number;
  gameIds: string[];
  notes?: string;
}

export interface Show {
  id: string;
  name: string;
  description?: string;
  settings: ShowSettings;
  teams: Team[];
  rounds: ShowRound[];
  createdAt: string;
  updatedAt?: string;
}
export interface DefinitionClue {
  id: string;
  word: string;
  definition: string;
  valid?: boolean; // optional field for editor checks
}


// -----------------------------
// Screens
// -----------------------------
export type Screen =
  | "dashboard"
  | "library"
  | "creator"
  | "shows"
  | "play";

// ✅ Used for draft states in GameCreator
export interface GameLite {
  id?: string;
  name?: string;
  description?: string;
  createdAt?: string;
  type?: GameType; // not restricted
  [key: string]: any;
}
// ============================
// GenericGame - for GameCreator draft flexibility
// ============================
export interface GenericGame {
  id?: string;
  name?: string;
  description?: string;
  createdAt?: string;
  type?: GameType; // allow any enum value
  [key: string]: any;
}
