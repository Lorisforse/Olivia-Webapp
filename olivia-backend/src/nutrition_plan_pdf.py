"""
Parsing di un piano dietetico da PDF verso la forma che si aspetta il bot.

Adattato da `olivia-chatbot/src/utils/nutrition_plan_pdf_parser.py` (che qui non
possiamo importare: e' un repo separato, sola lettura). Differenza voluta: il
parser del bot e' rigido e solleva `ValueError` alla prima cella mancante;
questo e' *tollerante* e restituisce quello che riesce a estrarre piu' una lista
di `warnings`, cosi' il medico corregge la griglia a mano nella webapp.

Le chiavi di `weekly_plan` sono quelle esatte lette dal bot
(`olivia-chatbot/src/models/enums.py`, enum `Weekday` e `MealType`):
`meal_plan[giorno][pasto]` -- vanno riprodotte alla lettera, accenti inclusi.
"""

from __future__ import annotations

import io
import re
import unicodedata

import pdfplumber
from pydantic import BaseModel

ORDERED_WEEKDAYS: list[str] = [
    "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica",
]
ORDERED_MEALS: list[str] = [
    "colazione", "spuntino mattutino", "pranzo", "spuntino pomeridiano", "cena",
]
TOTAL_CELLS = len(ORDERED_WEEKDAYS) * len(ORDERED_MEALS)

# Radice di ogni giorno come compare nell'intestazione della tabella, gia'
# normalizzata (minuscolo, senza accenti): copre "Lunedì", "LUNEDI", "lunedi'".
_WEEKDAY_STEMS: list[str] = [
    "luned", "marted", "mercoled", "gioved", "venerd", "sabato", "domenica",
]

# Glyph di elenco puntato usati nei PDF delle diete, da normalizzare a "-".
# Include il carattere Private-Use  con cui Word esporta i bullet Symbol.
_BULLET_CHARS: tuple[str, ...] = (
    "•", "●", "◦", "⁃", "∙", "·",
    "▪", "■", "‣", "",
)

MAX_PDF_BYTES = 10 * 1024 * 1024


class ParsedNutritionPlan(BaseModel):
    weekly_plan: dict[str, dict[str, str]]
    tips: list[str]
    warnings: list[str]


class PdfParsingError(Exception):
    """Il file non e' un PDF leggibile."""


def _clean_text(value: str | None) -> str:
    if not value:
        return ""
    value = value.replace("\r", "\n")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r" *\n *", "\n", value)
    value = re.sub(r"\n{2,}", "\n", value)
    return value.strip()


def _normalize_inline(value: str) -> str:
    value = _clean_text(value)
    value = re.sub(r"\s*\n\s*", " ", value)
    value = re.sub(r"\s{2,}", " ", value)
    return value.strip()


def _fold(value: str | None) -> str:
    """Minuscolo e senza accenti, per confrontare etichette scritte in modi diversi."""
    decomposed = unicodedata.normalize("NFKD", _normalize_inline(value or ""))
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch)).lower()


def _weekday_columns(row: list[str]) -> dict[int, str]:
    """Indice di colonna -> giorno, per le celle che contengono il nome di un giorno."""
    columns: dict[int, str] = {}
    for index, cell in enumerate(row):
        folded = _fold(cell)
        for day_key, stem in zip(ORDERED_WEEKDAYS, _WEEKDAY_STEMS):
            if stem in folded and day_key not in columns.values():
                columns[index] = day_key
                break
    return columns


def _find_meal_table(pdf: pdfplumber.PDF) -> tuple[list[list[str]], dict[int, str]] | None:
    """Prima tabella con una riga che nomina tutti e 7 i giorni, in celle distinte.
    Restituisce le righe dopo l'intestazione e la mappa colonna -> giorno.

    L'intestazione non deve per forza essere la prima riga (i PDF del centro hanno
    sopra la carta intestata dentro la stessa tabella) ne' contenere "Pasto"."""
    for page in pdf.pages:
        for table in page.extract_tables() or []:
            rows = [
                [_clean_text(cell) for cell in raw_row]
                for raw_row in table
                if any(_clean_text(cell) for cell in raw_row)
            ]
            for header_index, row in enumerate(rows):
                columns = _weekday_columns(row)
                if len(columns) == len(ORDERED_WEEKDAYS):
                    return rows[header_index + 1:], columns
    return None


def _meal_keys_for_label(label: str, seen_lunch: bool) -> list[str] | None:
    """Pasti a cui assegnare una riga, in base all'etichetta della prima colonna.

    - "spuntino mattutino" / "pomeridiano" (o "metà mattina", "merenda"): esplicito;
    - "spuntino" generico: mattutino se viene prima del pranzo, pomeridiano dopo;
    - "spuntini" al plurale: una riga sola per entrambi gli spuntini.
    None se l'etichetta non corrisponde a nessun pasto."""
    if "colazione" in label:
        return ["colazione"]
    if "pranzo" in label:
        return ["pranzo"]
    if "cena" in label:
        return ["cena"]
    if "spuntin" in label or "merend" in label:
        if "mattin" in label:
            return ["spuntino mattutino"]
        if "pomerid" in label or "merend" in label:
            return ["spuntino pomeridiano"]
        if "spuntini" in label:
            return ["spuntino mattutino", "spuntino pomeridiano"]
        return ["spuntino pomeridiano"] if seen_lunch else ["spuntino mattutino"]
    return None


