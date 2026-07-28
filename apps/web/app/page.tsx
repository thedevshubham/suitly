import { ShopperDemo } from './shopper-demo.js';

export default function HomePage() {
  return (
    <main>
      <nav className="nav shell" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="Suitly home">
          <span className="brand-mark">S</span>
          <span>Suitly</span>
        </a>
        <div className="nav-note">
          <span className="status-dot" />
          Local AI · Private by design
        </div>
      </nav>

      <section className="hero shell" id="top">
        <div className="eyebrow">Your catalogue, styled personally</div>
        <h1>
          Find the pieces that
          <br />
          <em>feel made for you.</em>
        </h1>
        <p className="hero-copy">
          Add one full-body photo and a few preferences. Suitly privately
          analyses visible proportions and recommends real, available products
          from the store.
        </p>
        <div className="trust-row" aria-label="Product qualities">
          <span>Runs locally</span>
          <span>Photo deleted after analysis</span>
          <span>No identity inference</span>
        </div>
      </section>

      <ShopperDemo />

      <footer className="shell footer">
        <span>Suitly MVP · Local development demo</span>
        <span>Style guidance, not guaranteed sizing.</span>
      </footer>
    </main>
  );
}
