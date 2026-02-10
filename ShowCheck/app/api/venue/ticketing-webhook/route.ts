import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * Ticketing webhook: receive ticket sales and revenue from external providers.
 * Query: venue_id (required)
 * Body: { show_id?: string, ticket_sales_count?: number, ticket_revenue?: number }
 * Header: X-Webhook-Signature (optional) – HMAC-SHA256 of body using venue's webhook_secret.
 * Integrates with Venue Phase 6; updates shows for settlement and P&L.
 */
export async function POST(request: NextRequest) {
  const venueId = request.nextUrl.searchParams.get("venue_id")
  if (!venueId) {
    return NextResponse.json({ error: "Missing venue_id" }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 })
  }
  const supabase = createClient(url, key)

  let raw: string
  try {
    raw = await request.text()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }
  let body: { show_id?: string; ticket_sales_count?: number; ticket_revenue?: number }
  try {
    body = raw ? JSON.parse(raw) : {}
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { data: integration } = await supabase
    .from("venue_integrations")
    .select("config")
    .eq("venue_id", venueId)
    .eq("provider", "ticketing_webhook")
    .maybeSingle()

  const config = (integration?.config ?? {}) as { webhook_secret?: string }
  const secret = config.webhook_secret
  if (secret) {
    const sig = request.headers.get("x-webhook-signature") ?? request.headers.get("X-Webhook-Signature")
    if (!sig) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 })
    }
    const encoder = new TextEncoder()
    const keyData = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    const signature = await crypto.subtle.sign(
      "HMAC",
      keyData,
      encoder.encode(raw)
    )
    const expected = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
    if (sig.toLowerCase() !== expected.toLowerCase()) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  }

  const showId = body.show_id
  const ticketSalesCount = body.ticket_sales_count
  const ticketRevenue = body.ticket_revenue
  if (!showId || (ticketSalesCount == null && ticketRevenue == null)) {
    return NextResponse.json({ ok: true, message: "No show_id or ticket data to update" })
  }

  const updates: Record<string, unknown> = {}
  if (typeof ticketSalesCount === "number") updates.ticket_sales_count = ticketSalesCount
  if (typeof ticketRevenue === "number") updates.ticket_revenue = ticketRevenue
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true })
  }

  const { error } = await supabase
    .from("shows")
    .update(updates)
    .eq("id", showId)
    .eq("venue_id", venueId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({
    message: "Ticketing webhook. POST with venue_id query and JSON body: show_id, ticket_sales_count, ticket_revenue.",
  })
}
