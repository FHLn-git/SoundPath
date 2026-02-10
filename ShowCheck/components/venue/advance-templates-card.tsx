"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { useAdvanceTemplates } from "@/lib/use-advance-templates"
import {
  createAdvanceTemplate,
  updateAdvanceTemplate,
  deleteAdvanceTemplate,
} from "@/lib/advance-templates-api"
import type { AdvanceTemplateRow } from "@/lib/venue-types"
import {
  AdvanceTemplateSectionsEditor,
  sectionsToStorage,
  storageToSections,
  type AdvanceSectionBlock,
} from "@/components/venue/advance-template-sections-editor"
import { Link2, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react"

interface AdvanceTemplatesCardProps {
  venueId: string | null
}

export function AdvanceTemplatesCard({ venueId }: AdvanceTemplatesCardProps) {
  const { templates, loading, error, refetch } = useAdvanceTemplates(venueId)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdvanceTemplateRow | null>(null)
  const [name, setName] = useState("")
  const [blocks, setBlocks] = useState<AdvanceSectionBlock[]>([])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const resetForm = () => {
    setEditing(null)
    setName("")
    setBlocks([])
    setFormError(null)
  }

  const openAdd = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (t: AdvanceTemplateRow) => {
    setEditing(t)
    setName(t.name)
    setBlocks(storageToSections(t.sections))
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setFormError("Name is required.")
      return
    }
    if (!venueId) {
      setFormError("Venue is required.")
      return
    }
    setFormError(null)
    setSaving(true)
    try {
      const sections = sectionsToStorage(blocks)
      if (editing) {
        await updateAdvanceTemplate(editing.id, { name: name.trim(), sections })
      } else {
        await createAdvanceTemplate({ venue_id: venueId, name: name.trim(), sections })
      }
      setDialogOpen(false)
      resetForm()
      refetch()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save template")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (t: AdvanceTemplateRow) => {
    if (!confirm(`Delete advance template "${t.name}"?`)) return
    try {
      await deleteAdvanceTemplate(t.id)
      refetch()
    } catch {
      // ignore
    }
  }

  if (loading && templates.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Loading advance templates…
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
                <Link2 className="w-4 h-4 text-primary" />
                Advance templates
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Default sections for shareable advance pages (run of show, rider disclaimer, venue details).
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={openAdd} className="gap-1.5" disabled={!venueId}>
              <Plus className="w-4 h-4" />
              Add template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-destructive mb-3">{error.message}</p>}
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No advance templates yet. Add one to set default content for shared advance links.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id} className="border-border">
                    <TableCell className="font-medium text-foreground">{t.name}</TableCell>
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
            <DialogTitle>{editing ? "Edit advance template" : "Add advance template"}</DialogTitle>
            <DialogDescription>
              Give this template a name and add sections that will appear on your shared advance pages (intro, rider disclaimer, load-in info, etc.).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label htmlFor="advance-name">Template name</Label>
              <Input
                id="advance-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Default"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Sections</Label>
              <AdvanceTemplateSectionsEditor blocks={blocks} onChange={setBlocks} />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
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
