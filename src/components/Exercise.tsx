import { QUALITY_COPY } from '../lib/audioBreath'
import type { Phase, CycleResult } from '../hooks/useBreathingSession'
import { BreathOrb } from './BreathOrb'
import { VelocityMeter } from './VelocityMeter'

type Props = {
  phase: Phase
  cycle: number
  cycles: number
  progress: number
  level: number
  speed: number
  liveScore: number | null
  liveLabel: CycleResult['label'] | null
  results: CycleResult[]
  averageScore: number | null
  onStop: () => void
  onRestart: () => void
}

function phaseTitle(phase: Phase, cycle: number, cycles: number): string {
  switch (phase) {
    case 'inhale':
      return 'Inhale quietly'
    case 'exhale':
      return 'Exhale with sound'
    case 'done':
      return 'Session complete'
    default:
      return `Breath ${cycle} of ${cycles}`
  }
}

function phaseSub(
  phase: Phase,
  label: CycleResult['label'] | null,
  cycle: number,
): string {
  if (phase === 'inhale') {
    if (cycle > 1 && label) return QUALITY_COPY[label]
    return 'Fill gently through the nose'
  }
  if (phase === 'exhale') return 'A soft hiss is enough — no need to push'
  if (phase === 'done') return 'Steady exhalation trains calmer speech airflow'
  return ''
}

export function Exercise({
  phase,
  cycle,
  cycles,
  progress,
  level,
  speed,
  liveScore,
  liveLabel,
  results,
  averageScore,
  onStop,
  onRestart,
}: Props) {
  const active = phase === 'exhale'

  return (
    <section className="exercise">
      <header className="exercise-top">
        <p className="brand brand-sm">flowy</p>
        <button type="button" className="ghost" onClick={onStop}>
          End
        </button>
      </header>

      <div className="exercise-main">
        <p className="cycle-meta">
          {phase === 'done' ? 'Done' : `${cycle} / ${cycles}`}
        </p>
        <BreathOrb
          phase={phase}
          progress={progress}
          level={level}
          speed={speed}
        />
        <h2 className="phase-title">{phaseTitle(phase, cycle, cycles)}</h2>
        <p className="phase-sub">{phaseSub(phase, liveLabel, cycle)}</p>

        <VelocityMeter
          level={level}
          speed={speed}
          active={active}
          score={liveScore}
        />

        {phase === 'done' && (
          <div className="summary">
            <p className="summary-score">
              {averageScore !== null ? averageScore : '—'}
              <span>avg quality</span>
            </p>
            <ul className="summary-list">
              {results.map((r) => (
                <li key={r.cycle}>
                  <span>Breath {r.cycle}</span>
                  <strong>{r.score}</strong>
                  <em>{r.label}</em>
                </li>
              ))}
            </ul>
            <button type="button" className="cta" onClick={onRestart}>
              Practice again
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
