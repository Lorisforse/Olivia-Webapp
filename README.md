# Olivia — Web Dashboard

---

## 🇮🇹 Italiano

### Cos'è Olivia

Olivia è una dashboard web clinica destinata a nutrizionisti e medici, sviluppata come progetto di tesi triennale in Informatica presso **ITPS — Università degli Studi di Bari**.

Il sistema si integra con un chatbot Telegram esistente (**Olivia**) che interagisce quotidianamente con i pazienti raccogliendo dati su pasti, idratazione, peso e umore. La webapp condivide lo stesso database MongoDB del bot e consente al medico di:

- Registrare i pazienti e il loro profilo clinico
- Creare piani dietetici con un editor a griglia settimanale, con import assistito da PDF
- Assegnare le diete ai pazienti
- Monitorare l'attività del bot e l'aderenza alla dieta

### Stack tecnologico

| Layer | Tecnologia |
|---|---|
| Frontend | React 19 + Vite + CSS custom |
| Backend | FastAPI (Python) |
| Database | MongoDB (condiviso con il bot) |
| Deploy | Docker Compose su VPS, CI/CD Jenkins (frontend + backend) |

### Avvio in locale

**Backend:**
```bash
cd olivia-backend
pip install -r requirements.txt
# Crea un file .env (vedi .env.example)
uvicorn src.main:app --reload
```

**Frontend:**
```bash
cd olivia-frontend
npm install
npm run dev
```

Il frontend si connette al backend su `http://localhost:8000` (override con `VITE_API_URL`). Senza backend raggiungibile l'app non funziona: non esiste più una modalità con dati di esempio.

### Accesso

La dashboard è protetta da login: senza un token valido le API cliniche rispondono `401`.
Gli account dello studio vivono nella collection `webapp-users`, separata dai pazienti del
bot, e si creano da riga di comando:

```bash
cd olivia-backend
python create_user.py --email medico@olivia.it --name "Dr.ssa Elena Russo" --password "SceltaTua123"
```

La spunta **Resta connesso** salva la sessione per 30 giorni (`localStorage`); senza spunta
dura quanto la scheda del browser (`sessionStorage`). Il segreto con cui vengono firmati i
token si imposta con `JWT_SECRET` nel `.env`.

### Gestione delle diete

Un piano dietetico è un documento della collection `nutrition-plans` — **la stessa che legge
il bot** — con i campi `name`, `weekly_plan` (7 giorni × 5 pasti di testo libero), `tips` e
`substitutions`. Il bot usa `weekly_plan[giorno][pasto]` per dire al paziente cosa mangiare;
le chiavi devono combaciare alla lettera con le sue (`lunedì…domenica`; `colazione`,
`spuntino mattutino`, `pranzo`, `spuntino pomeridiano`, `cena`).

Dalla sezione **Diete** il medico può:

1. **Creare un piano** con l'editor a griglia 7×5. Il pulsante **Importa da PDF** invia il
   file a `POST /diets/parse-pdf`: il backend estrae la tabella settimanale e i consigli
   (parser `src/nutrition_plan_pdf.py`, tollerante — non fallisce sulle celle mancanti,
   restituisce degli `warnings`) e pre-compila la griglia, che il medico rivede e corregge.
   Il PDF non è obbligatorio: la griglia si può compilare a mano.
2. **Allegare il PDF originale**: al salvataggio il file viene archiviato in
   `webapp-diet-pdfs`, una collection **solo-webapp** che il bot non conosce (come
   `webapp-users`); è il PDF a referenziare il piano (`plan_id`), così `nutrition-plans`
   resta invariata. Un solo PDF per piano, scaricabile dall'anteprima e dalla scheda paziente.
3. **Assegnare** il piano a uno o più pazienti (imposta `active_nutrition_plan` sul documento
   del paziente).
4. **Modificare / eliminare** un piano; l'eliminazione rimuove anche il PDF allegato (cascade).

La scheda paziente ha una tab **Piano alimentare** che mostra la griglia del piano attivo,
i consigli e le sostituzioni (`GET /patients/{id}/diet`).

Endpoint diete: CRUD `GET/POST/PATCH/DELETE /diets`, più `POST /diets/parse-pdf` (solo
parsing, nessun salvataggio) e `POST` / `GET /diets/{id}/pdf` (allega / scarica il PDF).

> I piani creati dal bot possono avere `substitutions` come regole strutturate (dict): la
> webapp le mostra come nota ma non ha ancora un editor dedicato e non le altera in modifica.

### Struttura del progetto

```
Olivia-Webapp/
├── Jenkinsfile                     # CI/CD → build e deploy su VPS
├── docker-compose.prod.yml         # Servizi di produzione (frontend + backend)
├── olivia-frontend/                # React + Vite
│   └── src/
│       ├── api/                    # Layer API
│       ├── components/             # UI condivisi (es. WeeklyPlanGrid)
│       ├── pages/                  # Login, Home, Pazienti, Diete, NuovoPaziente
│       ├── utils/                  # plan.js (griglia diete), download.js, …
│       └── styles/                 # Design system CSS
└── olivia-backend/                 # FastAPI
    └── src/
        ├── routers/                # auth, patients, diets, logs, reports
        ├── schemas/                # Pydantic schemas
        └── nutrition_plan_pdf.py   # parser PDF → griglia settimanale
```

