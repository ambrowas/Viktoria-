import json
import os

paths = [
    "/Users/elebi/Library/Application Support/Electron/games/africa-day-d258e2a3/game.json",
    "/Users/elebi/Library/Application Support/Electron/games/africa-day-trivia-challenge-round-ii-76742e4d/game.json",
    "/Users/elebi/Library/Application Support/Electron/games/africa-day-final-round-dd0debb7/game.json"
]

games = []
for p in paths:
    with open(p, "r", encoding="utf-8") as f:
        g = json.load(f)
        games.append(g)

# Convert each game to ts literal
def format_game(g):
    # Convert types
    t = g["type"]
    if t == "JEOPARDY":
        type_str = "GameType.JEOPARDY"
    elif t == "SMART_AZZ":
        type_str = "GameType.SMART_AZZ"
    else:
        type_str = f"GameType.{t}"
    
    # We will dump to json but replace "type": "JEOPARDY" / "type": "SMART_AZZ" with the unquoted enum
    # To do this safely, we can serialize the object, and then do replacements, or format manually.
    # Let's do serialization, then replace specific strings.
    dump = json.dumps(g, indent=2, ensure_ascii=False)
    dump = dump.replace('"type": "JEOPARDY"', f'"type": {type_str}')
    dump = dump.replace('"type": "SMART_AZZ"', f'"type": {type_str}')
    return dump

ts_content = 'import { Game, GameType } from "@/types";\n\n'
ts_content += 'export const fallbackGames: Game[] = [\n'
ts_content += ',\n'.join(format_game(g) for g in games)
ts_content += '\n];\n'

output_path = "/Users/elebi/Documents/Aplicaciones/Viktoria-/src/data/fallbackGames.ts"
with open(output_path, "w", encoding="utf-8") as f:
    f.write(ts_content)

print("Successfully converted and updated fallbackGames.ts!")
