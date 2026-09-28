# -*- coding: utf-8 -*-
"""
Rigenera i materiali stampabili per i test di usabilita' di Olivia:
- Scenari_di_test.pdf (foglio del moderatore, 8 compiti)
- Foglio_osservazione.pdf (uno per soggetto, 8 compiti + colloquio finale)
- Domande_per_incontro.pdf (lista di domande per l'incontro di organizzazione)

Nessuno script generatore originale esisteva nel repo per i primi due file
(erano stati creati a mano/altrove): questo li ricostruisce da zero. Il
compito 6 originale (cambio dieta + sospensione) e' stato separato in due
compiti distinti (6: cambio dieta, 7: sospensione e riattivazione), e il
vecchio 7 (agenda) e' ora l'8deg.
"""
import os
import sys

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT

GREEN = colors.HexColor("#2F5233")
LIGHTGREY = colors.HexColor("#bfbfbf")

TASKS = [
    ("Accesso e orientamento",
     "«Hai ricevuto le credenziali. Accedi alla piattaforma e dimmi quanti pazienti sono attivi in "
     "questo momento e quanti sono senza dieta. Poi cerca la paziente Elisa Marchetti e dimmi qual è "
     "il suo obiettivo.»"),
    ("Nuovo paziente",
     "«Hai appena visitato la signora Lucia Ferri, nata il 12/05/1972, di Bari, impiegata, che si "
     "sveglia alle 6:30. Pesa 86 kg ed è alta 165 cm; l'obiettivo è ridurre la pressione arteriosa. "
     "Registrala e fai in modo di poterle consegnare il codice per collegarsi al bot.»"),
    ("Importazione di una dieta",
     "«Hai preparato il piano alimentare della signora Ferri in PDF (il file è sul desktop). Caricalo "
     "in piattaforma, controlla che sia stato letto correttamente, chiamalo «Mediterranea 1600, fase "
     "1» e assegnalo alla signora Ferri.»"),
    ("Pazienti da seguire",
     "«È lunedì mattina. Individua un paziente che nell'ultima settimana ha seguito poco la dieta e "
     "scopri, dalle sue registrazioni, quali motivi ha dato.»"),
    ("Andamento prima della visita",
     "«Il signor Marco Neri ha la visita di controllo tra un'ora. Verifica come è andato il suo peso "
     "nell'ultimo mese e se beve abbastanza.»"),
    ("Cambio di dieta",
     "«Il piano «Mediterranea 1600, fase 1» va aggiornato: il pranzo del sabato diventa «pesce al "
     "forno con verdure». Fai la modifica.»"),
    ("Sospensione e riattivazione",
     "«Il paziente Andrea Vitale ha sospeso il percorso per un mese: fai in modo che il bot non lo "
     "contatti, senza perdere i suoi dati. Dopo un ripensamento, decide di riprendere subito: "
     "riattivalo.»"),
    ("Appuntamento e agenda",
     "«Il signor Marco Neri, dopo la visita di controllo, ti chiede un appuntamento di richiamo tra "
     "tre settimane, alle 10:00, della durata di 30 minuti: fissalo in agenda.»"),
]


def styles():
    ss = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("T", parent=ss["Title"], fontSize=16, spaceAfter=4),
        "sub": ParagraphStyle("Sub", parent=ss["Normal"], fontSize=9.5, textColor=colors.black,
                               spaceAfter=6),
        "note": ParagraphStyle("Note", parent=ss["Normal"], fontSize=9, leading=12, spaceAfter=10),
        "fields": ParagraphStyle("Fields", parent=ss["Normal"], fontSize=9.5, spaceAfter=10),
        "body": ParagraphStyle("Body", parent=ss["BodyText"], fontSize=9.5, leading=13),
        "h2": ParagraphStyle("H2", parent=ss["Heading2"], fontSize=11, spaceBefore=10, spaceAfter=4),
        "q": ParagraphStyle("Q", parent=ss["Normal"], fontSize=9.5, leading=13, spaceAfter=4,
                             alignment=TA_LEFT),
    }


def header_bar(text, width):
    t = Table([[text]], colWidths=[width])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GREEN),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


def ruled_lines(width, n=3):
    rows = [[""] for _ in range(n)]
    t = Table(rows, colWidths=[width], rowHeights=[0.55 * cm] * n)
    t.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, LIGHTGREY),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def build_scenari(out_path):
    st = styles()
    doc = SimpleDocTemplate(out_path, pagesize=A4, leftMargin=1.8 * cm, rightMargin=1.8 * cm,
                             topMargin=1.6 * cm, bottomMargin=1.6 * cm)
    width = doc.width
    story = [
        Paragraph("Scenari di test – Olivia webapp", st["title"]),
        Paragraph("Pensa ad alta voce mentre esegui ciascun compito.", st["sub"]),
    ]
    for i, (title, text) in enumerate(TASKS, start=1):
        block = [
            header_bar(f"Compito {i} – {title}", width),
            Spacer(1, 0.15 * cm),
            Paragraph(f"<i>{text}</i>", st["body"]),
            Spacer(1, 0.35 * cm),
        ]
        story.append(KeepTogether(block))
    doc.build(story)
    print(f"Creato {out_path}")


