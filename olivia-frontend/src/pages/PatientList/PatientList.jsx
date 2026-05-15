import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPatients } from '../../api/patients'

export default function PatientList() {
  const [patients, setPatients] = useState([])

  useEffect(() => {
    getPatients().then(setPatients).catch(console.error)
  }, [])

  return (
    <div>
      <h1>Pazienti</h1>
      <Link to='/patients/new'>Nuovo paziente</Link>
      <ul>
        {patients.map((patient) => (
          <li key={patient.id}>
            <Link to={`/patients/${patient.id}`}>{patient.full_name}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
