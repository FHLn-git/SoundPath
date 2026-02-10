import { supabase } from "./supabase"
import type { OfferTemplateRow } from "./venue-types"

export type OfferTemplateInsert = Omit<OfferTemplateRow, "id" | "created_at" | "updated_at">
export type OfferTemplateUpdate = Partial<Omit<OfferTemplateRow, "id" | "created_at">>

export async function listOfferTemplates(venueId: string | null, venueGroupId: string | null): Promise<OfferTemplateRow[]> {
  if (!supabase) return []
  if (venueId) {
    const { data, error } = await supabase
      .from("offer_templates")
      .select("*")
      .eq("venue_id", venueId)
      .order("name")
    if (error) throw error
    return (data as OfferTemplateRow[]) ?? []
  }
  if (venueGroupId) {
    const { data, error } = await supabase
      .from("offer_templates")
      .select("*")
      .eq("venue_group_id", venueGroupId)
      .order("name")
    if (error) throw error
    return (data as OfferTemplateRow[]) ?? []
  }
  return []
}

export async function getOfferTemplate(templateId: string): Promise<OfferTemplateRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from("offer_templates").select("*").eq("id", templateId).single()
  if (error) return null
  return data as OfferTemplateRow
}

export async function createOfferTemplate(template: OfferTemplateInsert): Promise<OfferTemplateRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from("offer_templates").insert(template).select().single()
  if (error) throw error
  return data as OfferTemplateRow
}

export async function updateOfferTemplate(templateId: string, updates: OfferTemplateUpdate): Promise<OfferTemplateRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from("offer_templates").update(updates).eq("id", templateId).select().single()
  if (error) throw error
  return data as OfferTemplateRow
}

export async function deleteOfferTemplate(templateId: string): Promise<void> {
  if (!supabase) return
  await supabase.from("offer_templates").delete().eq("id", templateId)
}
