"use client"

import { Analytics as VercelAnalytics } from "@vercel/analytics/react"

interface AnalyticsProps {
  debug?: boolean
}

export function Analytics({ debug = false }: AnalyticsProps) {
  return <VercelAnalytics debug={debug} />
}
