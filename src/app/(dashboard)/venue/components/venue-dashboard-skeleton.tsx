"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function VenueDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col gap-1">
        <div className="h-8 w-48 bg-secondary rounded" />
        <div className="h-4 w-72 bg-secondary/70 rounded mt-1" />
      </div>

      <div className="flex items-center gap-4">
        <div className="h-11 w-24 bg-secondary rounded-lg" />
        <div className="h-11 w-28 bg-secondary rounded-lg" />
        <div className="h-11 w-32 bg-secondary rounded-lg" />
        <div className="h-10 w-28 bg-primary/20 rounded-lg ml-auto" />
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2.5 px-3 py-2 bg-secondary/30 rounded-lg border border-border/50">
            <div className="w-7 h-7 rounded bg-secondary" />
            <div className="flex-1">
              <div className="h-5 w-12 bg-secondary rounded" />
              <div className="h-3 w-20 bg-secondary/70 rounded mt-1" />
            </div>
          </div>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary" />
            <div>
              <div className="h-6 w-32 bg-secondary rounded" />
              <div className="h-4 w-48 bg-secondary/70 rounded mt-2" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-border/50"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-secondary" />
                <div>
                  <div className="h-5 w-40 bg-secondary rounded" />
                  <div className="h-4 w-56 bg-secondary/70 rounded mt-2" />
                </div>
              </div>
              <div className="h-6 w-20 bg-secondary rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
