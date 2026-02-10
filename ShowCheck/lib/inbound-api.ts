import { supabase } from "./supabase"
import type { InboundSubmissionRow } from "./venue-types"

export type InboundInsert = Omit<InboundSubmissionRow, "id" | "submitted_at" | "created_at" | "updated_at">
export type InboundUpdate = Partial<Omit<InboundSubmissionRow, "id" | "venue_id" | "group_id" | "submitted_at" | "created_at">>

export async function listInbound(
  venueId: string | null,
  groupId: string | null,
  filters?: { status?: InboundSubmissionRow["status"] }
): Promise<InboundSubmissionRow[]> {
  if (!supabase) return []
  if (venueId) {
    let query = supabase
      .from("inbound_submissions")
      .select("*")
      .eq("venue_id", venueId)
      .order("submitted_at", { ascending: false })
    if (filters?.status) query = query.eq("status", filters.status)
    const { data, error } = await query
    if (error) throw error
    return (data as InboundSubmissionRow[]) ?? []
  }
  if (groupId) {
    let query = supabase
      .from("inbound_submissions")
      .select("*")
      .eq("group_id", groupId)
      .order("submitted_at", { ascending: false })
    if (filters?.status) query = query.eq("status", filters.status)
    const { data, error } = await query
    if (error) throw error
    return (data as InboundSubmissionRow[]) ?? []
  }
  return []
}

export async function getInbound(submissionId: string): Promise<InboundSubmissionRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from("inbound_submissions").select("*").eq("id", submissionId).single()
  if (error) return null
  return data as InboundSubmissionRow
}

export async function createInbound(submission: InboundInsert): Promise<InboundSubmissionRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from("inbound_submissions").insert(submission).select().single()
  if (error) throw error
  return data as InboundSubmissionRow
}

export async function updateInbound(submissionId: string, updates: InboundUpdate): Promise<InboundSubmissionRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from("inbound_submissions").update(updates).eq("id", submissionId).select().single()
  if (error) throw error
  return data as InboundSubmissionRow
}

export async function deleteInbound(submissionId: string): Promise<void> {
  if (!supabase) return
  await supabase.from("inbound_submissions").delete().eq("id", submissionId)
}