---

## 🇬🇧 English

### What is Olivia

Olivia is a clinical web dashboard for nutritionists and doctors, developed as a bachelor's thesis project in Computer Science at **ITPS — University of Bari**.

The system integrates with an existing Telegram chatbot (**Olivia**) that interacts daily with patients, collecting data on meals, hydration, weight, and mood. The webapp shares the same MongoDB database as the bot and allows doctors to:

- Register patients and their clinical profile
- Build diet plans with a weekly-grid editor, with assisted import from PDF
- Assign diets to patients
- Monitor bot activity and diet adherence

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + custom CSS |
| Backend | FastAPI (Python) |
| Database | MongoDB (shared with the bot) |
| Deploy | Docker Compose on a VPS, Jenkins CI/CD (frontend + backend) |

### Running locally

**Backend:**
```bash
cd olivia-backend
pip install -r requirements.txt
# Create a .env file (see .env.example)
uvicorn src.main:app --reload
```

**Frontend:**
```bash
cd olivia-frontend
npm install
npm run dev
```

The frontend connects to the backend at `http://localhost:8000` (override with `VITE_API_URL`). Without a reachable backend the app does not work: there is no more sample-data mode.

### Sign in

The dashboard is behind a login: without a valid token the clinical API returns `401`.
Practice accounts live in the `webapp-users` collection, separate from the bot's patients,
and are created from the command line:

```bash
cd olivia-backend
python create_user.py --email doctor@olivia.it --name "Dr. Elena Russo" --password "YourChoice123"
```

The **Resta connesso** ("keep me signed in") checkbox stores the session for 30 days in
`localStorage`; without it the session lasts as long as the browser tab (`sessionStorage`).
The token signing secret is set through `JWT_SECRET` in `.env`.

### Diet management

A diet plan is a document in the `nutrition-plans` collection — **the same one the bot
reads** — with fields `name`, `weekly_plan` (7 days × 5 free-text meals), `tips` and
`substitutions`. The bot uses `weekly_plan[day][meal]` to tell the patient what to eat, so
the keys must match its own exactly (`lunedì…domenica`; `colazione`, `spuntino mattutino`,
`pranzo`, `spuntino pomeridiano`, `cena`).

From the **Diete** section a clinician can:

1. **Create a plan** with the 7×5 grid editor. **Importa da PDF** posts the file to
   `POST /diets/parse-pdf`: the backend extracts the weekly table and the tips (parser
   `src/nutrition_plan_pdf.py`, lenient — it does not fail on missing cells, it returns
   `warnings`) and pre-fills the grid for the clinician to review. The PDF is optional; the
   grid can be filled by hand.
2. **Attach the original PDF**: on save the file is stored in `webapp-diet-pdfs`, a
   **webapp-only** collection the bot knows nothing about (like `webapp-users`); the PDF
   references the plan (`plan_id`), so `nutrition-plans` is left untouched. One PDF per plan,
   downloadable from the preview and the patient page.
3. **Assign** the plan to one or more patients (sets `active_nutrition_plan` on the patient
   document).
4. **Edit / delete** a plan; deleting also removes the attached PDF (cascade).

The patient page has a **Piano alimentare** tab showing the active plan's grid, tips and
substitutions (`GET /patients/{id}/diet`).

Diet endpoints: CRUD `GET/POST/PATCH/DELETE /diets`, plus `POST /diets/parse-pdf` (parse
only, nothing saved) and `POST` / `GET /diets/{id}/pdf` (attach / download the PDF).

> Bot-authored plans may carry `substitutions` as structured rules (dict): the webapp shows
> them as a note but has no dedicated editor yet and leaves them untouched on edit.

### Project structure

```
Olivia-Webapp/
├── Jenkinsfile                     # CI/CD → build and deploy on the VPS
├── docker-compose.prod.yml         # Production services (frontend + backend)
├── olivia-frontend/                # React + Vite
│   └── src/
│       ├── api/                    # API layer
│       ├── components/             # shared UI (e.g. WeeklyPlanGrid)
│       ├── pages/                  # Login, Home, Patients, Diets, NewPatient
│       ├── utils/                  # plan.js (diet grid), download.js, …
│       └── styles/                 # CSS design system
└── olivia-backend/                 # FastAPI
    └── src/
        ├── routers/                # auth, patients, diets, logs, reports
        ├── schemas/                # Pydantic schemas
        └── nutrition_plan_pdf.py   # PDF parser → weekly grid
```

---

## Author

**Loris Amato** — Computer Science, ITPS Uniba
