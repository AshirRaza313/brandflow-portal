"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useValtrioxStore } from "@/store/brandflow-store";
import { useMemo } from "react";

const EVENT_ICONS = ["🎉", "✨", "🌟", "🎊", "🎪", "🎆", "🎇", "🪔", "🎀"];

interface FloatingIcon {
  id: number;
  icon: string;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  rotationStart: number;
  rotationEnd: number;
}

function getRandomIcon(): string {
  return EVENT_ICONS[Math.floor(Math.random() * EVENT_ICONS.length)];
}

// Use a seeded approach so icons are stable per render
function generateIcons(seed: number, count: number): FloatingIcon[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    icon: getRandomIcon(),
    x: ((seed * 13 + i * 37) % 97) + 1,
    y: ((seed * 17 + i * 23) % 93) + 3,
    size: 16 + ((i * 7 + seed * 3) % 21),
    delay: ((i * 11 + seed * 5) % 50) / 10,
    duration: 8 + ((i * 13 + seed * 7) % 13),
    rotationStart: (i * 45 + seed * 30) % 360,
    rotationEnd: (i * 67 + seed * 41) % 360,
  }));
}

export function FloatingEventIcons() {
  const { eventThemingEnabled, floatingIconsEnabled, activeEventTheme } =
    useValtrioxStore();

  const shouldShow = eventThemingEnabled && floatingIconsEnabled && !!activeEventTheme;

  const icons = useMemo(() => {
    if (!shouldShow) return [];
    return generateIcons(42, 8);
  }, [shouldShow]);

  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      {icons.length > 0 && (
        <motion.div
          key="floating-event-icons"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 pointer-events-none z-[100] overflow-hidden"
        >
          {icons.map((icon) => (
            <motion.div
              key={icon.id}
              className="absolute select-none"
              style={{
                left: `${icon.x}%`,
                top: `${icon.y}%`,
                fontSize: `${icon.size}px`,
              }}
              animate={{
                y: [-10, 10, -10],
                x: [-5, 5, -5],
                rotate: [icon.rotationStart, icon.rotationEnd],
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{
                duration: icon.duration,
                delay: icon.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {icon.icon}
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
