"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  FileText,
  AlertCircle,
  MapPin,
  Truck,
  MessageSquare,
  Type,
} from "lucide-react"

export type AdvanceSectionType =
  | "intro"
  | "rider_disclaimer"
  | "venue_heading"
  | "loadin"
  | "custom"

export interface AdvanceSectionBlock {
  id: string
  type: AdvanceSectionType
  heading: string
  body: string
}

const SECTION_TYPE_OPTIONS: { value: AdvanceSectionType; label: string; icon: React.ElementType }[] = [
  { value: "intro", label: "Intro / welcome", icon: MessageSquare },
  { value: "rider_disclaimer", label: "Rider disclaimer", icon: AlertCircle },
  { value: "venue_heading", label: "Venue details heading", icon: MapPin },
  { value: "loadin", label: "Load-in instructions", icon: Truck },
  { value: "custom", label: "Custom text", icon: Type },
]

const DEFAULT_HEADING: Record<AdvanceSectionType, string> = {
  intro: "Welcome",
  rider_disclaimer: "Rider & backline",
  venue_heading: "Venue & contact",
  loadin: "Load-in / load-out",
  custom: "Notes",
}

const DEFAULT_BODY: Record<AdvanceSectionType, string> = {
  intro: "Thanks for playing. Below you’ll find the run of show and venue info.",
  rider_disclaimer: "Rider and backline details are as per your contract. Contact the venue with any questions.",
  venue_heading: "",
  loadin: "Load-in and load-out times are in the run of show. Please coordinate with production.",
  custom: "",
}

/** Stored shape in DB: { blocks: { type, heading, body }[] } */
export function sectionsToStorage(blocks: AdvanceSectionBlock[]): Record<string, unknown> {
  return {
    blocks: blocks.map(({ type, heading, body }) => ({ type, heading, body })),
  }
}

export function storageToSections(sections: Record<string, unknown> | null): AdvanceSectionBlock[] {
  const raw = sections?.blocks
  if (!Array.isArray(raw)) return []
  return raw.map((b: { type?: string; heading?: string; body?: string }, i: number) => ({
    id: `block-${i}`,
    type: (b.type as AdvanceSectionType) ?? "custom",
    heading: typeof b.heading === "string" ? b.heading : DEFAULT_HEADING.custom,
    body: typeof b.body === "string" ? b.body : "",
  }))
}

interface AdvanceTemplateSectionsEditorProps {
  blocks: AdvanceSectionBlock[]
  onChange: (blocks: AdvanceSectionBlock[]) => void
}

export function AdvanceTemplateSectionsEditor({ blocks, onChange }: AdvanceTemplateSectionsEditorProps) {

  const addBlock = (type: AdvanceSectionType) => {
    onChange([
      ...blocks,
      {
        id: `block-${Date.now()}`,
        type,
        heading: DEFAULT_HEADING[type],
        body: DEFAULT_BODY[type],
      },
    ])
  }

  const updateBlock = (id: string, updates: Partial<Pick<AdvanceSectionBlock, "heading" | "body">>) => {
    onChange(
      blocks.map((b) => (b.id === id ? { ...b, ...updates } : b))
    )
  }

  const removeBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id))
  }

  const moveBlock = (index: number, direction: "up" | "down") => {
    const next = [...blocks]
    const target = direction === "up" ? index - 1 : index + 1
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Label className="text-sm text-muted-foreground shrink-0">Add section</Label>
        <Select
          key={blocks.length}
          value=""
          onValueChange={(v) => {
            if (v) addBlock(v as AdvanceSectionType)
          }}
        >
          <SelectTrigger className="w-[260px] gap-1.5">
            <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
            <SelectValue placeholder="Choose a section type…" />
          </SelectTrigger>
          <SelectContent>
            {SECTION_TYPE_OPTIONS.map((opt) => {
              const Icon = opt.icon
              return (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    {opt.label}
                  </span>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 py-8 text-center">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-2 opacity-60" />
          <p className="text-sm text-muted-foreground">No sections yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add sections above to build the default content for your advance pages.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {blocks.map((block, index) => {
            const opt = SECTION_TYPE_OPTIONS.find((o) => o.value === block.type)
            const Icon = opt?.icon ?? Type
            const hasBody = block.type !== "venue_heading"
            return (
              <li key={block.id}>
                <Card className="border-border bg-card">
                  <CardHeader className="py-3 px-4 flex flex-row items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Input
                        value={block.heading}
                        onChange={(e) => updateBlock(block.id, { heading: e.target.value })}
                        placeholder="Section heading"
                        className="font-medium border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 h-auto"
                      />
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveBlock(index, "up")}
                        disabled={index === 0}
                        aria-label="Move up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveBlock(index, "down")}
                        disabled={index === blocks.length - 1}
                        aria-label="Move down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeBlock(block.id)}
                        aria-label="Remove section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  {hasBody && (
                    <CardContent className="pt-0 px-4 pb-4">
                      <Textarea
                        value={block.body}
                        onChange={(e) => updateBlock(block.id, { body: e.target.value })}
                        placeholder="Section content (optional)"
                        rows={3}
                        className="resize-none text-sm"
                      />
                    </CardContent>
                  )}
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
