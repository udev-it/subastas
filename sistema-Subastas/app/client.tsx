"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import Footer from "@/components/footer"
import AnimatedBackground from "@/components/animated-background"
import NoScriptStyles from "@/components/noscript-styles"
import { Inter } from "next/font/google"

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NoScriptStyles />
      <style jsx global>{`
        :root {
          --font-mono: ui-monospace, SFMono-Regular, "Roboto Mono", Menlo, Monaco, "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        }
      `}</style>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        <div className={cn("min-h-screen bg-background font-sans antialiased", fontSans.variable)}>
          <noscript>
            <div className="bg-yellow-100 dark:bg-yellow-900 p-4 text-center text-sm">
              Para una mejor experiencia, por favor habilita JavaScript. Algunas funciones pueden estar limitadas sin él.
            </div>
          </noscript>
          <AnimatedBackground />
          <main className="flex-1 relative z-10">{children}</main>
          <Footer />
        </div>
      </ThemeProvider>
    </>
  )
}
