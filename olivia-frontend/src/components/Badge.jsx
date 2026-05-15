export default function Badge({ children }) {
  return (
    <span style={{ padding: '4px 8px', borderRadius: '999px', background: '#e9ecef' }}>
      {children}
    </span>
  )
}
