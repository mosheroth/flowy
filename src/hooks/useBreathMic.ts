import { useCallback, useEffect, useRef, useState } from 'react'
import { BreathMic, type BreathSample } from '../lib/audioBreath'

export type MicStatus = 'idle' | 'requesting' | 'live' | 'denied' | 'error'

export function useBreathMic() {
  const micRef = useRef<BreathMic | null>(null)
  const [status, setStatus] = useState<MicStatus>('idle')
  const [sample, setSample] = useState<BreathSample>({
    level: 0,
    velocity: 0,
    speed: 0,
    timestamp: 0,
  })
  const listeningRef = useRef(false)

  const start = useCallback(async (): Promise<boolean> => {
    if (micRef.current) return true
    setStatus('requesting')
    const mic = new BreathMic()
    try {
      await mic.start((s) => {
        if (listeningRef.current) setSample(s)
        else {
          setSample({
            level: 0,
            velocity: 0,
            speed: 0,
            timestamp: s.timestamp,
          })
        }
      })
      micRef.current = mic
      setStatus('live')
      return true
    } catch (err) {
      mic.stop()
      const name = err instanceof DOMException ? err.name : ''
      setStatus(name === 'NotAllowedError' ? 'denied' : 'error')
      return false
    }
  }, [])

  const stop = useCallback(() => {
    micRef.current?.stop()
    micRef.current = null
    listeningRef.current = false
    setStatus('idle')
    setSample({ level: 0, velocity: 0, speed: 0, timestamp: 0 })
  }, [])

  const setListening = useCallback((on: boolean) => {
    listeningRef.current = on
    if (!on) {
      setSample((s) => ({ ...s, level: 0, velocity: 0, speed: 0 }))
    }
  }, [])

  useEffect(() => () => micRef.current?.stop(), [])

  return { status, sample, start, stop, setListening, isLive: status === 'live' }
}
