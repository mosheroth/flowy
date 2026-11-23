import { useCallback, useEffect, useRef, useState } from 'react'
import {
  scoreExhale,
  type BreathSample,
  type ExhaleQuality,
} from '../lib/audioBreath'

export type Phase = 'ready' | 'inhale' | 'exhale' | 'rest' | 'done'

export type CycleResult = ExhaleQuality & { cycle: number }

const INHALE_MS = 4000
const EXHALE_MS = 6000
const REST_MS = 1200
const DEFAULT_CYCLES = 4

type Options = {
  cycles?: number
  sample: BreathSample
  setListening: (on: boolean) => void
}

export function useBreathingSession({
  cycles = DEFAULT_CYCLES,
  sample,
  setListening,
}: Options) {
  const [phase, setPhase] = useState<Phase>('ready')
  const [cycle, setCycle] = useState(0)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<CycleResult[]>([])
  const [liveQuality, setLiveQuality] = useState<ExhaleQuality | null>(null)

  const samplesRef = useRef<BreathSample[]>([])
  const cycleRef = useRef(0)
  const cyclesRef = useRef(cycles)
  const timerRef = useRef(0)
  const rafRef = useRef(0)
  const setListeningRef = useRef(setListening)
  const beginInhaleRef = useRef<() => void>(() => {})
  const beginExhaleRef = useRef<() => void>(() => {})
  const afterExhaleRef = useRef<() => void>(() => {})

  useEffect(() => {
    cyclesRef.current = cycles
  }, [cycles])

  useEffect(() => {
    setListeningRef.current = setListening
  }, [setListening])

  const clearTimers = useCallback(() => {
    window.clearTimeout(timerRef.current)
    cancelAnimationFrame(rafRef.current)
  }, [])

  const runProgress = useCallback((duration: number) => {
    const start = performance.now()
    const tick = () => {
      const t = (performance.now() - start) / duration
      setProgress(Math.min(1, t))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    beginInhaleRef.current = () => {
      setListeningRef.current(false)
      const next = cycleRef.current + 1
      cycleRef.current = next
      setCycle(next)
      setPhase('inhale')
      setProgress(0)
      setLiveQuality(null)
      runProgress(INHALE_MS)
      timerRef.current = window.setTimeout(() => {
        beginExhaleRef.current()
      }, INHALE_MS)
    }

    beginExhaleRef.current = () => {
      setPhase('exhale')
      setProgress(0)
      samplesRef.current = []
      setListeningRef.current(true)
      runProgress(EXHALE_MS)
      timerRef.current = window.setTimeout(() => {
        afterExhaleRef.current()
      }, EXHALE_MS)
    }

    afterExhaleRef.current = () => {
      setListeningRef.current(false)
      const quality = scoreExhale(samplesRef.current)
      samplesRef.current = []
      setLiveQuality(quality)
      const n = cycleRef.current
      setResults((prev) => [...prev, { ...quality, cycle: n }])

      if (cycleRef.current >= cyclesRef.current) {
        setPhase('done')
        setProgress(1)
        return
      }

      setPhase('rest')
      setProgress(0)
      runProgress(REST_MS)
      timerRef.current = window.setTimeout(() => {
        beginInhaleRef.current()
      }, REST_MS)
    }
  }, [runProgress])

  useEffect(() => {
    if (phase === 'exhale' && sample.timestamp > 0) {
      samplesRef.current.push(sample)
      if (samplesRef.current.length % 8 === 0) {
        setLiveQuality(scoreExhale(samplesRef.current))
      }
    }
  }, [phase, sample])

  const start = useCallback(() => {
    clearTimers()
    setResults([])
    setLiveQuality(null)
    cycleRef.current = 0
    setCycle(0)
    beginInhaleRef.current()
  }, [clearTimers])

  const stop = useCallback(() => {
    clearTimers()
    setListeningRef.current(false)
    samplesRef.current = []
    setPhase('ready')
    setCycle(0)
    setProgress(0)
  }, [clearTimers])

  useEffect(() => () => clearTimers(), [clearTimers])

  const averageScore =
    results.length === 0
      ? null
      : Math.round(results.reduce((a, r) => a + r.score, 0) / results.length)

  return {
    phase,
    cycle,
    cycles,
    progress,
    results,
    liveQuality,
    averageScore,
    start,
    stop,
    inhaleMs: INHALE_MS,
    exhaleMs: EXHALE_MS,
  }
}
