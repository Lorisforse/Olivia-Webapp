// Chiavi identiche a quelle del bot (enum Weekday/MealType in olivia-chatbot/src/models/enums.py), accenti inclusi.
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

export function emptyPlan() {
  const plan = {}
  for (const day of DAYS) {
    plan[day] = {}
    for (const meal of MEALS) plan[day][meal] = ''
  }
  return plan
}

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

export function countCells(plan) {
  let n = 0
  for (const day of DAYS) {
    for (const meal of MEALS) {
      if ((plan[day]?.[meal] || '').trim()) n++
    }
  }
  return n
}
