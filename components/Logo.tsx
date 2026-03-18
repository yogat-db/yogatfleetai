export default function Logo() {
  return (
    <div style={styles.logo}>
      <div style={styles.dot}></div>
      <span>Garage</span>
    </div>
  )
}

const styles = {
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontWeight: 700,
    fontSize: 16,
  } as React.CSSProperties,

  dot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: "linear-gradient(135deg,#2563eb,#7c3aed)",
  } as React.CSSProperties,
}