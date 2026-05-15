import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPatient } from '../../api/patients'

export default function PatientNew() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    const patient = await createPatient({ full_name: fullName, age: age ? Number(age) : null })
    navigate(`/patients/${patient.id}`)
  }

  return (
    <div>
      <h1>Nuovo paziente</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Nome completo</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div>
          <label>Età</label>
          <input value={age} onChange={(e) => setAge(e.target.value)} type='number' />
        </div>
        <button type='submit'>Salva</button>
      </form>
    </div>
  )
}
