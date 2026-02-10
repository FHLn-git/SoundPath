import { supabase } from "./supabase"
import type { VenueAssetRow, VenueAssetType } from "./venue-types"

const BUCKET = "venue-assets"

/** List assets for a venue, optionally filtered by show. */
export async function listAssets(
  venueId: string,
  options?: { showId?: string | null; includeConfidential?: boolean }
): Promise<VenueAssetRow[]> {
  if (!supabase || !venueId) return []
  let query = supabase
    .from("venue_assets")
    .select("*")
    .eq("venue_id", venueId)
    .order("created_at", { ascending: false })
  if (options?.showId != null) {
    query = query.or(`show_id.eq.${options.showId},show_id.is.null`)
  }
  const { data, error } = await query
  if (error) throw error
  const rows = (data ?? []) as VenueAssetRow[]
  if (options?.includeConfidential === false) {
    return rows.filter((r) => !r.confidential)
  }
  return rows
}

/** Get a single asset. */
export async function getAsset(assetId: string): Promise<VenueAssetRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from("venue_assets")
    .select("*")
    .eq("id", assetId)
    .single()
  if (error || !data) return null
  return data as VenueAssetRow
}

/** Create a signed URL for downloading an asset (for private bucket). Expires in 1 hour. */
export async function getAssetDownloadUrl(storagePath: string): Promise<string | null> {
  if (!supabase || !storagePath) return null
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

/** Create asset: upload file to storage and insert row. Path = venue_id/asset_id/filename. */
export async function createAsset(
  venueId: string,
  params: {
    showId?: string | null
    name: string
    type: VenueAssetType
    file?: File
    url?: string
    confidential?: boolean
    uploadedBy?: string | null
  }
): Promise<VenueAssetRow | null> {
  if (!supabase || !venueId) return null
  const { name, type, file, url, confidential = false, uploadedBy = null, showId = null } = params

  if (file) {
    const { data: insertRow, error: insertError } = await supabase
      .from("venue_assets")
      .insert({
        venue_id: venueId,
        show_id: showId,
        name: name.trim() || file.name,
        type,
        storage_path: null,
        url: null,
        confidential,
        uploaded_by: uploadedBy,
      })
      .select()
      .single()
    if (insertError || !insertRow) throw insertError ?? new Error("Failed to create asset row")
    const assetId = (insertRow as VenueAssetRow).id
    const ext = file.name.split(".").pop() || "bin"
    const storagePath = `${venueId}/${assetId}/${file.name}`

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
      upsert: true,
      contentType: file.type || undefined,
    })
    if (uploadError) {
      await supabase.from("venue_assets").delete().eq("id", assetId)
      throw uploadError
    }
    const { data: updated, error: updateError } = await supabase
      .from("venue_assets")
      .update({ storage_path: storagePath })
      .eq("id", assetId)
      .select()
      .single()
    if (updateError) throw updateError
    return updated as VenueAssetRow
  }

  if (url) {
    const { data, error } = await supabase
      .from("venue_assets")
      .insert({
        venue_id: venueId,
        show_id: showId,
        name: name.trim() || "Link",
        type,
        storage_path: null,
        url: url.trim(),
        confidential,
        uploaded_by: uploadedBy,
      })
      .select()
      .single()
    if (error) throw error
    return data as VenueAssetRow
  }

  throw new Error("Provide either file or url")
}

/** Delete asset and remove file from storage if present. */
export async function deleteAsset(assetId: string): Promise<void> {
  if (!supabase) return
  const row = await getAsset(assetId)
  if (row?.storage_path) {
    await supabase.storage.from(BUCKET).remove([row.storage_path])
  }
  await supabase.from("venue_assets").delete().eq("id", assetId)
}