def build_osservazione(out_path):
    st = styles()
    doc = SimpleDocTemplate(out_path, pagesize=A4, leftMargin=1.8 * cm, rightMargin=1.8 * cm,
                             topMargin=1.6 * cm, bottomMargin=1.6 * cm)
    width = doc.width
    story = [
        Paragraph("Foglio di osservazione – Olivia webapp", st["title"]),
        Paragraph("Un foglio per ciascun partecipante, da compilare durante la sessione", st["sub"]),
        Paragraph("Partecipante n. ____________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
                   "Data: ____________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
                   "Osservatore: ____________", st["fields"]),
    ]
    for i, (title, _text) in enumerate(TASKS, start=1):
        esito = Paragraph(
            "<b>Esito:</b> [ ] Autonomo &nbsp;&nbsp;&nbsp; [ ] Con aiuto &nbsp;&nbsp;&nbsp; "
            "[ ] Non completato &nbsp;&nbsp;&nbsp;&nbsp; <b>Tempo:</b> _______ min", st["body"])
        block = [
            header_bar(f"Compito {i} – {title}", width),
            Spacer(1, 0.2 * cm),
            esito,
            Spacer(1, 0.1 * cm),
            Paragraph("<b>Errori / osservazioni / citazioni:</b>", st["body"]),
            Spacer(1, 0.1 * cm),
            ruled_lines(width, n=3),
            Spacer(1, 0.4 * cm),
        ]
        story.append(KeepTogether(block))

    story.append(Paragraph("Colloquio finale", st["h2"]))
    story.append(Paragraph("Il risultato è quello che si aspettava?", st["q"]))
    story.append(ruled_lines(width, n=2))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "Nella pratica reale, con i suoi pazienti, cambierebbe qualcosa di come ha appena lavorato?",
        st["q"]))
    story.append(ruled_lines(width, n=2))

    doc.build(story)
    print(f"Creato {out_path}")


def build_domande(out_path):
    st = styles()
    doc = SimpleDocTemplate(out_path, pagesize=A4, leftMargin=1.8 * cm, rightMargin=1.8 * cm,
                             topMargin=1.6 * cm, bottomMargin=1.6 * cm)
    width = doc.width
    story = [
        Paragraph("Domande per l'incontro – organizzazione test di usabilità", st["title"]),
        Paragraph(
            "Da usare per chiudere il profilo dei partecipanti per il Capitolo 7. Nella tesi le 3 "
            "persone restano anonime: identificale come P1 / P2 / P3, mai per nome.",
            st["sub"]),
        Spacer(1, 0.2 * cm),
    ]

    sections = [
        ("Per ciascuna delle 3 persone (P1 / P2 / P3)", [
            "Ruolo esatto (nutrizionista, dottoressa, altro)",
            "Da quanti anni svolgi questo ruolo",
            "Che rapporto hai con il reclutamento pazienti per Olivia: fai tu le visite, "
            "segui da remoto, altro?",
            "Usi già altri strumenti digitali/gestionali nel lavoro quotidiano? Quali "
            "(cartelle cliniche elettroniche, altre app)?",
            "Useresti tu stessa la piattaforma in pratica, o è più un'altra figura a usarla?",
        ]),
    ]

    for heading, items in sections:
        story.append(Paragraph(heading, st["h2"]))
        for it in items:
            story.append(Paragraph(it, st["q"]))
            story.append(ruled_lines(width, n=1))
            story.append(Spacer(1, 0.15 * cm))
        story.append(Spacer(1, 0.25 * cm))

    doc.build(story)
    print(f"Creato {out_path}")


if __name__ == "__main__":
    base = r"C:\Users\MTALRS97P\Desktop\TEST USABILITA OLIVIA"
    build_scenari(os.path.join(base, "Scenari_di_test.pdf"))
    for soggetto in ["Soggetto 1", "Soggetto 2", "Soggetto 3", "Soggetto 4", "Soggetto X"]:
        d = os.path.join(base, soggetto)
        os.makedirs(d, exist_ok=True)
        build_osservazione(os.path.join(d, "Foglio_osservazione.pdf"))
    build_domande(os.path.join(base, "Domande_per_incontro.pdf"))
    print("\nFatto.")
