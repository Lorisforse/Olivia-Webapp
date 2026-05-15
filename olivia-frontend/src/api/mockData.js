function daysAgo(n) { return new Date(Date.now() - n * 86400000).toISOString() }
function hoursAgo(n) { return new Date(Date.now() - n * 3600000).toISOString() }
function dateStr(n) { return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10) }

const D = ['demo-diet-0', 'demo-diet-1', 'demo-diet-2']
const P = Array.from({ length: 10 }, (_, i) => `demo-patient-${i}`)

export function getMockDiets() {
  return [
    {
      id: D[0], name: 'Piano Mediterraneo Base', created_at: daysAgo(45),
      tips: ['Bere almeno 2L di acqua al giorno.', 'Limitare il sale aggiunto.', 'Attività fisica leggera 30 min al giorno.'],
      substitutions: 'Pasta ↔ Riso ↔ Farro a parità di grammatura.\nCarne bianca ↔ Pesce magro ↔ Legumi (raddoppiare).',
      weekly_plan: {},
    },
    {
      id: D[1], name: 'Piano Ipocalorico Moderato', created_at: daysAgo(30),
      tips: ['Non saltare mai la colazione.', 'Distribuire i pasti in 5 momenti al giorno.', 'Evitare dolci e alcolici durante la settimana.'],
      substitutions: 'Pane bianco → Pane integrale o gallette.\nBurro → Olio EVO (max 2 cucchiaini).\nSucchi → Frutta fresca.',
      weekly_plan: {},
    },
    {
      id: D[2], name: 'Piano High-Protein Sport', created_at: daysAgo(15),
      tips: ["Consumare proteine entro 30 min dall'allenamento.", 'Idratarsi abbondantemente durante l\'attività fisica.', 'Non ridurre i carboidrati nei giorni di allenamento intenso.'],
      substitutions: 'Pollo ↔ Tacchino ↔ Pesce magro.\nRiso ↔ Pasta integrale ↔ Patate dolci.',
      weekly_plan: {},
    },
  ]
}

export function getMockDiet(id) {
  return getMockDiets().find(d => d.id === id) ?? getMockDiets()[0]
}

