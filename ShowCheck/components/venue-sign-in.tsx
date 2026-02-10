"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatOperationError } from "@/lib/format-error"
import { LogIn, Loader2, Music2, UserPlus } from "lucide-react"

function getSignUpUrl(): string {
  if (typeof window === "undefined") return "/signup"
  try {
    if (window.top && window.top.location && window.top.location.origin) {
      return `${window.top.location.origin}/signup`
    }
  } catch {
    if (document.referrer) {
      try {
        return `${new URL(document.referrer).origin}/signup`
      } catch {
        // ignore
      }
    }
  }
  return `${window.location.origin}/signup`
}

export function VenueSignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    if (!supabase) {
      setMessage({ type: "error", text: "Auth is not configured." })
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    setLoading(false)
    if (error) {
      setMessage({
        type: "error",
        text: formatOperationError(error, {
          operation: "Sign in",
          fallbackReason: "Invalid email or password, or your account may not exist yet.",
        }),
      })
      return
    }
    setMessage({ type: "success", text: "Signed in. Loading…" })
    window.location.reload()
  }

  return (
    <div className="flex w-full min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm mx-auto shrink-0 space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Music2 className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">SoundPath | VENUE</h2>
          <p className="text-sm text-muted-foreground">
            Sign in with your universal SoundPath account.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {message && (
            <p
              className={`text-sm ${
                message.type === "error" ? "text-destructive" : "text-primary"
              }`}
            >
              {message.text}
            </p>
          )}
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            Sign in
          </Button>
          <Button type="button" variant="outline" className="w-full gap-2" asChild>
            <a href={getSignUpUrl()}>
              <UserPlus className="h-4 w-4" />
              Create account
            </a>
          </Button>
        </form>
      </div>
    </div>
  )
}
