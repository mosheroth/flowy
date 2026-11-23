import { useCallback, useState } from 'react'
import { Home } from './components/Home'
import { Exercise } from './components/Exercise'
import { useBreathMic } from './hooks/useBreathMic'
import { useBreathingSession } from './hooks/useBreathingSession'
import './App.css'

type Screen = 'home' | 'exercise'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const { status, sample, start: startMic, stop: stopMic, setListening, isLive } =
    useBreathMic()
  const {
    phase,
    cycle,
    cycles,
    progress,
    results,
    liveQuality,
    averageScore,
    start: startSession,
    stop: stopSession,
  } = useBreathingSession({ sample, setListening })

  const begin = useCallback(async () => {
    const ok = isLive || (await startMic())
    if (!ok) return
    setScreen('exercise')
    startSession()
  }, [isLive, startMic, startSession])

  const end = useCallback(() => {
    stopSession()
    stopMic()
    setScreen('home')
  }, [stopMic, stopSession])

  if (screen === 'home') {
    return <Home onStart={begin} micStatus={status} />
  }

  return (
    <Exercise
      phase={phase}
      cycle={cycle}
      cycles={cycles}
      progress={progress}
      level={sample.level}
      speed={sample.speed}
      liveScore={liveQuality?.score ?? null}
      liveLabel={liveQuality?.label ?? null}
      results={results}
      averageScore={averageScore}
      onStop={end}
      onRestart={startSession}
    />
  )
}