const PATIENTS_FULL = [
  // ── attivi (chat_id + dieta) ─────────────────────────────────────────
  {
    id: P[0], chat_id: 100000000, username: 'giulia0',
    name: 'Giulia Ricci', gender: 'Femmina', age: 32, weight: 72.5, height: 165,
    living_at: 'Roma', goal: 'Perdita di peso', active_diet_plan_id: D[0],
    created_at: daysAgo(30), last_interaction_at: hoursAgo(3),
    email: 'giulia.ricci@email.it', phone: '+39 333 1234567',
    allergies: ['Lattosio'], preferences: ['Vegetariana'],
    notes: 'Paziente motivata, buona aderenza alle indicazioni.',
    activity_level: 'Sedentario', average_sleep_hours: 7, smoker: false,
    physical_activity: true, physical_activity_which: 'Yoga', physical_activity_frequency: '2-3',
    breakfast_at: '07:30', lunch_at: '13:00', dinner_at: '20:00',
  },
  {
    id: P[1], chat_id: 100000001, username: 'marco1',
    name: 'Marco Bianchi', gender: 'Maschio', age: 45, weight: 91.0, height: 178,
    living_at: 'Milano', goal: 'Riduzione colesterolo', active_diet_plan_id: D[1],
    created_at: daysAgo(27), last_interaction_at: hoursAgo(12),
    email: 'marco.bianchi@email.it', phone: '+39 334 2345678',
    allergies: [], preferences: [],
    notes: 'Ipertensione lieve, dieta iposodica raccomandata.',
    activity_level: 'Leggero', average_sleep_hours: 6, smoker: false,
    physical_activity: false,
    breakfast_at: '07:00', lunch_at: '13:00', dinner_at: '19:30',
  },
  {
    id: P[2], chat_id: 100000002, username: 'sofia2',
    name: 'Sofia Romano', gender: 'Femmina', age: 28, weight: 58.0, height: 162,
    living_at: 'Napoli', goal: 'Mantenimento', active_diet_plan_id: D[2],
    created_at: daysAgo(24), last_interaction_at: hoursAgo(6),
    email: 'sofia.romano@email.it', phone: '+39 335 3456789',
    allergies: ['Glutine', 'Frutta secca'], preferences: ['Pesce raro'],
    notes: 'Sportiva amatoriale, 3 allenamenti settimanali.',
    activity_level: 'Moderato', average_sleep_hours: 8, smoker: false,
    physical_activity: true, physical_activity_which: 'Corsa', physical_activity_frequency: '4-5',
    breakfast_at: '08:00', lunch_at: '13:30', dinner_at: '20:00',
  },
  {
    id: P[3], chat_id: 100000003, username: 'ale3',
    name: 'Alessandro Greco', gender: 'Maschio', age: 38, weight: 88.0, height: 182,
    living_at: 'Torino', goal: 'Aumento massa', active_diet_plan_id: D[0],
    created_at: daysAgo(21), last_interaction_at: hoursAgo(24),
    email: 'ale.greco@email.it', phone: '+39 336 4567890',
    allergies: [], preferences: [],
    notes: 'Lavoro sedentario, gestione dello stress importante.',
    activity_level: 'Intenso', average_sleep_hours: 7, smoker: false,
    physical_activity: true, physical_activity_which: 'Palestra', physical_activity_frequency: '6+',
    breakfast_at: '07:00', lunch_at: '13:00', dinner_at: '20:30',
  },
  // ── senza dieta (chat_id senza piano) ────────────────────────────────
  {
    id: P[4], chat_id: 200000004, username: 'chiara4',
    name: 'Chiara Marino', gender: 'Femmina', age: 52, weight: 78.0, height: 160,
    living_at: 'Firenze', goal: 'Regolarizzazione glicemia', active_diet_plan_id: null,
    created_at: daysAgo(18), last_interaction_at: daysAgo(2),
    email: 'chiara.marino@email.it', phone: '+39 337 5678901',
    allergies: ['Arachidi'], preferences: [],
    notes: 'Pre-diabete, monitoraggio glicemia ogni 2 settimane.',
    activity_level: 'Leggero', average_sleep_hours: 7, smoker: false,
    physical_activity: false,
    breakfast_at: '07:30', lunch_at: '13:00', dinner_at: '19:00',
  },
  {
    id: P[5], chat_id: 200000005, username: 'luca5',
    name: 'Luca Ferrari', gender: 'Maschio', age: 29, weight: 75.0, height: 175,
    living_at: 'Bologna', goal: 'Miglioramento sportivo', active_diet_plan_id: null,
    created_at: daysAgo(15), last_interaction_at: daysAgo(5),
    email: 'luca.ferrari@email.it', phone: '+39 338 6789012',
    allergies: [], preferences: [],
    notes: 'Sportivo amatoriale, 3 allenamenti settimanali.',
    activity_level: 'Intenso', average_sleep_hours: 7, smoker: false,
    physical_activity: true, physical_activity_which: 'Calcio', physical_activity_frequency: '2-3',
    breakfast_at: '06:30', lunch_at: '12:30', dinner_at: '19:30',
  },
  {
    id: P[6], chat_id: 200000006, username: 'fra6',
    name: 'Francesca Esposito', gender: 'Femmina', age: 41, weight: 83.5, height: 168,
    living_at: 'Padova', goal: 'Perdita di peso', active_diet_plan_id: null,
    created_at: daysAgo(12), last_interaction_at: daysAgo(8),
    email: 'fra.esposito@email.it', phone: '+39 339 7890123',
    allergies: [], preferences: [],
    notes: 'Paziente motivata, buona aderenza alle indicazioni.',
    activity_level: 'Moderato', average_sleep_hours: 6, smoker: false,
    physical_activity: true, physical_activity_which: 'Nuoto', physical_activity_frequency: '2-3',
    breakfast_at: '08:00', lunch_at: '13:00', dinner_at: '20:00',
  },
  // ── in attesa (nessun bot) ────────────────────────────────────────────
  {
    id: P[7], chat_id: null, username: null,
    name: 'Matteo Russo', gender: 'Maschio', age: 35, weight: 94.0, height: 180,
    living_at: 'Genova', goal: 'Perdita di peso', active_diet_plan_id: null,
    created_at: daysAgo(9), last_interaction_at: null,
    email: 'matteo.russo@email.it', phone: '+39 340 8901234',
    allergies: [], preferences: [], notes: null,
    activity_level: 'Leggero', average_sleep_hours: 7, smoker: true, physical_activity: false,
  },
  {
    id: P[8], chat_id: null, username: null,
    name: 'Elena Conti', gender: 'Femmina', age: 24, weight: 55.5, height: 170,
    living_at: 'Verona', goal: 'Mantenimento', active_diet_plan_id: null,
    created_at: daysAgo(6), last_interaction_at: null,
    email: 'elena.conti@email.it', phone: '+39 341 9012345',
    allergies: ['Lattosio'], preferences: [], notes: null,
    activity_level: 'Sedentario', average_sleep_hours: 8, smoker: false, physical_activity: false,
  },
  {
    id: P[9], chat_id: null, username: null,
    name: 'Davide Bruno', gender: 'Maschio', age: 60, weight: 85.0, height: 172,
    living_at: 'Roma', goal: 'Riduzione colesterolo', active_diet_plan_id: null,
    created_at: daysAgo(3), last_interaction_at: null,
    email: 'davide.bruno@email.it', phone: '+39 342 0123456',
    allergies: [], preferences: [],
    notes: 'Ipertensione lieve, dieta iposodica raccomandata.',
    activity_level: 'Sedentario', average_sleep_hours: 6, smoker: false, physical_activity: false,
  },
]

