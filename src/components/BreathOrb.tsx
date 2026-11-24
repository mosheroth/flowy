type Props = {
  phase: 'ready' | 'inhale' | 'exhale' | 'done'
  progress: number
  level: number
  speed: number
}

export function BreathOrb({ phase, progress, level, speed }: Props) {
  const inhaleScale = 0.72 + progress * 0.38
  const exhaleScale = 1.1 - progress * 0.38
  const scale =
    phase === 'inhale'
      ? inhaleScale
      : phase === 'exhale'
        ? exhaleScale
        : phase === 'done'
          ? 0.9
          : 0.78

  const glow = phase === 'exhale' ? 0.35 + level * 0.55 : 0.22
  const ripple = phase === 'exhale' ? Math.min(1, level * 1.8 + speed * 0.25) : 0

  return (
    <div className="orb-stage" aria-hidden="true">
      <div
        className="orb-ripple"
        style={{
          opacity: ripple * 0.55,
          transform: `scale(${1.05 + ripple * 0.35})`,
        }}
      />
      <div
        className={`orb ${phase}`}
        style={{
          transform: `scale(${scale})`,
          boxShadow: `0 0 ${40 + glow * 80}px ${18 + glow * 30}px rgba(127, 212, 197, ${0.18 + glow * 0.35})`,
        }}
      >
        <div
          className="orb-core"
          style={{
            opacity: phase === 'exhale' ? 0.55 + level * 0.45 : 0.7,
          }}
        />
      </div>
    </div>
  )
}
