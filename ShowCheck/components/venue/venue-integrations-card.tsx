"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useVenue } from "@/lib/use-venue"
import {
  listIntegrations,
  getIntegration,
  upsertIntegration,
  setIntegrationLastSync,
  generateWebhookSecret,
  type IcalConfig,
  type TicketingWebhookConfig,
} from "@/lib/integrations-api"
import type { VenueIntegrationProvider } from "@/lib/venue-types"
import { Calendar, Link2, Loader2, RefreshCw, Ticket } from "lucide-react"
import { format } from "date-fns"

export function VenueIntegrationsCard() {
  const { activeVenueId } = useVenue()
  const [icalUrl, setIcalUrl] = useState("")
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [savingIcal, setSavingIcal] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (!activeVenueId) return
    getIntegration(activeVenueId, "ical").then((row) => {
      const config = (row?.config ?? {}) as IcalConfig
      setIcalUrl(config.ical_url ?? "")
      setLastSync(row?.last_sync_at ?? null)
    })
    getIntegration(activeVenueId, "ticketing_webhook").then((row) => {
      const config = (row?.config ?? {}) as TicketingWebhookConfig
      setWebhookSecret(config.webhook_secret ?? null)
    })
  }, [activeVenueId])

  const handleSaveIcal = async () => {
    if (!activeVenueId) return
    setSavingIcal(true)
    setMessage(null)
    try {
      await upsertIntegration(activeVenueId, "ical", { ical_url: icalUrl.trim() || undefined })
      setMessage({ type: "success", text: "iCal URL saved." })
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to save." })
    } finally {
      setSavingIcal(false)
    }
  }

  const handleSyncIcal = async () => {
    if (!activeVenueId) return
    setSyncing(true)
    setMessage(null)
    try {
      const row = await getIntegration(activeVenueId, "ical")
      const config = (row?.config ?? {}) as IcalConfig
      const url = config.ical_url?.trim()
      if (!url) {
        setMessage({ type: "error", text: "Add an iCal URL first, then save." })
        setSyncing(false)
        return
      }
      const res = await fetch(url, { method: "GET" })
      if (!res.ok) throw new Error("Could not fetch iCal feed.")
      const text = await res.text()
      if (!text.includes("BEGIN:VCALENDAR")) {
        setMessage({ type: "error", text: "URL did not return a valid iCal feed." })
        setSyncing(false)
        return
      }
      await setIntegrationLastSync(activeVenueId, "ical", "ok")
      setLastSync(new Date().toISOString())
      setMessage({ type: "success", text: "Feed checked. Calendar import from iCal can be wired to create holds from events." })
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Sync check failed." })
    } finally {
      setSyncing(false)
    }
  }

  const handleRegenerateWebhookSecret = async () => {
    if (!activeVenueId) return
    if (!confirm("Regenerate webhook secret? Existing ticketing integrations will need the new secret.")) return
    setRegenerating(true)
    setMessage(null)
    try {
      const secret = generateWebhookSecret()
      await upsertIntegration(activeVenueId, "ticketing_webhook", { webhook_secret: secret })
      setWebhookSecret(secret)
      setMessage({ type: "success", text: "New secret saved. Update your ticketing provider with this secret." })
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed." })
    } finally {
      setRegenerating(false)
    }
  }

  if (!activeVenueId) return null

  const webhookBase = typeof window !== "undefined" ? `${window.location.origin}/api/venue/ticketing-webhook` : ""
  const webhookUrl = `${webhookBase}?venue_id=${activeVenueId}`

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Link2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>
              Calendar feeds and ticketing webhook. Connects Venue to the rest of SoundPath.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {message && (
          <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-destructive"}`}>
            {message.text}
          </p>
        )}

        {/* iCal */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            iCal feed URL
          </Label>
          <p className="text-xs text-muted-foreground">
            Paste a public iCal URL to pull events into SoundPath (e.g. from another calendar). Save then use &quot;Check feed&quot; to verify.
          </p>
          <div className="flex gap-2">
            <Input
              value={icalUrl}
              onChange={(e) => setIcalUrl(e.target.value)}
              placeholder="https://…/ical.ics"
              className="font-mono text-sm"
            />
            <Button variant="outline" onClick={handleSaveIcal} disabled={savingIcal}>
              {savingIcal ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
            <Button variant="secondary" onClick={handleSyncIcal} disabled={syncing}>
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="hidden sm:inline ml-1">Check feed</span>
            </Button>
          </div>
          {lastSync && (
            <p className="text-xs text-muted-foreground">
              Last checked: {format(new Date(lastSync), "PPp")}
            </p>
          )}
        </div>

        {/* Ticketing webhook */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Ticket className="w-4 h-4" />
            Ticketing webhook
          </Label>
          <p className="text-xs text-muted-foreground">
            Send ticket sales and revenue from your ticketing provider to this URL. Sign requests with the secret below (e.g. HMAC). SoundPath can then update show ticket counts and revenue.
          </p>
          <div className="rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs break-all">
            {webhookUrl}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard?.writeText(webhookUrl)}
            >
              Copy URL
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerateWebhookSecret}
              disabled={regenerating}
            >
              {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Regenerate secret"}
            </Button>
          </div>
          {webhookSecret && (
            <p className="text-xs text-muted-foreground font-mono break-all">
              Secret: {webhookSecret}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
