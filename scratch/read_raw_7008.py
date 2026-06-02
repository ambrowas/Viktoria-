with open("/Users/elebi/Documents/Aplicaciones/Viktoria-/scratch/step_7008.json", "r", encoding="utf-8") as f:
    text = f.read()

print("Length of file:", len(text))
print("First 2000 chars:")
print(text[:2000])
