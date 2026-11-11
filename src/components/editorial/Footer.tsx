export function Footer() {
  return (
    <footer
      style={{
        paddingBottom: "clamp(2rem, 5vw, 3rem)",
      }}
    >
      <div className="ed-shell">
        <hr
          className="ed-rule"
          style={{ margin: 0, background: "var(--ed-line)", opacity: 1 }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
            paddingTop: "clamp(1.25rem, 3vw, 2rem)",
          }}
        >
          <p className="ed-label" style={{ margin: 0 }}>
            Saidburxon Xojasoipov
          </p>
          <p className="ed-label" style={{ margin: 0, opacity: 0.55 }}>
            sadiprime.lab
          </p>
          <p className="ed-label" style={{ margin: 0, opacity: 0.55 }}>
            © 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
