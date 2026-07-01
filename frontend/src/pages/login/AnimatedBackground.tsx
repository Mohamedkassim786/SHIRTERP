import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

// Pure SVG wireframe shirt - drawn with white strokes, zero fill, blends naturally
function WireframeShirt({ size = 280 }: { size?: number }) {
  const s = size;
  // All coordinates relative to viewBox 0 0 200 220
  return (
    <svg
      width={s}
      height={s * 1.1}
      viewBox="0 0 200 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.6)) drop-shadow(0 0 20px rgba(255,255,255,0.3))' }}
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* === Collar === */}
      {/* Left collar */}
      <path d="M 80 18 L 72 38 L 100 52 L 100 25" stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" strokeLinejoin="round" filter="url(#glow)" />
      {/* Right collar */}
      <path d="M 120 18 L 128 38 L 100 52 L 100 25" stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" strokeLinejoin="round" filter="url(#glow)" />
      {/* Collar back neckline */}
      <path d="M 80 18 Q 100 10 120 18" stroke="rgba(255,255,255,0.6)" strokeWidth="1" fill="none" />

      {/* === Left Sleeve === */}
      <path d="M 80 18 L 38 34 L 20 72 L 52 80 L 66 48 L 68 80" stroke="rgba(255,255,255,0.85)" strokeWidth="1.4" strokeLinejoin="round" filter="url(#glow)" />
      {/* Sleeve cuff */}
      <line x1="20" y1="72" x2="52" y2="80" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />

      {/* === Right Sleeve === */}
      <path d="M 120 18 L 162 34 L 180 72 L 148 80 L 134 48 L 132 80" stroke="rgba(255,255,255,0.85)" strokeWidth="1.4" strokeLinejoin="round" filter="url(#glow)" />
      {/* Sleeve cuff */}
      <line x1="180" y1="72" x2="148" y2="80" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />

      {/* === Body === */}
      {/* Left side body */}
      <path d="M 68 80 L 54 200 L 100 205" stroke="rgba(255,255,255,0.8)" strokeWidth="1.4" strokeLinejoin="round" filter="url(#glow)" />
      {/* Right side body */}
      <path d="M 132 80 L 146 200 L 100 205" stroke="rgba(255,255,255,0.8)" strokeWidth="1.4" strokeLinejoin="round" filter="url(#glow)" />
      {/* Bottom hem */}
      <path d="M 54 200 Q 100 210 146 200" stroke="rgba(255,255,255,0.6)" strokeWidth="1" fill="none" />

      {/* === Center Button Placket === */}
      <line x1="100" y1="52" x2="100" y2="200" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" strokeDasharray="3 3" />
      {/* Buttons */}
      {[80, 105, 130, 155, 178].map((y, i) => (
        <circle key={i} cx="100" cy={y} r="2" fill="rgba(255,255,255,0.5)" filter="url(#glow)" />
      ))}

      {/* === Chest Pocket === */}
      <rect x="68" y="90" width="20" height="16" rx="1" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" fill="none" />

      {/* === Subtle cross-hatch on body === */}
      <line x1="68" y1="110" x2="132" y2="110" stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" />
      <line x1="65" y1="135" x2="135" y2="135" stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" />
      <line x1="61" y1="160" x2="139" y2="160" stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" />
      <line x1="58" y1="182" x2="142" y2="182" stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" />
    </svg>
  );
}

function OrbitRing({ radius, duration, delay, opacity, dashed }: { radius: number; duration: number; delay: number; opacity: number; dashed?: boolean }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: radius * 2,
        height: radius * 2,
        border: `1px ${dashed ? 'dashed' : 'solid'} rgba(255,255,255,${opacity})`,
        left: '50%',
        top: '50%',
        marginLeft: -radius,
        marginTop: -radius,
        boxShadow: `0 0 6px rgba(255,255,255,${opacity * 0.3})`,
      }}
      animate={{ rotate: 360 }}
      transition={{ duration, repeat: Infinity, ease: 'linear', delay }}
    />
  );
}

function OrbiterDot({ orbitRadius, duration, delay, size = 4 }: { orbitRadius: number; duration: number; delay: number; size?: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: '50%', top: '50%' }}
      animate={{ rotate: 360 }}
      transition={{ duration, repeat: Infinity, ease: 'linear', delay }}
      transformTemplate={({ rotate }) => `rotate(${rotate}) translate(${orbitRadius}px, 0) rotate(-${rotate})`}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'white',
          marginLeft: -size / 2,
          marginTop: -size / 2,
          boxShadow: `0 0 ${size * 3}px ${size}px rgba(255,255,255,0.5)`,
        }}
      />
    </motion.div>
  );
}

