import { supabase } from "./supabase"
import type { AdvanceTemplateRow } from "./venue-types"

export type AdvanceTemplateInsert = {
  venue_id: string
  name: string
  sections?: Record<string, unknown>
}

export async function listAdvanceTemplates(venueId: string): Promise<AdvanceTemplateRow[]> {
  if (!supabase || !venueId) return []
  const { data, error } = await supabase
    .from("advance_templates")
    .select("*")
    .eq("venue_id", venueId)
    .order("name")
  if (error) throw error
  return (data as AdvanceTemplateRow[]) ?? []
}

export async function getAdvanceTemplate(id: string): Promise<AdvanceTemplateRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from("advance_templates").select("*").eq("id", id).single()
  if (error) return null
  return data as AdvanceTemplateRow
}

export async function createAdvanceTemplate(
  input: AdvanceTemplateInsert
): Promise<AdvanceTemplateRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from("advance_templates")
    .insert({
      venue_id: input.venue_id,
      name: input.name,
      sections: input.sections ?? {},
    })
    .select()
    .single()
  if (error) throw error
  return data as AdvanceTemplateRow
}

export async function updateAdvanceTemplate(
  id: string,
  updates: Partial<Pick<AdvanceTemplateRow, "name" | "sections">>
): Promise<AdvanceTemplateRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from("advance_templates")
    .update(updates)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data as AdvanceTemplateRow
}

export async function deleteAdvanceTemplate(id: string): Promise<void> {
  if (!supabase) return
  await supabase.from("advance_templates").delete().eq("id", id)
}
