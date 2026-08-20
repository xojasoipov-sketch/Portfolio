export function Footer() {
  return (
    <footer
      data-surface="black"
      style={{
        background: "var(--ed-black)",
        color: "var(--ed-offwhite)",
        paddingBottom: "clamp(2rem, 5vw, 3rem)",
      }}
    >
      <div className="ed-shell">
        <hr className="ed-rule" style={{ margin: 0 }} />
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
            Full-stack Developer × AI Builder
          </p>
          <p className="ed-label" style={{ margin: 0, opacity: 0.55 }}>
            © 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
