/** Mic analysis for exhalation airflow via sound intensity / velocity. */

export type BreathSample = {
  /** Smoothed RMS loudness 0–1 — proxy for airflow strength. */
  level: number
  /** Rate of change of level — exhalation sound velocity. */
  velocity: number
  /** Absolute velocity magnitude. */
  speed: number
  timestamp: number
}

export type ExhaleQuality = {
  /** 0–100 overall quality for this exhale. */
  score: number
  /** Mean airflow level while sound was present. */
  meanLevel: number
  /** Mean absolute velocity (steadier = lower). */
  meanSpeed: number
  /** Fraction of exhale frames with audible breath. */
  coverage: number
  label: 'silent' | 'harsh' | 'uneven' | 'steady' | 'gentle'
}

/** Soft breath noise often sits well below speech — keep the floor low. */
export const AUDIBLE_LEVEL = 0.012
const IDEAL_LEVEL_MIN = AUDIBLE_LEVEL
const IDEAL_LEVEL_MAX = 0.55
const HARSH_SPEED = 0.45
const SILENT_COVERAGE = 0.08
/** Gain so quiet hiss registers without shouting. */
const RMS_GAIN = 36

export class BreathMic {
  private stream: MediaStream | null = null
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private data: Float32Array<ArrayBuffer> | null = null
  private raf = 0
  private running = false
  private prevLevel = 0
  private prevTime = 0
  private onSample: ((sample: BreathSample) => void) | null = null

  async start(onSample: (sample: BreathSample) => void): Promise<void> {
    this.onSample = onSample
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        // Soft breath needs whatever gain the OS can give.
        autoGainControl: true,
      },
      video: false,
    })
    this.ctx = new AudioContext()
    if (this.ctx.state === 'suspended') await this.ctx.resume()
    this.source = this.ctx.createMediaStreamSource(this.stream)
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 1024
    this.analyser.smoothingTimeConstant = 0.05
    this.source.connect(this.analyser)
    this.data = new Float32Array(this.analyser.fftSize) as Float32Array<ArrayBuffer>
    this.prevLevel = 0
    this.prevTime = performance.now()
    this.running = true
    this.tick()
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.raf)
    this.source?.disconnect()
    void this.ctx?.close()
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.ctx = null
    this.analyser = null
    this.source = null
    this.data = null
    this.onSample = null
  }

  private tick = (): void => {
    if (!this.running || !this.analyser || !this.data || !this.onSample) return
    this.analyser.getFloatTimeDomainData(this.data)
    let sum = 0
    for (let i = 0; i < this.data.length; i++) {
      const v = this.data[i]!
      sum += v * v
    }
    const rms = Math.sqrt(sum / this.data.length)
    // Soft compress into 0–1; high gain so quiet exhalation still moves the meter.
    const raw = Math.min(1, Math.pow(rms * RMS_GAIN, 0.85))
    const level = this.prevLevel * 0.45 + raw * 0.55
    const now = performance.now()
    const dt = Math.max(0.016, (now - this.prevTime) / 1000)
    const velocity = (level - this.prevLevel) / dt
    const speed = Math.abs(velocity)
    this.prevLevel = level
    this.prevTime = now
    this.onSample({ level, velocity, speed, timestamp: now })
    this.raf = requestAnimationFrame(this.tick)
  }
}

export function scoreExhale(samples: BreathSample[]): ExhaleQuality {
  if (samples.length < 4) {
    return {
      score: 0,
      meanLevel: 0,
      meanSpeed: 0,
      coverage: 0,
      label: 'silent',
    }
  }

  const audible = samples.filter((s) => s.level >= IDEAL_LEVEL_MIN)
  const coverage = audible.length / samples.length
  const pool = audible.length > 0 ? audible : samples
  const meanLevel = pool.reduce((a, s) => a + s.level, 0) / pool.length
  const meanSpeed = pool.reduce((a, s) => a + s.speed, 0) / pool.length

  if (coverage < SILENT_COVERAGE) {
    return {
      score: Math.round(coverage * 40),
      meanLevel,
      meanSpeed,
      coverage,
      label: 'silent',
    }
  }

  const levelCenter = (IDEAL_LEVEL_MIN + IDEAL_LEVEL_MAX) / 2
  const levelSpan = (IDEAL_LEVEL_MAX - IDEAL_LEVEL_MIN) / 2
  const levelFit = 1 - Math.min(1, Math.abs(meanLevel - levelCenter) / levelSpan)
  const speedFit = 1 - Math.min(1, meanSpeed / HARSH_SPEED)
  const coverageFit = Math.min(1, coverage / 0.4)

  const score = Math.round(
    Math.max(0, Math.min(100, (levelFit * 0.3 + speedFit * 0.35 + coverageFit * 0.35) * 100)),
  )

  let label: ExhaleQuality['label'] = 'steady'
  if (meanSpeed > HARSH_SPEED * 0.85) label = 'harsh'
  else if (speedFit < 0.55 || coverageFit < 0.45) label = 'uneven'
  else if (meanLevel < 0.1) label = 'gentle'
  else label = 'steady'

  return { score, meanLevel, meanSpeed, coverage, label }
}

export const QUALITY_COPY: Record<ExhaleQuality['label'], string> = {
  silent: 'We barely heard your breath — try a soft audible exhale.',
  harsh: 'Air rushed out too fast — slow the stream of sound.',
  uneven: 'The sound wavered — aim for a smooth, even hiss.',
  gentle: 'Soft and controlled — keep that gentle stream.',
  steady: 'Smooth airflow — that steady sound is the goal.',
}
