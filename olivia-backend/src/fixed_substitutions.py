import json
from pathlib import Path

# Blocco di regole di sostituzione alimentare identico per tutti i pazienti,
# estratto da olivia-chatbot/scripts/add_user.py (SUBSTITUTIONS): e' cosi'
# che il bot vuole il campo "substitutions" di un piano (nutrition-plans),
# non una stringa libera. Vedi PIANO_MODIFICHE.md, punto 10, per il contesto.
_PATH = Path(__file__).parent / "data" / "fixed_substitutions.json"
FIXED_SUBSTITUTIONS: dict = json.loads(_PATH.read_text(encoding="utf-8"))