export function getMockPatients() { return PATIENTS_FULL }
export function getMockPatient(id) {
  return PATIENTS_FULL.find(p => p.id === id) ?? PATIENTS_FULL[0]
}

const MEALS_TEMPLATE = [
  { meal_type: 'Colazione',      food: ['Yogurt greco 150g', 'avena 40g', 'mirtilli'] },
  { meal_type: 'Spuntino',       food: ['Mela 1 media'] },
  { meal_type: 'Pranzo',         food: ['Pasta integrale 80g', 'tonno 80g', 'pomodoro'] },
  { meal_type: 'Merenda',        food: ['Tè verde', 'gallette 3'] },
  { meal_type: 'Cena',           food: ['Petto di pollo 150g', 'insalata', 'pane 40g'] },
]

function mockDay(daysBack, weightKg) {
  const d = dateStr(daysBack)
  return {
    date: d,
    meals: MEALS_TEMPLATE.map(m => ({
      meal_type: m.meal_type, food: m.food,
      satisfaction: 'Alta', adherence: 'Completata', adherence_reason: null,
      created_at: `${d}T09:00:00.000Z`,
    })),
    weights: daysBack === 0 ? [{ value_kg: weightKg, created_at: `${d}T07:30:00.000Z` }] : [],
    hydrations: [{ value_ml: 1800, created_at: `${d}T21:00:00.000Z` }],
    wellness: [{
      type: 'mood', mood: 'Bene', cause: null,
      sleep_quality: 'Buono', hunger: 'Normale', created_at: `${d}T09:00:00.000Z`,
    }],
  }
}

export function getMockLogs(patientId) {
  const p = PATIENTS_FULL.find(pt => pt.id === patientId)
  if (!p?.chat_id) return { days: [] }
  return { days: [6, 5, 4, 3, 2, 1, 0].map(n => mockDay(n, p.weight ?? 70)) }
}
