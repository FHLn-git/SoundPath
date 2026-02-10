"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { useAssets } from "@/lib/use-assets"
import {
  createAsset,
  deleteAsset,
  getAssetDownloadUrl,
} from "@/lib/assets-api"
import type { VenueAssetRow, VenueAssetType } from "@/lib/venue-types"
import { useVenue } from "@/lib/use-venue"
import { FileText, Image, Link2, Plus, Trash2, Download, Loader2, FolderOpen } from "lucide-react"
import { format } from "date-fns"

const ASSET_TYPES: { value: VenueAssetType; label: string }[] = [
  { value: "rider", label: "Rider" },
  { value: "contract", label: "Contract" },
  { value: "poster", label: "Poster" },
  { value: "flyer", label: "Flyer" },
  { value: "other", label: "Other" },
]

interface VenueAssetsCardProps {
  venueId: string | null
  /** When set, show only assets for this show + venue-level; and allow uploading for this show */
  showId?: string | null
}

export function VenueAssetsCard({ venueId, showId }: VenueAssetsCardProps) {
  const { userId } = useVenue()
  const { assets, loading, error, refetch } = useAssets(venueId, {
    showId: showId ?? undefined,
    includeConfidential: true,
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [uploadType, setUploadType] = useState<VenueAssetType>("rider")
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [confidential, setConfidential] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const resetForm = () => {
    setUploadType("rider")
    setName("")
    setUrl("")
    setConfidential(false)
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleUpload = async () => {
    if (!venueId) return
    const hasFile = !!selectedFile
    const hasUrl = url.trim().length > 0
    if (!hasFile && !hasUrl) {
      alert("Add a file or paste a link.")
      return
    }
    setSaving(true)
    try {
      await createAsset(venueId, {
        showId: showId ?? null,
        name: name.trim() || (selectedFile?.name ?? "Link"),
        type: uploadType,
        file: hasFile ? selectedFile! : undefined,
        url: hasUrl ? url.trim() : undefined,
        confidential: uploadType === "contract" ? true : confidential,
        uploadedBy: userId ?? null,
      })
      resetForm()
      setDialogOpen(false)
      refetch()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (asset: VenueAssetRow) => {
    if (!confirm(`Delete "${asset.name}"?`)) return
    setDeletingId(asset.id)
    try {
      await deleteAsset(asset.id)
      refetch()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed.")
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownload = async (asset: VenueAssetRow) => {
    if (asset.url) {
      window.open(asset.url, "_blank")
      return
    }
    if (!asset.storage_path) return
    const signedUrl = await getAssetDownloadUrl(asset.storage_path)
    if (signedUrl) window.open(signedUrl, "_blank")
    else alert("Could not generate download link.")
  }

  if (!venueId) return null

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <FolderOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Assets & files</CardTitle>
              <CardDescription>
                Riders, contracts, posters. Attach to venue{showId ? " or this show" : ""}.
              </CardDescription>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true) }} className="gap-2">
            <Plus className="w-4 h-4" />
            Upload
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-sm text-destructive mb-4">{error.message}</p>
        )}
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        ) : assets.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">
            No assets yet. Upload a rider, contract, or poster to get started.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>
                    {asset.type === "contract" || asset.type === "rider" ? (
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Image className="w-4 h-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{asset.name}</span>
                    {(asset.confidential ?? false) && (
                      <span className="ml-2 text-xs text-muted-foreground">(confidential)</span>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">{asset.type}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(asset.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownload(asset)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(asset)}
                        disabled={deletingId === asset.id}
                      >
                        {deletingId === asset.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle>Upload asset</DialogTitle>
            <DialogDescription>
              Attach a file or paste a link. Contracts are marked confidential by default.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={uploadType} onValueChange={(v) => setUploadType(v as VenueAssetType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name (optional)</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Artist rider 2025"
              />
            </div>
            <div className="space-y-2">
              <Label>File</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary/10 file:text-primary"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Or paste a link
              </Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            {uploadType !== "contract" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confidential}
                  onChange={(e) => setConfidential(e.target.checked)}
                />
                Confidential (only visible to managers)
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={saving || (!selectedFile && !url.trim())}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
