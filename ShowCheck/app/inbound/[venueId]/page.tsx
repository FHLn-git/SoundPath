"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { Music, CheckCircle2 } from "lucide-react"

export default function InboundFormPage() {
  const params = useParams()
  const venueId = params?.venueId as string
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    artist_name: "",
    contact_email: "",
    contact_phone: "",
    requested_dates: "",
    message: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!venueId || !supabase) return
    setError(null)
    setLoading(true)
    try {
      const requested_dates = form.requested_dates.trim()
        ? form.requested_dates.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
        : []
      const { error: err } = await supabase.from("inbound_submissions").insert({
        venue_id: venueId,
        group_id: null,
        artist_name: form.artist_name.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        requested_dates,
        message: form.message.trim() || null,
        source: "form",
        status: "new",
        tags: [],
      })
      if (err) throw err
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="border-border bg-card max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="flex justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Request received</h2>
            <p className="text-muted-foreground text-sm">
              The venue will review your submission and get in touch.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="border-border bg-card max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Music className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Booking request</CardTitle>
              <CardDescription>Submit your act for consideration. The venue will review and respond.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="artist_name">Artist / act name</Label>
              <Input
                id="artist_name"
                value={form.artist_name}
                onChange={(e) => setForm((p) => ({ ...p, artist_name: e.target.value }))}
                placeholder="Your act or band name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email">Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Phone (optional)</Label>
              <Input
                id="contact_phone"
                type="tel"
                value={form.contact_phone}
                onChange={(e) => setForm((p) => ({ ...p, contact_phone: e.target.value }))}
                placeholder="+1 234 567 8900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requested_dates">Requested dates (optional)</Label>
              <Textarea
                id="requested_dates"
                value={form.requested_dates}
                onChange={(e) => setForm((p) => ({ ...p, requested_dates: e.target.value }))}
                placeholder="e.g. March 2025, weekends only"
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea
                id="message"
                value={form.message}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                placeholder="Anything else the venue should know"
                rows={3}
                className="resize-none"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Submit request"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