function ScanLine() {
  return (
    <motion.div
      className="absolute left-0 right-0 h-px pointer-events-none"
      style={{
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 20%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.05) 80%, transparent 100%)',
        boxShadow: '0 0 8px 2px rgba(255,255,255,0.2)',
      }}
      animate={{ top: ['10%', '90%', '10%'] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function Particle({ x, y, delay, size }: { x: string; y: string; delay: number; size: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none rounded-full"
      style={{
        left: x, top: y, width: size, height: size,
        background: `radial-gradient(circle, rgba(255,255,255,0.9) 0%, transparent 100%)`,
        boxShadow: `0 0 ${size * 2}px rgba(255,255,255,0.4)`,
      }}
      animate={{ y: [0, -(40 + delay * 8), 0], opacity: [0, 1, 0], scale: [0, 1, 0] }}
      transition={{ duration: 3.5 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

export default function AnimatedBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothX = useSpring(mouseX, { damping: 35, stiffness: 250 });
  const smoothY = useSpring(mouseY, { damping: 35, stiffness: 250 });

  const bg1X = useTransform(smoothX, [-600, 600], [-10, 10]);
  const bg1Y = useTransform(smoothY, [-600, 600], [-10, 10]);
  const mid1X = useTransform(smoothX, [-600, 600], [-22, 22]);
  const mid1Y = useTransform(smoothY, [-600, 600], [-22, 22]);
  const fgX = useTransform(smoothX, [-600, 600], [-40, 40]);
  const fgY = useTransform(smoothY, [-600, 600], [-40, 40]);
  const glowX = useTransform(smoothX, [-600, 600], ['20%', '80%']);
  const glowY = useTransform(smoothY, [-600, 600], ['20%', '80%']);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      mouseX.set(e.clientX - r.left - r.width / 2);
      mouseY.set(e.clientY - r.top - r.height / 2);
    };
    el.addEventListener('mousemove', onMove);
    return () => el.removeEventListener('mousemove', onMove);
  }, [mouseX, mouseY]);

  const particles = [
    { x: '18%', y: '22%', delay: 0,   size: 3 }, { x: '75%', y: '18%', delay: 1.1, size: 2 },
    { x: '12%', y: '60%', delay: 2.2, size: 4 }, { x: '82%', y: '55%', delay: 0.5, size: 2 },
    { x: '42%', y: '12%', delay: 1.8, size: 3 }, { x: '65%', y: '78%', delay: 2.8, size: 3 },
    { x: '28%', y: '82%', delay: 0.9, size: 2 }, { x: '88%', y: '35%', delay: 1.5, size: 3 },
    { x: '55%', y: '88%', delay: 3.1, size: 2 }, { x: '8%',  y: '40%', delay: 2.4, size: 4 },
    { x: '92%', y: '70%', delay: 0.3, size: 2 }, { x: '38%', y: '92%', delay: 1.6, size: 3 },
  ];

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0ea5e9 100%)' }}>

      {/* Base gradient — subtle center glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(14,165,233,0.15)_0%,transparent_100%)]" />

      {/* Grid - Layer 1 (slowest parallax) */}
      <motion.div
        className="absolute inset-[-15%] w-[130%] h-[130%]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          x: bg1X, y: bg1Y,
        }}
      />

      {/* Mouse-tracking spotlight */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle 400px at ${glowX} ${glowY}, rgba(255,255,255,0.06) 0%, transparent 70%)`,
        }}
      />

      {/* Ambient white glow blob */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full blur-[180px] pointer-events-none"
        style={{ background: 'rgba(255,255,255,0.04)', x: bg1X, y: bg1Y }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Orbital rings — Layer 2 (medium parallax) */}
      <motion.div className="absolute inset-0 flex items-center justify-center" style={{ x: mid1X, y: mid1Y }}>
        <OrbitRing radius={155} duration={28}  delay={0} opacity={0.22} />
        <OrbitRing radius={210} duration={42}  delay={3} opacity={0.13} dashed />
        <OrbitRing radius={270} duration={60}  delay={7} opacity={0.08} />
        <OrbitRing radius={330} duration={80}  delay={0} opacity={0.05} dashed />

        {/* Orbiting dots */}
        <OrbiterDot orbitRadius={155} duration={9}  delay={0}  size={4} />
        <OrbiterDot orbitRadius={210} duration={14} delay={4}  size={3} />
        <OrbiterDot orbitRadius={155} duration={18} delay={9}  size={2} />
      </motion.div>

      {/* Wireframe Shirt — Layer 3 (max parallax) */}
      <motion.div
        className="absolute flex items-center justify-center pointer-events-none"
        style={{ x: fgX, y: fgY }}
      >
        {/* Radial glow behind shirt */}
        <motion.div
          className="absolute rounded-full blur-[80px]"
          style={{ width: 220, height: 220, background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 80%)' }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* The SVG shirt with scan line overlay */}
        <div className="relative" style={{ width: 280, height: 308 }}>
          <ScanLine />
          <motion.div
            animate={{ y: [-10, 10, -10], rotateX: [3, -3, 3] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          >
            <WireframeShirt size={280} />
          </motion.div>
        </div>
      </motion.div>

      {/* Particles — Layer 2 */}
      <motion.div className="absolute inset-0 pointer-events-none" style={{ x: mid1X, y: mid1Y }}>
        {particles.map((p, i) => <Particle key={i} {...p} />)}
      </motion.div>

      {/* Corner HUD brackets */}
      {[
        { style: { top: '6%',    left: '6%'   }, rotate: 0 },
        { style: { top: '6%',    right: '6%'  }, rotate: 90 },
        { style: { bottom: '6%', left: '6%'   }, rotate: 270 },
        { style: { bottom: '6%', right: '6%'  }, rotate: 180 },
      ].map((c, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none"
          style={{ ...c.style, rotate: c.rotate }}
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.7, ease: 'easeInOut' }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M0 16 L0 0 L16 0" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
          </svg>
        </motion.div>
      ))}

      {/* Edge vignettes */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 55%, rgba(24,24,27,0.6) 100%)'
      }} />
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-zinc-900 to-transparent pointer-events-none" />
    </div>
  );
}
