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

import pdfplumber
from pydantic import BaseModel

ORDERED_WEEKDAYS: list[str] = [
    "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica",
]
ORDERED_MEALS: list[str] = [
    "colazione", "spuntino mattutino", "pranzo", "spuntino pomeridiano", "cena",
]
TOTAL_CELLS = len(ORDERED_WEEKDAYS) * len(ORDERED_MEALS)

# Etichetta con cui ogni riga-pasto compare nella prima colonna della tabella.
# "spuntino" compare due volte (mattutino e pomeridiano): a distinguerle e'
# l'ordine delle righe.
_MEAL_ROW_LABELS: list[str] = ["colazione", "spuntino", "pranzo", "spuntino", "cena"]

# Token che devono comparire tutti nella riga di intestazione della tabella.
_HEADER_TOKENS: list[str] = [
    "pasto", "luned", "marted", "mercoled", "gioved", "venerd", "sabato", "domenica",
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


def _is_header_row(row: list[str]) -> bool:
    text = " ".join(_clean_text(cell) for cell in row if cell).lower()
    return all(token in text for token in _HEADER_TOKENS)


def _find_meal_table(pdf: pdfplumber.PDF) -> list[list[str]] | None:
    """Prima tabella la cui riga d'intestazione contiene 'Pasto' + i 7 giorni."""
    for page in pdf.pages:
        for table in page.extract_tables() or []:
            rows = [
                [_clean_text(cell) for cell in raw_row]
                for raw_row in table
                if any(_clean_text(cell) for cell in raw_row)
            ]
            if rows and _is_header_row(rows[0]) and len(rows) >= 6:
                return rows
    return None


def _parse_meal_plan(pdf: pdfplumber.PDF, warnings: list[str]) -> dict[str, dict[str, str]]:
    plan: dict[str, dict[str, str]] = {day: {} for day in ORDERED_WEEKDAYS}

    rows = _find_meal_table(pdf)
    if rows is None:
        warnings.append("Tabella settimanale non trovata nel PDF: compila la griglia a mano.")
        return plan

    data_rows = rows[1:]  # salta l'intestazione
    for meal_index, (meal_key, expected_label) in enumerate(zip(ORDERED_MEALS, _MEAL_ROW_LABELS)):
        if meal_index >= len(data_rows):
            warnings.append("Riga '" + meal_key + "' assente nella tabella del PDF.")
            continue

        row = data_rows[meal_index]
        found_label = (_clean_text(row[0]).lower() if row else "") or "vuota"
        if expected_label not in found_label:
            warnings.append(
                "Riga " + str(meal_index + 1) + ": attesa '" + expected_label
                + "', trovata '" + found_label + "'. Assegnata comunque a '" + meal_key + "'."
            )

        for day_key, cell in zip(ORDERED_WEEKDAYS, row[1:8]):
            content = _normalize_inline(cell)
            if content:
                plan[day_key][meal_key] = content

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
