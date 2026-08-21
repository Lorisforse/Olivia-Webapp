# Olivia — Web Dashboard

> **[🌐 Live Demo](https://lorisforse.github.io/Olivia-Webapp/)** — modalità demo con dati di esempio

---

## 🇮🇹 Italiano

### Cos'è Olivia

Olivia è una dashboard web clinica destinata a nutrizionisti e medici, sviluppata come progetto di tesi triennale in Informatica presso **ITPS — Università degli Studi di Bari**.

Il sistema si integra con un chatbot Telegram esistente (**Olivia**) che interagisce quotidianamente con i pazienti raccogliendo dati su pasti, idratazione, peso e umore. La webapp condivide lo stesso database MongoDB del bot e consente al medico di:

- Registrare i pazienti e il loro profilo clinico
- Caricare piani dietetici in formato PDF
- Assegnare le diete ai pazienti
- Monitorare l'attività del bot e l'aderenza alla dieta

### Stack tecnologico

| Layer | Tecnologia |
|---|---|
| Frontend | React 19 + Vite + CSS custom |
| Backend | FastAPI (Python) |
| Database | MongoDB (condiviso con il bot) |
| Deploy | GitHub Pages (frontend) + Docker (backend) |

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

Il frontend si connette al backend su `http://localhost:8000`. Se il backend non è raggiungibile, l'app entra automaticamente in **modalità demo** con dati di esempio.

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

In modalità demo, quando il backend non risponde, il login accetta le credenziali di
esempio già precompilate nel form.

### Struttura del progetto

```
Olivia-Webapp/
├── .github/workflows/deploy.yml   # CI/CD → GitHub Pages
├── olivia-frontend/               # React + Vite
│   └── src/
│       ├── api/                   # Layer API + mock data
│       ├── pages/                 # Login, Home, Pazienti, Diete, NuovoPaziente
│       └── styles/                # Design system CSS
└── olivia-backend/                # FastAPI
    └── src/
        ├── routers/               # auth, patients, diets, logs, reports
        └── schemas/               # Pydantic schemas
```

---

## 🇬🇧 English

### What is Olivia

Olivia is a clinical web dashboard for nutritionists and doctors, developed as a bachelor's thesis project in Computer Science at **ITPS — University of Bari**.

The system integrates with an existing Telegram chatbot (**Olivia**) that interacts daily with patients, collecting data on meals, hydration, weight, and mood. The webapp shares the same MongoDB database as the bot and allows doctors to:

- Register patients and their clinical profile
- Upload diet plans in PDF format
- Assign diets to patients
- Monitor bot activity and diet adherence

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + custom CSS |
| Backend | FastAPI (Python) |
| Database | MongoDB (shared with the bot) |
| Deploy | GitHub Pages (frontend) + Docker (backend) |

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

The frontend connects to the backend at `http://localhost:8000`. If the backend is unreachable, the app automatically switches to **demo mode** with sample data.

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

In demo mode, when the backend is unreachable, the login accepts the sample credentials
already filled in the form.

### Project structure

```
Olivia-Webapp/
├── .github/workflows/deploy.yml   # CI/CD → GitHub Pages
├── olivia-frontend/               # React + Vite
│   └── src/
│       ├── api/                   # API layer + mock data
│       ├── pages/                 # Login, Home, Patients, Diets, NewPatient
│       └── styles/                # CSS design system
└── olivia-backend/                # FastAPI
    └── src/
        ├── routers/               # auth, patients, diets, logs, reports
        └── schemas/               # Pydantic schemas
```

---

## Author

**Loris Amato** — Computer Science, ITPS Uniba
