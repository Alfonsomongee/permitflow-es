import subprocess
import sys

commands = [
    ['git', 'show', 'HEAD:apps/web/components/plan-tramitacion/PlanTramitacionView.tsx'],
    ['git', 'show', 'HEAD:apps/web/components/plan-tramitacion/TramiteCard.tsx'],
    ['git', 'show', 'HEAD:apps/web/components/plan-tramitacion/ResumenPanel.tsx'],
    ['git', 'show', 'HEAD:apps/web/components/plan-tramitacion/PlataformaBadge.tsx'],
    ['git', 'show', 'HEAD:apps/web/components/plan-tramitacion/DocumentosPanel.tsx'],
    ['git', 'show', 'HEAD:apps/web/components/plan-tramitacion/ValidadorPanel.tsx'],
    ['git', 'show', 'HEAD:apps/web/components/plan-tramitacion/TimelinePlan.tsx'],
    ['git', 'show', 'HEAD:apps/web/app/globals.css'],
    ['git', 'show', 'HEAD:apps/web/tailwind.config.ts']
]

for cmd in commands:
    print(f"--- Ejecutando: {' '.join(cmd)} ---")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=False, encoding='utf-8', errors='replace')
        if result.returncode == 0:
            print(result.stdout)
        else:
            print(f"ERROR:\n{result.stderr}")
    except Exception as e:
        print(f"EXCEPTION:\n{str(e)}")
    print("\n" + "="*50 + "\n")
