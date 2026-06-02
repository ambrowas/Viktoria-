import json
import os

log_path = "/Users/elebi/.gemini/antigravity-ide/brain/83c52f3f-5320-4c8b-9531-bf5584558f1a/.system_generated/logs/transcript.jsonl"
if os.path.exists(log_path):
    with open(log_path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                data = json.loads(line)
                step = data.get("step_index")
                if step in [6449, 6497, 6519, 6527, 7008]:
                    print(f"================ STEP {step} ================")
                    tool_calls = data.get("tool_calls", [])
                    for tc in tool_calls:
                        args = tc.get("args", {})
                        print(f"Tool: {tc.get('name')}")
                        print(f"Description: {args.get('Description')}")
                        # Print chunks or target content
                        chunks = args.get("ReplacementChunks", [])
                        if chunks:
                            print(f"Num chunks: {len(chunks)}")
                            for idx, chunk in enumerate(chunks):
                                print(f"  Chunk {idx}: Start={chunk.get('StartLine')}, End={chunk.get('EndLine')}")
                                print("  TargetContent:")
                                print(chunk.get('TargetContent')[:300])
                                print("  ReplacementContent:")
                                print(chunk.get('ReplacementContent')[:600])
                                print("-" * 30)
                        else:
                            # Might be replace_file_content
                            print("  TargetContent:")
                            print(args.get('TargetContent', '')[:300])
                            print("  ReplacementContent:")
                            print(args.get('ReplacementContent', '')[:600])
            except Exception as e:
                pass
else:
    print("Log path does not exist")
