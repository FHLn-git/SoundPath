import { supabase } from "./supabase"
import type { DefaultShowCosts, OperatingHoursMap, Stage } from "./venue-types"

/** Normalize DB row so Stage has top-level fields (from columns or technical_specs_json) */
function normalizeStage(row: Record<string, unknown>): Stage {
  const tech = (row.technical_specs_json ?? {}) as Record<string, unknown>
  return {
    id: row.id as string,
    venue_id: row.venue_id as string,
    name: row.name as string,
    capacity: (row.capacity as number) ?? (tech.capacity as number) ?? null,
    technical_specs_json: (row.technical_specs_json as Record<string, unknown>) ?? {},
    legal_capacity: (row.legal_capacity as number) ?? (tech.legal_capacity as number) ?? null,
    comfort_capacity: (row.comfort_capacity as number) ?? (tech.comfort_capacity as number) ?? null,
    audio_specs: (row.audio_specs as Record<string, unknown>) ?? (tech.audio_specs as Record<string, unknown>) ?? {},
    lighting_specs: (row.lighting_specs as Record<string, unknown>) ?? (tech.lighting_specs as Record<string, unknown>) ?? {},
    bar_count: (row.bar_count as number) ?? (tech.bar_count as number) ?? null,
    is_default: (row.is_default as boolean) ?? (tech.is_default as boolean) ?? false,
    default_operating_hours: (row.default_operating_hours as OperatingHoursMap) ?? undefined,
    default_show_costs: (row.default_show_costs as DefaultShowCosts) ?? undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export async function fetchStagesByVenueId(venueId: string): Promise<Stage[]> {
  if (!supabase || !venueId) return []
  const { data, error } = await supabase
    .from("stages")
    .select("*")
    .eq("venue_id", venueId)
    .order("name")

  if (error) throw error
  const rows = (data ?? []) as Record<string, unknown>[]
  return rows.map(normalizeStage)
}

export type StageInsert = {
  venue_id: string
  name: string
  capacity?: number | null
  technical_specs_json?: Record<string, unknown>
  legal_capacity?: number | null
  comfort_capacity?: number | null
  audio_specs?: Record<string, unknown>
  lighting_specs?: Record<string, unknown>
  bar_count?: number | null
  is_default?: boolean
  default_operating_hours?: OperatingHoursMap
  default_show_costs?: DefaultShowCosts
}

/** Insert payload using only base columns (works before stages-dynamic-management migration) */
function buildLegacyPayload(input: StageInsert): Record<string, unknown> {
  const technical_specs_json: Record<string, unknown> = {
    ...((input.technical_specs_json as Record<string, unknown>) ?? {}),
    legal_capacity: input.legal_capacity ?? undefined,
    comfort_capacity: input.comfort_capacity ?? undefined,
    audio_specs: input.audio_specs ?? undefined,
    lighting_specs: input.lighting_specs ?? undefined,
    bar_count: input.bar_count ?? undefined,
    is_default: input.is_default ?? undefined,
  }
  return {
    venue_id: input.venue_id,
    name: input.name,
    capacity: input.capacity ?? null,
    technical_specs_json,
  }
}

function isMissingColumnError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  const code = (err as { code?: string })?.code
  return code === "42703" || /column .* does not exist/i.test(msg)
}

export async function createStage(input: StageInsert): Promise<Stage | null> {
  if (!supabase) return null

  const fullPayload = {
    venue_id: input.venue_id,
    name: input.name,
    capacity: input.capacity ?? null,
    technical_specs_json: input.technical_specs_json ?? {},
    legal_capacity: input.legal_capacity ?? null,
    comfort_capacity: input.comfort_capacity ?? null,
    audio_specs: input.audio_specs ?? {},
    lighting_specs: input.lighting_specs ?? {},
    bar_count: input.bar_count ?? 0,
    is_default: input.is_default ?? false,
  }

  let result: Record<string, unknown> | null = null
  let error: unknown = null

  const { data, error: e } = await supabase
    .from("stages")
    .insert(fullPayload)
    .select()
    .single()

  if (e) {
    if (isMissingColumnError(e)) {
      const legacy = buildLegacyPayload(input)
      const { data: legacyData, error: legacyError } = await supabase
        .from("stages")
        .insert(legacy)
        .select()
        .single()
      if (legacyError) throw legacyError
      result = legacyData as Record<string, unknown>
    } else {
      throw e
    }
  } else {
    result = data as Record<string, unknown>
  }

  return result ? normalizeStage(result) : null
}

export type StageUpdate = Partial<
  Pick<
    Stage,
    | "name"
    | "capacity"
    | "technical_specs_json"
    | "legal_capacity"
    | "comfort_capacity"
    | "audio_specs"
    | "lighting_specs"
    | "bar_count"
    | "is_default"
    | "default_operating_hours"
    | "default_show_costs"
  >
>

export async function deleteStage(stageId: string): Promise<void> {
  if (!supabase) return
  await supabase.from("stages").delete().eq("id", stageId)
}

function buildLegacyUpdatePayload(updates: StageUpdate): Record<string, unknown> {
  const { technical_specs_json = {}, ...rest } = updates as StageUpdate & { technical_specs_json?: Record<string, unknown> }
  const merged: Record<string, unknown> = { ...(technical_specs_json as Record<string, unknown>) }
  if (rest.legal_capacity !== undefined) merged.legal_capacity = rest.legal_capacity
  if (rest.comfort_capacity !== undefined) merged.comfort_capacity = rest.comfort_capacity
  if (rest.audio_specs !== undefined) merged.audio_specs = rest.audio_specs
  if (rest.lighting_specs !== undefined) merged.lighting_specs = rest.lighting_specs
  if (rest.bar_count !== undefined) merged.bar_count = rest.bar_count
  if (rest.is_default !== undefined) merged.is_default = rest.is_default
  const payload: Record<string, unknown> = { technical_specs_json: merged }
  if (updates.name !== undefined) payload.name = updates.name
  if (updates.capacity !== undefined) payload.capacity = updates.capacity
  return payload
}

export async function updateStage(stageId: string, updates: StageUpdate): Promise<Stage | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from("stages")
    .update(updates)
    .eq("id", stageId)
    .select()
    .single()

  if (error) {
    if (isMissingColumnError(error)) {
      const legacy = buildLegacyUpdatePayload(updates)
      const { data: legacyData, error: legacyError } = await supabase
        .from("stages")
        .update(legacy)
        .eq("id", stageId)
        .select()
        .single()
      if (legacyError) throw legacyError
      return legacyData ? normalizeStage(legacyData as Record<string, unknown>) : null
    }
    throw error
  }
  return data ? normalizeStage(data as Record<string, unknown>) : null
}
