/**
 * Struttura del piano alimentare settimanale, condivisa tra l'editor (pagina
 * Diete) e la vista in sola lettura (componente WeeklyPlanGrid, scheda paziente).
 *
 * Le chiavi DEVONO combaciare alla lettera con quelle che legge il bot
 * (`olivia-chatbot/src/models/enums.py`, enum `Weekday` e `MealType`):
 * `meal_plan[giorno][pasto]`. Accenti inclusi.
 */

export const DAYS = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica']

export const MEALS = ['colazione', 'spuntino mattutino', 'pranzo', 'spuntino pomeridiano', 'cena']

const SHORT_DAYS = {
  'lunedì': 'Lun', 'martedì': 'Mar', 'mercoledì': 'Mer', 'giovedì': 'Gio',
  'venerdì': 'Ven', 'sabato': 'Sab', 'domenica': 'Dom',
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export const dayLabel = (day) => capitalize(day)
export const shortDayLabel = (day) => SHORT_DAYS[day] || capitalize(day)
export const mealLabel = (meal) => capitalize(meal)

/** Griglia vuota 7×5, pronta per essere legata a delle textarea. */
export function emptyPlan() {
  const plan = {}
  for (const day of DAYS) {
    plan[day] = {}
    for (const meal of MEALS) plan[day][meal] = ''
  }
  return plan
}

/**
 * Normalizza un `weekly_plan` letto dal backend (che può avere chiavi mancanti)
 * in una griglia piena, così l'editor ha sempre tutte le 35 celle.
 */
export function planFromApi(weekly) {
  const plan = emptyPlan()
  if (!weekly) return plan
  for (const day of DAYS) {
    for (const meal of MEALS) {
      const value = weekly[day]?.[meal]
      if (typeof value === 'string') plan[day][meal] = value
    }
  }
  return plan
}

/**
 * Compatta la griglia dell'editor prima di inviarla: scarta le celle vuote e i
 * giorni senza pasti, come fanno i piani scritti dal bot.
 */
export function planToApi(plan) {
  const out = {}
  for (const day of DAYS) {
    const meals = {}
    for (const meal of MEALS) {
      const value = (plan[day]?.[meal] || '').trim()
      if (value) meals[meal] = value
    }
    if (Object.keys(meals).length) out[day] = meals
  }
  return out
}

/** Numero di celle valorizzate (per i contatori in UI). */
export function countCells(plan) {
  let n = 0
  for (const day of DAYS) {
    for (const meal of MEALS) {
      if ((plan[day]?.[meal] || '').trim()) n++
    }
  }
  return n
}
