/** Mic analysis for exhalation airflow via sound intensity / velocity. */

export type BreathSample = {
  /** Smoothed RMS loudness 0–1 — proxy for airflow strength above noise. */
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

/**
 * After noise-floor subtraction: soft intentional hiss clears this;
 * room murmur usually does not.
 */
export const AUDIBLE_LEVEL = 0.045
const IDEAL_LEVEL_MIN = AUDIBLE_LEVEL
const IDEAL_LEVEL_MAX = 0.55
const HARSH_SPEED = 0.45
const SILENT_COVERAGE = 0.1
/** Mid gain: soft breath yes, ambient murmur no. */
const RMS_GAIN = 18
/** How far above the learned floor a sample must sit to count. */
const FLOOR_MARGIN = 1.35
const FLOOR_EXTRA = 0.02

export class BreathMic {
  private stream: MediaStream | null = null
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private highpass: BiquadFilterNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private timeData: Float32Array<ArrayBuffer> | null = null
  private freqData: Float32Array<ArrayBuffer> | null = null
  private raf = 0
  private running = false
  private calibrating = true
  private noiseFloor = 0.04
  private prevLevel = 0
  private prevTime = 0
  private onSample: ((sample: BreathSample) => void) | null = null

  async start(onSample: (sample: BreathSample) => void): Promise<void> {
    this.onSample = onSample
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        // AGC amplifies room noise when you are quiet — keep it off.
        autoGainControl: false,
      },
      video: false,
    })
    this.ctx = new AudioContext()
    if (this.ctx.state === 'suspended') await this.ctx.resume()
    this.source = this.ctx.createMediaStreamSource(this.stream)

    // Breath hiss lives mid/high; cut rumble and low room noise.
    this.highpass = this.ctx.createBiquadFilter()
    this.highpass.type = 'highpass'
    this.highpass.frequency.value = 400
    this.highpass.Q.value = 0.7

    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 2048
    this.analyser.smoothingTimeConstant = 0.35
    this.source.connect(this.highpass)
    this.highpass.connect(this.analyser)

    this.timeData = new Float32Array(this.analyser.fftSize) as Float32Array<ArrayBuffer>
    this.freqData = new Float32Array(this.analyser.frequencyBinCount) as Float32Array<ArrayBuffer>
    this.noiseFloor = 0.04
    this.prevLevel = 0
    this.prevTime = performance.now()
    this.calibrating = true
    this.running = true
    this.tick()
  }

  /** While true, samples update the ambient floor (inhale / idle). */
  setCalibrating(on: boolean): void {
    this.calibrating = on
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.raf)
    this.source?.disconnect()
    this.highpass?.disconnect()
    void this.ctx?.close()
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.ctx = null
    this.analyser = null
    this.highpass = null
    this.source = null
    this.timeData = null
    this.freqData = null
    this.onSample = null
  }

  private readRaw(): number {
    if (!this.analyser || !this.timeData || !this.freqData || !this.ctx) return 0
    this.analyser.getFloatTimeDomainData(this.timeData)
    let sum = 0
    for (let i = 0; i < this.timeData.length; i++) {
      const v = this.timeData[i]!
      sum += v * v
    }
    const rms = Math.sqrt(sum / this.timeData.length)

    this.analyser.getFloatFrequencyData(this.freqData)
    const binHz = this.ctx.sampleRate / this.analyser.fftSize
    // Prefer 1–5 kHz energy — typical for soft turbulent breath hiss.
    const lo = Math.max(1, Math.floor(1000 / binHz))
    const hi = Math.min(this.freqData.length - 1, Math.floor(5000 / binHz))
    let hiss = 0
    let n = 0
    for (let i = lo; i <= hi; i++) {
      // dB values are negative; map a useful slice into 0–1.
      const db = this.freqData[i]!
      hiss += Math.max(0, Math.min(1, (db + 90) / 55))
      n++
    }
    const hissLevel = n > 0 ? hiss / n : 0

    const broadband = Math.min(1, Math.pow(rms * RMS_GAIN, 0.9))
    // Weight spectral hiss so flat room noise is less likely to win.
    return Math.min(1, broadband * 0.45 + hissLevel * 0.55)
  }

  private tick = (): void => {
    if (!this.running || !this.onSample) return
    const raw = this.readRaw()

    if (this.calibrating) {
      this.noiseFloor = this.noiseFloor * 0.92 + raw * 0.08
      this.prevLevel = 0
      this.prevTime = performance.now()
      this.onSample({
        level: 0,
        velocity: 0,
        speed: 0,
        timestamp: this.prevTime,
      })
      this.raf = requestAnimationFrame(this.tick)
      return
    }

    const gate = this.noiseFloor * FLOOR_MARGIN + FLOOR_EXTRA
    const excess = raw > gate ? Math.min(1, (raw - this.noiseFloor) / Math.max(0.15, 1 - this.noiseFloor)) : 0
    const level = this.prevLevel * 0.55 + excess * 0.45
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
  else if (meanLevel < 0.12) label = 'gentle'
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
