import json
import os

log_path = "/Users/elebi/.gemini/antigravity-ide/brain/83c52f3f-5320-4c8b-9531-bf5584558f1a/.system_generated/logs/transcript.jsonl"
if os.path.exists(log_path):
    with open(log_path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                data = json.loads(line)
                # Look for tool calls to replace_file_content, multi_replace_file_content, write_to_file
                tool_calls = data.get("tool_calls", [])
                if not tool_calls:
                    # Let us check if there are tool_calls in system or model steps
                    # Actually tool_calls is in the model response
                    continue
                for tc in tool_calls:
                    args = tc.get("args", {})
                    target = args.get("TargetFile", "")
                    if "ShowManager.tsx" in target:
                        print(f"[{data.get('step_index')}] {tc.get('name')} to {target}")
                        desc = args.get("Description", "")
                        if desc:
                            print(f"  Description: {desc}")
            except Exception as e:
                pass
else:
    print("Log path does not exist")
