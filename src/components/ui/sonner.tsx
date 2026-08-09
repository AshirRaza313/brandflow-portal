"use client"

import { useEffect, useState } from "react"
import { Toaster as Sonner, ToasterProps } from "sonner"
import { useValtrioxStore } from "@/store/brandflow-store"

/**
 * Toaster wrapper that avoids React #418 hydration mismatch.
 *
 * Root cause: useValtrioxStore reads `appTheme` from localStorage during
 * initialization. On the server, localStorage is unavailable so the store
 * returns the default ("premium-dark"). On the client's first render
 * (hydration), the store reads localStorage and may return a different
 * value (e.g. "light"). This makes the Sonner `theme` prop differ between
 * server HTML and client HTML → React #418.
 *
 * Fix: Render the Toaster with a FIXED theme ("light") during SSR and the
 * first client render. After mount (useEffect), switch to the user's
 * saved theme. This guarantees server HTML === first client HTML, so
 * hydration succeeds. The theme updates a frame later — invisible to users.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const appTheme = useValtrioxStore((s) => s.appTheme)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR and first client render, use "light" (matches the default
  // server-side store value). After mount, use the actual saved theme.
  const effectiveTheme = mounted
    ? (appTheme === "light" ? "light" : "dark")
    : "light"

  return (
    <Sonner
      theme={effectiveTheme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
