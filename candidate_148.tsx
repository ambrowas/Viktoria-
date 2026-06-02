Created At: 2026-05-30T16:43:23Z
Completed At: 2026-05-30T16:43:23Z
File Path: `file:///Users/elebi/Documents/Aplicaciones/Viktoria-/src/screens/GameRouter.tsx`
Total Lines: 180
Total Bytes: 5571
Showing lines 1 to 180
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
1: import React, { useEffect, useState } from "react";
2: import {
3:   Game,
4:   GameType,
5:   HangmanGame,
6:   MemoryGame as MemoryGameType,
7: } from "@/types";
8: 
9: // --- Type-only imports to avoid name conflicts ---
10: import type { WheelOfFortuneGame as WheelOfFortuneGameType } from "@/types";
11: 
12: // --- Game components ---
13: import HangmanGameWrapper from "./games/HangmanGame";
14: import MemoryGame from "./games/MemoryGame";
15: import RoscoGameWrapper from "./games/RoscoGame";
16: import FamilyFeudGameScreen from "./games/FamilyFeudGame";
17: import JeopardyGameScreen from "./games/JeopardyGame";
18: import PyramidGameScreen from "./games/PyramidGame";
19: import ChainReactionGameScreen from "./games/ChainReactionGame";
20: import DefinitionsGameWrapper from "./games/DefinitionsGameWrapper";
21: import PriceIsRightGame from "./games/PriceIsRightGame";
22: import WheelOfFortuneGame from "./games/WheelOfFortuneGame";
23: import LotteryGame from "./games/LotteryGame";
24: import BingoGame from "./games/BingoGame"; // ✅ NEW
25: import SmartAzzGameScreen from "./games/SmartAzzGame";
26: 
27: // --- Sounds ---
28: import { transitionSound, magicalSound, stopAllSounds } from "@/utils/sound";
29: import { useLanguage } from "@/context/LanguageContext";
30: 
31: // --- Game Map ---
32: const gameComponents: Record<GameType, React.FC<any>> = {
33:   [GameType.HANGMAN]: HangmanGameWrapper,
34:   [GameType.MEMORY]: MemoryGame,
35:   [GameType.ROSCO]: RoscoGameWrapper,
36:   [GameType.FAMILY_FEUD]: FamilyFeudGameScreen,
37:   [GameType.CHAIN_REACTIO
<truncated 2811 bytes>
      <div className="bg-white p-8 rounded-lg text-center max-w-md">
124:           <h2 className="text-2xl font-bold mb-4">Game Type Not Supported Yet</h2>
125:           <p className="text-gray-600 mb-6">
126:             The {(game as any)?.type === 'JEOPARDY' ? 'QuizBoard' : (game as any)?.type === 'SMART_AZZ' ? 'Face Off' : (game as any)?.type?.toLowerCase().replace(/_/g, " ")} game
127:             player is still under development.
128:           </p>
129:           <button
130:             onClick={() => onExit()}
131:             className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
132:           >
133:             Back to Library
134:           </button>
135:         </div>
136:       </div>
137:     );
138:   }
139: 
140:   // 🧠 Handle Memory game separately (needs grid size)
141:   if (game.type === GameType.MEMORY) {
142:     const gridSize =
143:       (game as MemoryGameType).gridSize === "Small"
144:         ? 16
145:         : (game as MemoryGameType).gridSize === "Medium"
146:           ? 20
147:           : 28;
148: 
149:     return (
150:       <Component
151:         tiles={(game as MemoryGameType).tiles || []}
152:         gridSize={gridSize}
153:         onExit={onExit}
154:       />
155:     );
156:   }
157: 
158:   // ✅ Default for all other games (including Bingo)
159:   return (
160:     <Component
161:       game={game as any}
162:       round={(game as any).round} // For Bingo 
163:       teams={teams}
164:       teamScores={teamScores}
165:       onScoreChange={onScoreChange}
166:       onExit={onExit}
167:       hostControl={hostControl}
168:       playerControl={playerControl}
169:       isFinalRound={isFinalRound}
170:       themeMusicPath={themeMusicPath}
171:       allTeams={allTeams}
172:       organizers={organizers}
173:       winnerTitle={winnerTitle}
174:       thankYouMessage={thankYouMessage}
175:     />
176:   );
177: };
178: 
179: export default GameRouter;
180: 
The above content shows the entire, complete file contents of the requested file.
