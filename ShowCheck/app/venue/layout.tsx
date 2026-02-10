"use client"

import { VenueDataProvider } from "@/components/venue-data-provider"
import { VenueSignIn } from "@/components/venue-sign-in"
import { VenueBreadcrumb } from "@/components/venue-breadcrumb"
import { useVenue } from "@/lib/use-venue"
import { formatOperationError } from "@/lib/format-error"

export default function VenueLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <VenueDataProvider>
      <VenueLayoutContent>{children}</VenueLayoutContent>
    </VenueDataProvider>
  )
}

function VenueLayoutContent({ children }: { children: React.ReactNode }) {
  const { userId, loading, error } = useVenue()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center">
        <div className="font-mono text-muted-foreground text-sm">Loading...</div>
      </div>
    )
  }

  if (error) {
    const message = formatOperationError(error, {
      operation: "Load venue data",
      fallbackReason: "Check your connection and sign-in.",
    })
    return (
      <div className="min-h-screen bg-[#0B0E14] flex flex-col items-center justify-center p-4 text-center">
        <p className="font-medium text-destructive mb-1">Couldn’t load venues</p>
        <p className="text-sm text-muted-foreground font-mono">{message}</p>
      </div>
    )
  }

  if (!userId) {
    return <VenueSignIn />
  }

  return (
    <div className="min-h-screen bg-[#0B0E14]">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-[#0B0E14]/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <VenueBreadcrumb />
        </div>
      </header>
      {children}
    </div>
  )
}
