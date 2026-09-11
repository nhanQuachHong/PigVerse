import { GENESIS_MAX_SUPPLY } from "../src/lib/genesis";

export default function Home() {
  return (
    <main>
      <section aria-labelledby="foundation-title" className="foundation-card">
        <p className="eyebrow">Pigverse Genesis</p>
        <h1 id="foundation-title">Engineering foundation is ready.</h1>
        <p>
          The approved {GENESIS_MAX_SUPPLY}-character collection will be
          delivered milestone by milestone. No wallet action or mint is enabled
          in this foundation shell.
        </p>
      </section>
    </main>
  );
}
