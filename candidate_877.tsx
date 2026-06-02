Created At: 2026-05-30T18:39:18Z
Completed At: 2026-05-30T18:39:18Z
File Path: `file:///Users/elebi/Documents/Aplicaciones/Viktoria-/src/screens/GameRouter.tsx`
Total Lines: 183
Total Bytes: 5659
Showing lines 1 to 183
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
<truncated 2914 bytes>
d-lg text-center max-w-md">
126:           <h2 className="text-2xl font-bold mb-4">Game Type Not Supported Yet</h2>
127:           <p className="text-gray-600 mb-6">
128:             The {(game as any)?.type === 'JEOPARDY' ? 'QuizBoard' : (game as any)?.type === 'SMART_AZZ' ? 'Face Off' : (game as any)?.type?.toLowerCase().replace(/_/g, " ")} game
129:             player is still under development.
130:           </p>
131:           <button
132:             onClick={() => onExit()}
133:             className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
134:           >
135:             Back to Library
136:           </button>
137:         </div>
138:       </div>
139:     );
140:   }
141: 
142:   // 🧠 Handle Memory game separately (needs grid size)
143:   if (game.type === GameType.MEMORY) {
144:     const gridSize =
145:       (game as MemoryGameType).gridSize === "Small"
146:         ? 16
147:         : (game as MemoryGameType).gridSize === "Medium"
148:           ? 20
149:           : 28;
150: 
151:     return (
152:       <Component
153:         tiles={(game as MemoryGameType).tiles || []}
154:         gridSize={gridSize}
155:         onExit={onExit}
156:       />
157:     );
158:   }
159: 
160:   // ✅ Default for all other games (including Bingo)
161:   return (
162:     <Component
163:       game={game as any}
164:       round={(game as any).round} // For Bingo 
165:       teams={teams}
166:       teamScores={teamScores}
167:       onScoreChange={onScoreChange}
168:       onExit={onExit}
169:       hostControl={hostControl}
170:       playerControl={playerControl}
171:       isFinalRound={isFinalRound}
172:       themeMusicPath={themeMusicPath}
173:       allTeams={allTeams}
174:       organizers={organizers}
175:       winnerTitle={winnerTitle}
176:       thankYouMessage={thankYouMessage}
177:       isObserveOnly={isObserveOnly}
178:     />
179:   );
180: };
181: 
182: export default GameRouter;
183: 
The above content shows the entire, complete file contents of the requested file.
