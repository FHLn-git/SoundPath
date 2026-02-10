"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useOfferTemplates } from "@/lib/use-offer-templates"
import {
  createOfferTemplate,
  updateOfferTemplate,
  deleteOfferTemplate,
} from "@/lib/offer-templates-api"
import type { OfferTemplateRow } from "@/lib/venue-types"
import {
  OfferTemplateLineItemsEditor,
  lineItemsToStorage,
  storageToLineItems,
  type LineItemRow,
} from "@/components/venue/offer-template-line-items-editor"
import { FileSignature, Plus, MoreHorizontal, Pencil, Trash2, FileText } from "lucide-react"

interface OfferTemplatesCardProps {
  venueId: string | null
  venueGroupId?: string | null
  onUseTemplate?: (template: OfferTemplateRow) => void
}

export function OfferTemplatesCard({
  venueId,
  venueGroupId = null,
  onUseTemplate,
}: OfferTemplatesCardProps) {
  const { templates, loading, error, refetch } = useOfferTemplates(venueId, venueGroupId ?? null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<OfferTemplateRow | null>(null)
  const [name, setName] = useState("")
  const [dealStructure, setDealStructure] = useState("")
  const [lineItems, setLineItems] = useState<LineItemRow[]>([])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const resetForm = () => {
    setEditing(null)
    setName("")
    setDealStructure("")
    setLineItems([])
    setFormError(null)
  }

  const openAdd = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (t: OfferTemplateRow) => {
    setEditing(t)
    setName(t.name)
    setDealStructure(t.deal_structure ?? "")
    setLineItems(storageToLineItems(Array.isArray(t.line_items_template) ? t.line_items_template : []))
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setFormError("Name is required.")
      return
    }
    setFormError(null)
    setSaving(true)
    try {
      const lineItemsTemplate = lineItemsToStorage(lineItems)
      if (editing) {
        await updateOfferTemplate(editing.id, {
          name: name.trim(),
          deal_structure: dealStructure.trim() || null,
          line_items_template: lineItemsTemplate,
        })
      } else {
        if (!venueId && !venueGroupId) {
          setFormError("Venue or group is required.")
          setSaving(false)
          return
        }
        await createOfferTemplate({
          venue_id: venueId ?? null,
          venue_group_id: venueGroupId ?? null,
          name: name.trim(),
          deal_structure: dealStructure.trim() || null,
          line_items_template: lineItemsTemplate,
        })
      }
      refetch()
      setDialogOpen(false)
      resetForm()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save template")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (t: OfferTemplateRow) => {
    if (!confirm(`Delete template "${t.name}"?`)) return
    try {
      await deleteOfferTemplate(t.id)
      refetch()
    } catch {
      // ignore
    }
  }

  if (loading && templates.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Loading templates…
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-primary" />
                Offer templates
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Reuse deal structure and line items when creating offers.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={openAdd} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Add template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-destructive mb-3">{error.message}</p>
          )}
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No templates yet. Add one to speed up creating offers.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Deal structure</TableHead>
                  <TableHead className="text-muted-foreground w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id} className="border-border">
                    <TableCell className="font-medium text-foreground">{t.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {t.deal_structure ?? "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(t)} className="gap-2">
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </DropdownMenuItem>
                          {onUseTemplate && (
                            <DropdownMenuItem
                              onClick={() => {
                                onUseTemplate(t)
                              }}
                              className="gap-2"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Use template
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDelete(t)}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-background border-border sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit template" : "Add template"}</DialogTitle>
            <DialogDescription>
              Name, deal structure, and line items (e.g. guarantee, bonus). When you use this template to create an offer, these will prefill.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template name</Label>
              <Input
                id="template-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Standard guarantee"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-deal">Deal structure (optional)</Label>
              <Textarea
                id="template-deal"
                value={dealStructure}
                onChange={(e) => setDealStructure(e.target.value)}
                placeholder="e.g. $X guarantee vs 85% door, or 80/20 split after house"
                rows={2}
                className="resize-none"
              />
            </div>
            <OfferTemplateLineItemsEditor items={lineItems} onChange={setLineItems} />
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save" : "Add template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
