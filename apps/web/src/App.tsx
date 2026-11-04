export function App() {
  return (
    <main className="welcome-shell">
      <div className="welcome-card">
        <div className="brand-mark" aria-hidden="true">✳</div>
        <p className="eyebrow">A little farm, a lot of clever code</p>
        <h1>Welcome to <em>Autofarm</em></h1>
        <p className="intro">
          Your drone is ready. Soon, you’ll teach it to plant, tend, and harvest
          with a few lines of code.
        </p>
        <div className="field-preview" aria-label="A preview of the farm">
          {Array.from({ length: 9 }, (_, index) => (
            <span className={index === 4 ? "plot plot-center" : "plot"} key={index}>
              {index === 4 ? "✦" : index === 1 || index === 7 ? "♧" : ""}
            </span>
          ))}
        </div>
        <p className="status"><span /> The farm is getting ready</p>
      </div>
    </main>
  );
}
