import { DAYS, MEALS, mealLabel, shortDayLabel } from '../utils/plan'

/**
 * Vista in sola lettura del piano alimentare settimanale: righe = pasti,
 * colonne = giorni. Usata nell'anteprima di un piano (pagina Diete) e nella
 * scheda paziente. `plan` è il `weekly_plan` così come arriva dal backend
 * (chiavi eventualmente mancanti).
 */
export default function WeeklyPlanGrid({ plan }) {
  const empty = !plan || !DAYS.some((day) => MEALS.some((meal) => plan[day]?.[meal]))

  if (empty) {
    return <p className="muted" style={{ fontSize: 13 }}>Nessun pasto inserito in questo piano.</p>
  }

  return (
    <div className="plan-grid-scroll">
      <table className="plan-table">
        <thead>
          <tr>
            <th className="plan-table__corner" />
            {DAYS.map((day) => (
              <th key={day} scope="col">{shortDayLabel(day)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MEALS.map((meal) => (
            <tr key={meal}>
              <th scope="row">{mealLabel(meal)}</th>
              {DAYS.map((day) => {
                const value = plan[day]?.[meal]
                return (
                  <td key={day} className={value ? '' : 'plan-table__empty'}>
                    {value || '—'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
