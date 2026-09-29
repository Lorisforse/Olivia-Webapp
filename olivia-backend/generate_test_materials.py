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
     "«Hai ricevuto le credenziali (nutrizionista@olivia.local / prova123). Accedi alla piattaforma "
     "e dimmi quanti pazienti sono attivi in "
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


SUS_ITEMS = [
    "Penso che mi piacerebbe utilizzare questo sistema frequentemente.",
    "Ho trovato il sistema complesso senza che ce ne fosse bisogno.",
    "Ho trovato il sistema molto semplice da usare.",
    "Penso che avrei bisogno del supporto di una persona già in grado di utilizzare il sistema.",
    "Ho trovato le varie funzionalità del sistema bene integrate.",
    "Ho trovato incoerenze tra le varie funzionalità del sistema.",
    "Penso che la maggior parte delle persone potrebbero imparare ad utilizzare il sistema facilmente.",
    "Ho trovato il sistema molto macchinoso da utilizzare.",
    "Ho avuto molta confidenza con il sistema durante l'uso.",
    "Ho avuto bisogno di imparare molti processi prima di riuscire ad utilizzare al meglio il sistema.",
]
SUS_SCALE = ["Fortemente in disaccordo", "In disaccordo", "Neutrale", "D'accordo", "Fortemente d'accordo"]

WALKTHROUGH_STEPS = [
    [
        "Inserire email e password (nutrizionista@olivia.local / prova123) e cliccare «Accedi».",
        "Nella home, leggere i valori delle card «Pazienti attivi» e «Pazienti senza dieta».",
        "Aprire Pazienti e usare la barra di ricerca («Cerca per nome, città o email…») per trovare Elisa Marchetti.",
        "Aprire la sua scheda e leggere il campo «Obiettivo» nel Profilo.",
    ],
    [
        "Da «Nuovo paziente», compilare i dati anagrafici obbligatori (nome, cognome, sesso, data di nascita, città, lavoro).",
        "Compilare i dati clinici obbligatori (peso, altezza, obiettivo).",
        "Cliccare «Crea paziente».",
        "Nella schermata di conferma, seguire l'invito a far inquadrare il QR per collegare la paziente al bot (tab Attività bot).",
    ],
    [
        "Aprire Diete e trascinare/selezionare il PDF nell'area «Importa da PDF».",
        "Controllare la griglia generata ed eventuali avvisi di celle non riconosciute.",
        "Scrivere il nome del piano («Mediterranea 1600, fase 1») e salvare.",
        "Cliccare «Assegna», cercare «Ferri» nel modale e confermare l'assegnazione.",
    ],
]

