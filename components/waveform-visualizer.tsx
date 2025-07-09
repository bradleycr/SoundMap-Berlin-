"use client"

import { useEffect, useRef } from "react"

interface WaveformVisualizerProps {
  stream: MediaStream | null
  isRecording: boolean
  width?: number
  height?: number
  barWidth?: number
  barGap?: number
  backgroundColor?: string
  barColor?: string
}

/**
 * Renders a live audio waveform for a given MediaStream using the Canvas API.
 */
export function WaveformVisualizer({
  stream,
  isRecording,
  width = 300,
  height = 75,
  barWidth = 2,
  barGap = 1,
  backgroundColor = "transparent",
  barColor = "#98ddca", // mint-400 from tailwind.config.ts
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameId = useRef<number>()

  useEffect(() => {
    if (!stream || !isRecording || !canvasRef.current) return

    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    if (!context) return

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    
    // Configure analyser
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.7
    
    source.connect(analyser)

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      if (!isRecording) {
         context.clearRect(0, 0, width, height);
         return;
      }

      animationFrameId.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)
      
      context.clearRect(0, 0, width, height)
      context.fillStyle = backgroundColor
      context.fillRect(0, 0, width, height)

      const totalBarWidth = barWidth + barGap
      const numBars = Math.floor(width / totalBarWidth)
      let x = 0

      for (let i = 0; i < numBars; i++) {
        const barHeight = (dataArray[i] / 255) * height
        context.fillStyle = barColor
        context.fillRect(x, height - barHeight, barWidth, barHeight)
        x += totalBarWidth
      }
    }

    draw()

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
      }
      if (audioContext.state !== "closed") {
        audioContext.close()
      }
    }
  }, [stream, isRecording, width, height, barWidth, barGap, backgroundColor, barColor])

  return <canvas ref={canvasRef} width={width} height={height} className="mx-auto" />
}
