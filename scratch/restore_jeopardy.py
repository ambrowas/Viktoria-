import json
import os
import re

log_path = "/Users/elebi/.gemini/antigravity-ide/brain/83c52f3f-5320-4c8b-9531-bf5584558f1a/.system_generated/logs/transcript.jsonl"
target_file = "/Users/elebi/Documents/Aplicaciones/Viktoria-/src/screens/games/JeopardyGame.tsx"

if not os.path.exists(log_path):
    print("Log path does not exist")
    exit(1)

with open(log_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Steps we want to extract
target_steps = [11228, 11230, 11234]

outputs = {}
for i, line in enumerate(lines):
    try:
        data = json.loads(line)
        step_idx = data.get("step_index")
        if step_idx in target_steps:
            # The tool output is in the next step
            if i + 1 < len(lines):
                resp_data = json.loads(lines[i+1])
                outputs[step_idx] = resp_data.get("content", "")
    except Exception as e:
        pass

print("Extracted step content lengths:", {k: len(v) for k, v in outputs.items()})

all_lines = {}
for step_idx in target_steps:
    content = outputs.get(step_idx, "")
    lines_list = content.split("\n")
    for line in lines_list:
        m = re.match(r"^(\d+):\s(.*)$", line)
        if m:
            ln = int(m.group(1))
            code = m.group(2)
            all_lines[ln] = code

max_line = max(all_lines.keys()) if all_lines else 0
print(f"Reconstructed line count: {max_line}")

gaps = [i for i in range(1, max_line + 1) if i not in all_lines]
if gaps:
    print("Gaps found:", gaps)
    exit(1)

reconstructed_content = "\n".join(all_lines[i] for i in range(1, max_line + 1))
with open(target_file, "w", encoding="utf-8") as f:
    f.write(reconstructed_content)

print(f"SUCCESS: Restored {target_file} with {max_line} lines.")
