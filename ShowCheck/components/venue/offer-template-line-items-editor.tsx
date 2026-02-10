"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Plus, Trash2, ChevronUp, ChevronDown, DollarSign } from "lucide-react"

export interface LineItemRow {
  id: string
  description: string
  amount: number
}

/** Stored shape: array of { description, amount } */
export function lineItemsToStorage(rows: LineItemRow[]): unknown[] {
  return rows.map(({ description, amount }) => ({ description, amount }))
}

export function storageToLineItems(items: unknown[]): LineItemRow[] {
  if (!Array.isArray(items)) return []
  return items.map((item: { description?: string; amount?: number }, i: number) => ({
    id: `line-${i}`,
    description: typeof item?.description === "string" ? item.description : "",
    amount: typeof item?.amount === "number" ? item.amount : 0,
  }))
}

interface OfferTemplateLineItemsEditorProps {
  items: LineItemRow[]
  onChange: (items: LineItemRow[]) => void
}

export function OfferTemplateLineItemsEditor({ items, onChange }: OfferTemplateLineItemsEditorProps) {
  const addItem = () => {
    onChange([
      ...items,
      { id: `line-${Date.now()}`, description: "", amount: 0 },
    ])
  }

  const updateItem = (id: string, updates: Partial<Pick<LineItemRow, "description" | "amount">>) => {
    onChange(
      items.map((row) => (row.id === id ? { ...row, ...updates } : row))
    )
  }

  const removeItem = (id: string) => {
    onChange(items.filter((row) => row.id !== id))
  }

  const moveItem = (index: number, direction: "up" | "down") => {
    const next = [...items]
    const target = direction === "up" ? index - 1 : index + 1
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm text-muted-foreground">Line items</Label>
        <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Add line item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 py-6 text-center">
          <DollarSign className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-60" />
          <p className="text-sm text-muted-foreground">No line items yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add items like Guarantee, Bonus, or expenses. They’ll prefill when using this template.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((row, index) => (
            <li key={row.id}>
              <Card className="border-border bg-card">
                <CardContent className="py-3 px-4 flex flex-wrap items-center gap-3">
                  <Input
                    value={row.description}
                    onChange={(e) => updateItem(row.id, { description: e.target.value })}
                    placeholder="e.g. Guarantee, Bonus, Travel"
                    className="flex-1 min-w-[120px]"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={row.amount === 0 ? "" : row.amount}
                      onChange={(e) => {
                        const v = e.target.value.trim()
                        updateItem(row.id, { amount: v === "" ? 0 : Number(v) || 0 })
                      }}
                      placeholder="0"
                      className="w-24 font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveItem(index, "up")}
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
                      onClick={() => moveItem(index, "down")}
                      disabled={index === items.length - 1}
                      aria-label="Move down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(row.id)}
                      aria-label="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
