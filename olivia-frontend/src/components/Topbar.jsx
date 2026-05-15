export default function Topbar({ activeNav = 'pazienti' }) {
  return (
    <div className="topbar">
      <div className="topbar-brand">
        Olivia <span>|</span> <em>Gestione pazienti</em>
      </div>
      <div className="topbar-nav">
        <div className={`topnav-item${activeNav === 'pazienti' ? ' active' : ''}`}>Pazienti</div>
        <div className={`topnav-item${activeNav === 'diete' ? ' active' : ''}`}>Piani dieta</div>
        <div className={`topnav-item${activeNav === 'report' ? ' active' : ''}`}>Report</div>
      </div>
      <div className="topbar-user">
        <div className="user-avatar">DR</div>
        <div className="user-name">Dott.ssa Rossi</div>
      </div>
    </div>
  )
}
