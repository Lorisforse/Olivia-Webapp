"""
Genera il PDF della dieta da far importare al partecipante nel compito 3 dei test
di usabilita' ("Importazione di una dieta" per la signora Lucia Ferri).

Il PDF e' costruito per essere letto correttamente dal parser reale
(`src/nutrition_plan_pdf.py`: tabella con header "Pasto" + i 7 giorni, poi un
blocco "CONSIGLI ALIMENTARI"). La cella di sabato sera e' lasciata VUOTA di
proposito, cosi' l'importazione produce l'avviso "cella non riconosciuta" che il
partecipante deve notare e completare a mano: e' lo stesso comportamento descritto
nello Scenario 2 del Capitolo 5, utile da mostrare dal vivo.

Run (una tantum, non va rilanciato a ogni reset):
    cd "Olivia webapp/Olivia-Webapp-Codice/olivia-backend"
    python generate_dieta_test_pdf.py [percorso_output.pdf]

Default: salva "dieta_lucia_ferri.pdf" nella cartella corrente. Copialo poi sul
desktop del portatile usato per i test.
"""
import sys

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

DAYS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"]
MEALS = ["Colazione", "Spuntino mattutino", "Pranzo", "Spuntino pomeridiano", "Cena"]

PLAN = {
    "Colazione": [
        "Latte p.s. 200ml, fette biscottate 4", "Yogurt greco, fiocchi d'avena 40g",
        "Latte p.s. 200ml, fette biscottate 4", "Yogurt greco, fiocchi d'avena 40g",
        "Latte p.s. 200ml, fette biscottate 4", "Spremuta, cornetto integrale",
        "Yogurt greco, fiocchi d'avena 40g",
    ],
    "Spuntino mattutino": ["Un frutto di stagione"] * 7,
    "Pranzo": [
        "Pasta integrale 80g con legumi", "Riso 70g con verdure e pollo 100g",
        "Pasta integrale 80g al pomodoro", "Farro 70g con verdure",
        "Pasta integrale 80g con legumi", "Pizza margherita (uscita)",
        "Riso 70g con verdure e pesce 120g",
    ],
    "Spuntino pomeridiano": ["Yogurt bianco 125g"] * 7,
    "Cena": [
        "Pesce azzurro 150g, verdura, pane 50g", "Petto di pollo 150g, verdura, pane 50g",
        "Uova 2, verdura, pane 50g", "Pesce azzurro 150g, verdura, pane 50g",
        "Legumi 200g, verdura, pane 50g", "",  # sabato: lasciata vuota di proposito
        "Petto di pollo 150g, verdura, pane 50g",
    ],
}

TIPS = [
    "Bere almeno 1,5-2 litri di acqua al giorno.",
    "Preferire condimenti a crudo, olio extra-vergine d'oliva a piacere.",
    "Limitare il consumo di sale aggiunto e di alimenti conservati.",
    "Attività fisica leggera 30-45 minuti al giorno, quando possibile.",
]

SUBSTITUTIONS = "Pasta - Riso - Farro a parità di grammatura. Carne bianca - Pesce magro - Legumi (raddoppiare la quantità)."


def build(out_path: str):
    doc = SimpleDocTemplate(out_path, pagesize=A4,
                             leftMargin=1.5 * cm, rightMargin=1.5 * cm,
                             topMargin=1.5 * cm, bottomMargin=1.5 * cm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title2", parent=styles["Title"], fontSize=16)
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], spaceBefore=14)
    body = ParagraphStyle("Body2", parent=styles["BodyText"], fontSize=9, leading=11)
    cell_style = ParagraphStyle("Cell", parent=styles["BodyText"], fontSize=7.5, leading=9)

    story = [
        Paragraph("Piano alimentare - Mediterranea 1600 kcal, fase 1", title_style),
        Paragraph("Paziente: Lucia Ferri", styles["Normal"]),
        Spacer(1, 0.6 * cm),
    ]

    header = ["Pasto"] + DAYS
    rows = [header]
    for meal in MEALS:
        row = [Paragraph(meal, cell_style)]
        for i in range(7):
            text = PLAN[meal][i]
            row.append(Paragraph(text, cell_style) if text else "")
        rows.append(row)

    col_widths = [2.6 * cm] + [2.35 * cm] * 7
    table = Table(rows, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.6, colors.black),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8e8e8")),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
    ]))
    story.append(table)

    story.append(Paragraph("CONSIGLI ALIMENTARI", h2))
    for t in TIPS:
        # Nota: "·" (middle dot) e non "•" (bullet) - il bullet Unicode
        # standard non ha una mappa ToUnicode corretta nei font base-14 di
        # reportlab e pdfplumber lo estrarrebbe come "(cid:127)", non riconosciuto
        # dal parser reale (_BULLET_CHARS in src/nutrition_plan_pdf.py).
        story.append(Paragraph("· " + t, body))

    story.append(Paragraph("SOSTITUZIONI", h2))
    story.append(Paragraph(SUBSTITUTIONS, body))

    doc.build(story)
    print(f"Creato {out_path}")
    print("Nota: la cella 'Sabato / Cena' e' lasciata vuota apposta, per l'avviso di importazione parziale.")


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "dieta_lucia_ferri.pdf"
    build(out)
