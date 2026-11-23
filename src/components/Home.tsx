type Props = {
  onStart: () => void
  micStatus: string
}

export function Home({ onStart, micStatus }: Props) {
  return (
    <section className="home">
      <div className="home-atmosphere" aria-hidden="true" />
      <div className="home-content">
        <p className="brand">flowy</p>
        <h1 className="headline">Breathe out loud. Speak smoother.</h1>
        <p className="lede">
          A short audio biofeedback drill: make a soft sound as you exhale, and
          watch how steady your airflow feels.
        </p>
        <div className="cta-row">
          <button type="button" className="cta" onClick={onStart}>
            Start breathing
          </button>
        </div>
        {micStatus === 'denied' && (
          <p className="mic-note warn" role="alert">
            Microphone access is blocked. Enable it in browser settings to
            measure exhalation.
          </p>
        )}
        {micStatus === 'error' && (
          <p className="mic-note warn" role="alert">
            Couldn’t open the microphone. Check permissions and try again.
          </p>
        )}
        {micStatus === 'requesting' && (
          <p className="mic-note">Waiting for microphone permission…</p>
        )}
      </div>
    </section>
  )
}