def _parse_meal_plan(pdf: pdfplumber.PDF, warnings: list[str]) -> dict[str, dict[str, str]]:
    plan: dict[str, dict[str, str]] = {day: {} for day in ORDERED_WEEKDAYS}

    found = _find_meal_table(pdf)
    if found is None:
        warnings.append("Tabella settimanale non trovata nel PDF: compila la griglia a mano.")
        return plan

    data_rows, columns = found
    label_index = min(columns) - 1  # colonna delle etichette: subito prima dei giorni
    seen_lunch = False
    last_keys: list[str] | None = None

    for row in data_rows:
        label = _fold(row[label_index]) if label_index >= 0 and label_index < len(row) else ""
        cells = {day: _normalize_inline(row[i]) for i, day in columns.items() if i < len(row)}
        if not any(cells.values()):
            continue

        if label:
            keys = _meal_keys_for_label(label, seen_lunch)
            if keys is None:
                warnings.append("Riga '" + label + "' non riconosciuta come pasto: ignorata.")
                last_keys = None
                continue
        elif last_keys:
            # Riga senza etichetta: continuazione della cella del pasto sopra
            # (pdfplumber spezza cosi' le celle unite verticalmente).
            keys = last_keys
        else:
            continue

        if "pranzo" in keys:
            seen_lunch = True
        # Nota e avviso solo sulla riga con l'etichetta, non sulle sue continuazioni.
        shared = len(keys) > 1 and bool(label)
        if shared:
            warnings.append(
                "Una sola riga '" + label + "' per entrambi gli spuntini: copiata in "
                "spuntino mattutino e pomeridiano come totale della giornata, controlla."
            )

        for day_key, content in cells.items():
            if not content:
                continue
            if shared:
                content += " (in totale tra i due spuntini)"
            for meal_key in keys:
                previous = plan[day_key].get(meal_key)
                plan[day_key][meal_key] = previous + " " + content if previous and not label else content
        last_keys = keys

    for meal_key in ORDERED_MEALS:
        if not any(meal_key in meals for meals in plan.values()):
            warnings.append("Pasto '" + meal_key + "' assente nella tabella del PDF: compilalo a mano.")

    filled = sum(len(meals) for meals in plan.values())
    if filled == 0:
        warnings.append("Nessuna cella riconosciuta nella tabella: compila la griglia a mano.")
    elif filled < TOTAL_CELLS:
        warnings.append(
            "Estratte " + str(filled) + "/" + str(TOTAL_CELLS)
            + " celle: controlla e completa quelle mancanti."
        )

    return plan


def _extract_raw_text(pdf: pdfplumber.PDF) -> str:
    chunks: list[str] = []
    for page in pdf.pages:
        text = _clean_text(page.extract_text() or "")
        if text:
            chunks.append(text)
    return "\n".join(chunks).strip()


def _parse_tips(raw_text: str) -> list[str]:
    """Blocco tra i marcatori 'CONSIGLI ALIMENTARI' e 'SOSTITUZIONI'."""
    upper_text = raw_text.upper()

    start_idx = upper_text.find("CONSIGLI ALIMENTARI")
    if start_idx == -1:
        return []
    start_idx += len("CONSIGLI ALIMENTARI")

    end_idx = upper_text.find("SOSTITUZIONI", start_idx)
    block = raw_text[start_idx:end_idx] if end_idx != -1 else raw_text[start_idx:]
    block = block.strip()
    if not block:
        return []

    # Ogni glyph di elenco diventa un separatore non testuale ("\x00", assente
    # nel testo estratto): NON si puo' spezzare sul trattino, che compare dentro
    # i consigli ("1,5-2 litri", "extra-fondente", "30-45 minuti").
    for bullet in _BULLET_CHARS:
        block = block.replace(bullet, "\x00")

    items: list[str] = []
    for chunk in block.split("\x00"):
        item = re.sub(r"\s+", " ", chunk).strip()
        item = re.sub(r"[.;]+$", "", item).strip()
        if item:
            items.append(item)
    return items


def parse_nutrition_plan_pdf(data: bytes) -> ParsedNutritionPlan:
    """Estrae `weekly_plan` + `tips` dai bytes di un PDF. Non solleva sulle parti
    mancanti: le segnala in `warnings`. Solleva `PdfParsingError` solo se il file
    non e' un PDF apribile."""
    warnings: list[str] = []
    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            weekly_plan = _parse_meal_plan(pdf, warnings)
            tips = _parse_tips(_extract_raw_text(pdf))
    except Exception as exc:  # pdfminer solleva vari tipi su file corrotti
        raise PdfParsingError(str(exc)) from exc

    if not tips:
        warnings.append("Nessun consiglio alimentare riconosciuto: aggiungili a mano se servono.")

    return ParsedNutritionPlan(weekly_plan=weekly_plan, tips=tips, warnings=warnings)
