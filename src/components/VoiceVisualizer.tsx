import React, { useEffect, useRef } from 'react';

interface VoiceVisualizerProps {
  active: boolean;
  isPartnerSpeaking: boolean;
  isMuted: boolean;
  inputLevelRef: React.MutableRefObject<number>;
  outputLevelRef: React.MutableRefObject<number>;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  active,
  isPartnerSpeaking,
  isMuted,
  inputLevelRef,
  outputLevelRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bars = 36;
    const barHeights = new Float32Array(bars).fill(0.08);
    let rafId = 0;
    let phase = 0;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const level = active
        ? isPartnerSpeaking
          ? Math.max(0.18, outputLevelRef.current)
          : isMuted
          ? 0.04
          : Math.max(0.06, inputLevelRef.current)
        : 0.04;

      phase += active ? (isPartnerSpeaking ? 0.14 : 0.08) : 0.02;

      const barGap = 4;
      const totalGap = barGap * (bars - 1);
      const barWidth = Math.max(2, (width - totalGap) / bars);
      const centerY = height / 2;

      const color = !active
        ? '#CBD5E1'
        : isPartnerSpeaking
        ? '#0F6B5E'
        : isMuted
        ? '#9CA3AF'
        : '#1F2937';

      ctx.fillStyle = color;

      for (let i = 0; i < bars; i++) {
        const normPos = (i / (bars - 1)) * 2 - 1; // -1 to 1
        const envelope = Math.exp(-normPos * normPos * 2.4);
        const wave = 0.55 + 0.45 * Math.sin(phase + i * 0.52);
        const target = active ? Math.max(0.08, level * envelope * wave) : 0.08;
        barHeights[i] += (target - barHeights[i]) * 0.24;

        const h = Math.max(3, barHeights[i] * (height - 8));
        const x = i * (barWidth + barGap);
        const y = centerY - h / 2;
        const radius = Math.min(2, barWidth / 2);

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, h, radius);
        ctx.fill();
      }

      ctx.restore();
      rafId = window.requestAnimationFrame(render);
    };

    rafId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(rafId);
  }, [active, isPartnerSpeaking, isMuted, inputLevelRef, outputLevelRef]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-14 block"
      aria-hidden="true"
    />
  );
};
