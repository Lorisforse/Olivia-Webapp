import { Link } from 'react-router-dom'

export default function Sidebar() {
  return (
    <aside style={{ width: '220px', padding: '24px', background: '#f4f4f4' }}>
      <h2>Olivia</h2>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Link to='/'>Pazienti</Link>
        <Link to='/patients/new'>Nuovo paziente</Link>
      </nav>
    </aside>
  )
}
