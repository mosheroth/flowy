type Props = {
  level: number
  speed: number
  active: boolean
  score: number | null
}

export function VelocityMeter({ level, speed, active, score }: Props) {
  const bar = Math.min(1, level * 1.25)
  const jitter = Math.min(1, speed / 0.4)

  return (
    <div className={`velocity ${active ? 'active' : ''}`}>
      <div className="velocity-label-row">
        <span className="velocity-label">Exhale airflow</span>
        {score !== null && active && (
          <span className="velocity-live-score">{score}</span>
        )}
      </div>
      <div
        className="velocity-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(bar * 100)}
        aria-label="Exhalation sound level"
      >
        <div
          className="velocity-fill"
          style={{
            width: `${active ? bar * 100 : 0}%`,
            filter: `saturate(${1 + jitter * 0.4})`,
          }}
        />
        <div className="velocity-ideal" />
      </div>
      <p className="velocity-hint">
        {active
          ? 'Keep a soft, steady sound as you breathe out'
          : 'Mic listens only while you exhale'}
      </p>
    </div>
  )
}