# Esempio di compilazione con risposte plausibili, per mostrare come dovrebbe
# apparire il foglio finito. NON e' una valutazione reale: e' solo un modello.
WALKTHROUGH_EXAMPLE = [
    [
        {"d": ["Si", "Si", "Si", "Si"], "note": ""},
        {"d": ["Si", "Si", "Si", "Si"],
         "note": "«Pazienti attivi» richiede sia dieta assegnata sia bot collegato, ma la "
                 "definizione compare solo come sottotitolo piccolo sotto al numero: facile da "
                 "non notare al primo sguardo."},
        {"d": ["Si", "Si", "Si", "Si"], "note": ""},
        {"d": ["Si", "Si", "Si", "No"],
         "note": "Il campo Obiettivo e' in mezzo a molti altri campi nel tab Profilo, senza "
                 "risalto: qualche secondo in piu' per trovarlo. Proposta: evidenziarlo in una "
                 "card riassuntiva in cima alla scheda paziente."},
    ],
    [
        {"d": ["Si", "Si", "Si", "Si"], "note": ""},
        {"d": ["Si", "Si", "Si", "Si"], "note": ""},
        {"d": ["Si", "Si", "Si", "Si"], "note": ""},
        {"d": ["No", "Si", "Si", "Si"],
         "note": "Lo scenario parla di «consegnare un codice», ma l'interfaccia offre solo un QR "
                 "da inquadrare, nessun codice testuale alternativo: se la paziente non ha lo "
                 "smartphone con se' in quel momento non c'e' modo di darglielo. Proposta: "
                 "affiancare al QR anche un codice testuale copiabile o leggibile ad alta voce."},
    ],
    [
        {"d": ["Si", "Si", "Si", "Si"], "note": ""},
        {"d": ["No", "Si", "Si", "Si"],
         "note": "L'avviso di cella non riconosciuta compare come testo semplice sopra la "
                 "griglia: poco evidente, un utente distratto puo' non collegarlo alla cella "
                 "vuota da correggere. Proposta: evidenziare in rosso anche la cella incriminata "
                 "nella griglia, non solo l'avviso testuale separato."},
        {"d": ["Si", "Si", "Si", "Si"], "note": ""},
        {"d": ["Si", "Si", "Si", "Si"], "note": ""},
    ],
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
        "susHead": ParagraphStyle("SusHead", parent=ss["Normal"], fontSize=6.5, leading=7.5,
                                   textColor=colors.white, fontName="Helvetica-Bold",
                                   alignment=1),
        "susItem": ParagraphStyle("SusItem", parent=ss["Normal"], fontSize=9.5, leading=12),
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


def build_sus(out_path):
    st = styles()
    doc = SimpleDocTemplate(out_path, pagesize=A4, leftMargin=1.8 * cm, rightMargin=1.8 * cm,
                             topMargin=1.6 * cm, bottomMargin=1.6 * cm)
    width = doc.width
    story = [
        Paragraph("System Usability Scale (SUS)", st["title"]),
        Paragraph("Questionario sull'usabilità percepita – versione italiana – Brooke (1996)",
                   st["sub"]),
        Paragraph(
            "Per ciascuna affermazione, indica il tuo grado di accordo barrando una casella, da 1 "
            "(fortemente in disaccordo) a 5 (fortemente d'accordo). Non ci sono risposte giuste o "
            "sbagliate: conta la tua prima impressione.",
            st["note"]),
        Paragraph("Partecipante n. ____________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
                   "Data: ____________", st["fields"]),
    ]

    item_w = 8.0 * cm
    scale_w = (width - item_w) / 5
    header = [""] + [Paragraph(s, st["susHead"]) for s in SUS_SCALE]
    rows = [header]
    for i, item in enumerate(SUS_ITEMS, start=1):
        rows.append([Paragraph(f"{i}. {item}", st["susItem"]), "", "", "", "", ""])

    table = Table(rows, colWidths=[item_w] + [scale_w] * 5, repeatRows=1)
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.6, LIGHTGREY),
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, 0), 6),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("LEFTPADDING", (1, 0), (-1, 0), 2),
        ("RIGHTPADDING", (1, 0), (-1, 0), 2),
        ("TOPPADDING", (0, 1), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (0, -1), 6),
    ]))
    story.append(table)
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph(
        "Grazie per la partecipazione. Il punteggio complessivo verrà calcolato dal ricercatore a "
        "partire dalle risposte fornite.", st["note"]))

    doc.build(story)
    print(f"Creato {out_path}")


