import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="hx-footer">
      <div className="hx-shell">
        <div className="hx-footer-row">
          <p>Saidburxon Xojasoipov</p>
          <nav aria-label="Qo'shimcha havolalar">
            <Link to="/xizmatlar">Narxlar</Link>
            <Link to="/cv">CV</Link>
            <a href="https://t.me/xojasoipov" target="_blank" rel="noreferrer">
              Telegram
            </a>
          </nav>
          <p>© 2026</p>
        </div>
      </div>
      <p className="hx-wordmark" aria-hidden="true">
        sadiprime.lab
      </p>
    </footer>
  );
}
