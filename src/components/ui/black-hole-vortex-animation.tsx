"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * The original effect animated 150 infinite paths, which kept the main thread
 * busy enough to delay the wallet modal by seconds. A smaller field looks just
 * as good and leaves the UI responsive.
 */
const PATH_COUNT = 40;

function generatePaths(seed: number) {
  const random = (() => {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  })();

  // Trigonometry (`Math.cos`/`Math.sin`) is not bit-for-bit identical across
  // JS engines, so the server (Node/V8) and the client (Chrome/V8) can disagree
  // on the last float digit — which React reports as a hydration mismatch on
  // the SVG `d` attribute. Rounding every coordinate to a fixed precision makes
  // the rendered string deterministic everywhere.
  const coordinate = (value: number) => value.toFixed(2);

  return Array.from({ length: PATH_COUNT }, (_, i) => {
    const startAngle = random() * Math.PI * 2;
    const startRadius = 250 + random() * 250;

    const startX = 348 + startRadius * Math.cos(startAngle);
    const startY = 158 + startRadius * Math.sin(startAngle) * 0.5;

    const endX = 348;
    const endY = 158;

    const twist = Math.PI / 2 + (random() - 0.5) * Math.PI / 2;
    const cp1Angle = startAngle - twist;
    const cp1Radius = startRadius * 0.7;
    const cp1x = 348 + cp1Radius * Math.cos(cp1Angle);
    const cp1y = 158 + cp1Radius * Math.sin(cp1Angle) * 0.6;

    const cp2Angle = startAngle - twist / 2;
    const cp2Radius = startRadius * 0.3;
    const cp2x = 348 + cp2Radius * Math.cos(cp2Angle);
    const cp2y = 158 + cp2Radius * Math.sin(cp2Angle) * 0.8;

    return {
      id: i,
      d: `M ${coordinate(startX)} ${coordinate(startY)} C ${coordinate(cp1x)} ${coordinate(cp1y)}, ${coordinate(cp2x)} ${coordinate(cp2y)}, ${coordinate(endX)} ${coordinate(endY)}`,
      width: 0.25 + random() * 0.5,
      opacity: 0.1 + random() * 0.4,
      duration: 6 + random() * 8,
      delay: random() * 10,
    };
  });
}

/** Stops the infinite animation whenever the tab is hidden. */
function useDocumentVisible() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== 'hidden');

    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  return visible;
}

function BlackHoleEffect() {
  const paths = useMemo(() => generatePaths(12345), []);
  const isVisible = useDocumentVisible();

  return (
        <div className="absolute inset-0 pointer-events-none">
            <svg
                className="w-full h-full text-slate-200" // Lighter color for particles on black bg
                viewBox="0 0 696 316"
                fill="none"
                preserveAspectRatio="xMidYMid slice"
            >
                <title>Beautiful Black Hole Effect</title>
                {/* Definitions for gradients */}
                <defs>
                    <radialGradient id="blackHoleGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                        <stop offset="0%" stopColor="rgba(0,0,0,1)" />
                        <stop offset="50%" stopColor="rgba(10,10,10,1)" />
                        <stop offset="70%" stopColor="rgba(15, 23, 42, 0.8)" />
                        <stop offset="100%" stopColor="rgba(15, 23, 42, 0)" />
                    </radialGradient>
                </defs>

                {/* The central black hole element, now larger */}
                <circle cx="348" cy="158" r="40" fill="url(#blackHoleGradient)" />
                <circle cx="348" cy="158" r="5" fill="black" />

                {/* Animated paths being pulled into the black hole */}
                {isVisible &&
                    paths.map((path) => (
                        <motion.path
                            key={path.id}
                            d={path.d}
                            stroke="currentColor"
                            strokeWidth={path.width}
                            strokeOpacity={path.opacity}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{
                                pathLength: 1,
                                opacity: [0, 1, 0], // Fade in, then fade out as it reaches the center
                            }}
                            transition={{
                                duration: path.duration,
                                repeat: Number.POSITIVE_INFINITY,
                                ease: "linear",
                                delay: path.delay,
                            }}
                        />
                    ))}
            </svg>
        </div>
    );
}


// This is the main component that sets up the scene.
export function BlackHoleScene({
    title = "Into the Void",
    children,
}: {
    title?: string;
    children?: React.ReactNode;
}) {
    const words = title.split(" ");

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-black text-white">
            {/* The background effect, kept behind the hero and its overlapping content */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[110vh]">
                <BlackHoleEffect />
            </div>

            {/* The centered, animated title with a new glow effect and color gradient */}
            <div className="relative z-10 flex min-h-screen items-center justify-center px-4 text-center md:px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="max-w-4xl mx-auto"
                >
                    <h1
                        className="text-5xl sm:text-7xl md:text-8xl font-bold mb-8 tracking-tighter"
                        style={{ textShadow: '0 0 15px rgba(255, 255, 255, 0.4), 0 0 25px rgba(255, 255, 255, 0.2)' }}
                    >
                        {words.map((word, wordIndex) => (
                            <span
                                key={wordIndex}
                                className="inline-block mr-4 last:mr-0"
                            >
                                {word.split("").map((letter, letterIndex) => (
                                    <motion.span
                                        key={`${wordIndex}-${letterIndex}`}
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{
                                            delay: 0.5 + wordIndex * 0.1 + letterIndex * 0.03,
                                            type: "spring",
                                            stiffness: 150,
                                            damping: 15,
                                        }}
                                        className="inline-block text-transparent bg-clip-text
                                        bg-gradient-to-r from-white via-neutral-200 to-neutral-400"
                                    >
                                        {letter}
                                    </motion.span>
                                ))}
                            </span>
                        ))}
                    </h1>
                </motion.div>
            </div>

            {/* Main content overlapping the bottom of the hero, so it reads as one screen */}
            {children && (
                <div className="relative z-10 mx-auto -mt-24 w-full max-w-7xl px-4 pb-16 sm:px-6 md:-mt-32">
                    {children}
                </div>
            )}
        </div>
    );
}
