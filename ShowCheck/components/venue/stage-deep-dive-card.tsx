"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Box, Mic2, Lightbulb, Wine } from "lucide-react"
import type { Stage } from "@/lib/venue-types"

interface StageDeepDiveCardProps {
  stage: Stage
}

function SpecBlock({
  title,
  icon: Icon,
  spec,
}: {
  title: string
  icon: React.ElementType
  spec: Record<string, unknown> | null | undefined
}) {
  if (!spec || typeof spec !== "object") {
    return (
      <div>
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-1">
          <Icon className="w-3.5 h-3.5" />
          {title}
        </h4>
        <p className="text-sm text-muted-foreground">—</p>
      </div>
    )
  }
  const entries = Object.entries(spec).filter(([, v]) => v != null && v !== "")
  if (entries.length === 0) {
    return (
      <div>
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-1">
          <Icon className="w-3.5 h-3.5" />
          {title}
        </h4>
        <p className="text-sm text-muted-foreground">—</p>
      </div>
    )
  }
  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5" />
        {title}
      </h4>
      <ul className="text-sm text-foreground space-y-0.5">
        {entries.map(([k, v]) => (
          <li key={k}>
            <span className="text-muted-foreground">{k}:</span>{" "}
            {typeof v === "object" ? JSON.stringify(v) : String(v)}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function StageDeepDiveCard({ stage }: StageDeepDiveCardProps) {
  const cap = stage.legal_capacity ?? stage.comfort_capacity ?? stage.capacity
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Box className="w-4 h-4 text-primary" />
          {stage.name}
          {cap != null && (
            <span className="text-sm font-normal text-muted-foreground">Cap. {cap}</span>
          )}
        </CardTitle>
        <CardDescription className="text-xs">Tech rider & operations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <SpecBlock title="Sound / PA" icon={Mic2} spec={stage.audio_specs} />
          <SpecBlock title="Lighting" icon={Lightbulb} spec={stage.lighting_specs} />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Wine className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Bars:</span>
          <span className="font-medium text-foreground">
            {stage.bar_count != null ? stage.bar_count : "—"}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
