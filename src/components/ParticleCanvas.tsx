'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

const PARTICLE_COUNT = 80;
const CONNECT_DISTANCE = 100;
const MOUSE_RADIUS = 160;
const REPEL_RADIUS = 220;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface ParticleCanvasProps {
  fullPage?: boolean;
  variant?: 'viewport' | 'document';
}

function getParticleCount(width: number, height: number, documentMode: boolean) {
  if (!documentMode) return PARTICLE_COUNT;
  return Math.min(380, Math.max(180, Math.floor((width * height) / 5000)));
}

function getMotionConfig(documentMode: boolean) {
  if (!documentMode) {
    return {
      speed: 1.1,
      pull: 0.05,
      push: 0.035,
      damping: 0.992,
      drift: 0.04,
    };
  }

  return {
    speed: 2.4,
    pull: 0.09,
    push: 0.06,
    damping: 0.996,
    drift: 0.08,
  };
}

/**
 * Particle canvas — renders only in dark mode. In light mode the component
 * returns null so the background stays clean. The internal `Inner` component
 * holds the canvas + animation loop so it mounts/unmounts cleanly when the
 * theme toggle is flipped.
 */
export function ParticleCanvas(props: ParticleCanvasProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Wait for next-themes to hydrate before deciding whether to render.
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (resolvedTheme === 'light') return null;

  return <Inner {...props} />;
}

function Inner({ fullPage = false, variant = 'viewport' }: ParticleCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const documentMode = fullPage && variant === 'document';

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId = 0;
    let width = 0;
    let height = 0;
    const mouse = { x: -1000, y: -1000, active: false };
    const particles: Particle[] = [];

    const resize = () => {
      const nextWidth = container.clientWidth;
      const nextHeight = container.clientHeight;
      const sizeChanged = nextWidth !== width || nextHeight !== height;

      width = nextWidth;
      height = nextHeight;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (sizeChanged) {
        initParticles();
      }
    };

    const initParticles = () => {
      particles.length = 0;
      const count = getParticleCount(width, height, documentMode);
      const motion = getMotionConfig(documentMode);

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * motion.speed,
          vy: (Math.random() - 0.5) * motion.speed,
          radius: Math.random() * 1.2 + 1,
        });
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      mouse.active = inside;
      if (inside) {
        mouse.x = event.clientX - rect.left;
        mouse.y = event.clientY - rect.top;
      } else {
        mouse.x = -1000;
        mouse.y = -1000;
      }
    };

    const animate = () => {
      const motion = getMotionConfig(documentMode);
      ctx.clearRect(0, 0, width, height);

      for (const particle of particles) {
        if (mouse.active) {
          const dx = mouse.x - particle.x;
          const dy = mouse.y - particle.y;
          const distance = Math.hypot(dx, dy);

          if (distance > 0 && distance < MOUSE_RADIUS) {
            const pull = ((MOUSE_RADIUS - distance) / MOUSE_RADIUS) * motion.pull;
            particle.vx += (dx / distance) * pull;
            particle.vy += (dy / distance) * pull;
          } else if (distance > MOUSE_RADIUS && distance < REPEL_RADIUS) {
            const push = ((REPEL_RADIUS - distance) / REPEL_RADIUS) * motion.push;
            particle.vx -= (dx / distance) * push;
            particle.vy -= (dy / distance) * push;
          }
        }

        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= motion.damping;
        particle.vy *= motion.damping;
        particle.vx += (Math.random() - 0.5) * motion.drift;
        particle.vy += (Math.random() - 0.5) * motion.drift;

        if (particle.x < 0) particle.x = width;
        if (particle.x > width) particle.x = 0;
        if (particle.y < 0) particle.y = height;
        if (particle.y > height) particle.y = 0;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.45)';
        ctx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.hypot(dx, dy);

          if (distance < CONNECT_DISTANCE) {
            const alpha = 0.28 * (1 - distance / CONNECT_DISTANCE);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(100, 116, 139, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    resize();

    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    resizeObserver.observe(container);

    const pageRoot = container.parentElement;
    if (documentMode && pageRoot) {
      resizeObserver.observe(pageRoot);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', resize);

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', resize);
    };
  }, [documentMode]);

  return (
    <div
      ref={containerRef}
      className={
        documentMode
          ? 'pointer-events-none absolute inset-0 z-0 h-full min-h-full w-full'
          : fullPage
            ? 'pointer-events-none fixed inset-0 z-0'
            : 'absolute inset-0 z-0'
      }
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      />
    </div>
  );
}