def build_cognitive_walkthrough(out_path, answers=None):
    """answers, se passato: lista di 3 liste (una per scenario) di dict
    {"d": [risposta_D1, D2, D3, D4], "note": "..."} nello stesso ordine di
    WALKTHROUGH_STEPS. Senza, il foglio resta in bianco per la compilazione."""
    st = styles()
    doc = SimpleDocTemplate(out_path, pagesize=A4, leftMargin=1.8 * cm, rightMargin=1.8 * cm,
                             topMargin=1.6 * cm, bottomMargin=1.6 * cm)
    width = doc.width
    story = [
        Paragraph("Cognitive walkthrough – Olivia webapp", st["title"]),
    ]
    if answers:
        story.append(Paragraph(
            "ESEMPIO DI COMPILAZIONE: non è una valutazione reale, solo un modello di come "
            "dovrebbe apparire il foglio finito.",
            ParagraphStyle("Warn", parent=st["sub"], textColor=colors.HexColor("#a33"),
                            fontName="Helvetica-Bold")))
    story += [
        Paragraph("Ispezione individuale sugli scenari 1, 2 e 3 – Wharton et al. (1994)", st["sub"]),
        Paragraph(
            "Percorri ciascun compito passo per passo mettendoti nei panni di un utente nuovo. Per "
            "ogni passo rispondi Si/No alle quattro domande (legenda sotto); ogni No indica un "
            "possibile problema di usabilità, da annotare nell'ultima colonna insieme a una "
            "correzione proposta.",
            st["note"]),
    ]

    legend_rows = [
        ["D1", "L'utente capirebbe che deve fare questo passo per raggiungere l'obiettivo?"],
        ["D2", "Noterebbe il controllo o il comando giusto?"],
        ["D3", "Lo assocerebbe all'azione che vuole compiere?"],
        ["D4", "Dopo averlo usato, capirebbe di aver fatto un progresso (feedback chiaro)?"],
    ]
    legend = Table(legend_rows, colWidths=[1.4 * cm, width - 1.4 * cm])
    legend.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, LIGHTGREY),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(legend)
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("Valutatore: ____________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
                            "Data: ____________", st["fields"]))

    col_num = 0.6 * cm
    col_passo = 6.7 * cm
    col_d = 1.15 * cm
    col_prob = width - col_num - col_passo - 4 * col_d

    for i, (title, text) in enumerate(TASKS[:3], start=1):
        block = [
            header_bar(f"Scenario {i} – {title}", width),
            Spacer(1, 0.15 * cm),
            Paragraph(f"<i>{text}</i>", st["body"]),
            Spacer(1, 0.2 * cm),
        ]
        story.append(KeepTogether(block))

        header = [Paragraph(h, st["susHead"]) for h in
                  ["#", "Passo (cosa deve fare l'utente)", "D1", "D2", "D3", "D4",
                   "Problema riscontrato e correzione proposta"]]
        rows = [header]
        for n, step in enumerate(WALKTHROUGH_STEPS[i - 1], start=1):
            if answers:
                a = answers[i - 1][n - 1]
                d_cells = [Paragraph(f'<b><font color="#a33">{v}</font></b>' if v == "No" else v,
                                      st["susItem"]) for v in a["d"]]
                note_cell = Paragraph(a["note"], st["susItem"]) if a["note"] else ""
                rows.append([str(n), Paragraph(step, st["susItem"]), *d_cells, note_cell])
            else:
                rows.append([str(n), Paragraph(step, st["susItem"]), "", "", "", "", ""])

        # altezza riga fissa (spazio per scrivere a mano) solo sul foglio in
        # bianco: con le risposte gia' scritte l'altezza si adatta al testo,
        # altrimenti le note piu' lunghe si sovrappongono alla riga sotto.
        row_heights = None if answers else [None] + [1.6 * cm] * len(WALKTHROUGH_STEPS[i - 1])
        table = Table(rows, colWidths=[col_num, col_passo, col_d, col_d, col_d, col_d, col_prob],
                      rowHeights=row_heights)
        table.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, LIGHTGREY),
            ("BACKGROUND", (0, 0), (-1, 0), GREEN),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
            ("ALIGN", (2, 0), (5, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(table)
        story.append(Spacer(1, 0.5 * cm))

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
        build_sus(os.path.join(d, "SUS_Italiano.pdf"))
    build_domande(os.path.join(base, "Domande_per_incontro.pdf"))
    build_cognitive_walkthrough(os.path.join(base, "Cognitive_walkthrough.pdf"))
    build_cognitive_walkthrough(os.path.join(base, "Cognitive_walkthrough_ESEMPIO.pdf"),
                                 answers=WALKTHROUGH_EXAMPLE)
    print("\nFatto.")
