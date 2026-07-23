import os

def dump_dir(path, output_file):
    with open(output_file, 'w', encoding='utf-8') as out:
        if not os.path.exists(path):
            out.write(f"Directory {path} not found.\n")
            return
        for root, _, files in os.walk(path):
            if '__pycache__' in root: continue
            for file in files:
                filepath = os.path.join(root, file)
                out.write(f"\n\n### File: {filepath}\n\n```\n")
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        out.write(f.read())
                except Exception as e:
                    out.write(f"Error reading {filepath}: {e}")
                out.write("\n```\n")

dump_dir("apps/api/documentos", "dump_documentos.md")
dump_dir("apps/api/routers", "dump_routers.md")
dump_dir("apps/api/scripts", "dump_scripts.md")
dump_dir("supabase/migrations", "dump_migrations.md")
