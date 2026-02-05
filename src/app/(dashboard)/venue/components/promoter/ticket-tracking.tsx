"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Ticket, TrendingUp, Clock } from "lucide-react"

export function TicketTracking() {
  // Mock data for ticket sales visualization
  const mockData = [
    { day: "Mon", sales: 45 },
    { day: "Tue", sales: 78 },
    { day: "Wed", sales: 95 },
    { day: "Thu", sales: 120 },
    { day: "Fri", sales: 180 },
    { day: "Sat", sales: 220 },
    { day: "Sun", sales: 195 },
  ]

  const maxSales = Math.max(...mockData.map((d) => d.sales))

  return (
    <Card className="border-border bg-card relative overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
              <Ticket className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <CardTitle>Ticket Sales</CardTitle>
              <CardDescription>Track your ticket sales over time</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            Live Preview
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Blur overlay – indicates demo data until ticketing APIs are connected */}
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-secondary/80 mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Ticketing API Integration</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Connect your ticketing platform to see real-time sales data and trends
            </p>
          </div>
        </div>

        {/* Mock chart visualization */}
        <div className="space-y-4 opacity-40">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-muted-foreground">Total Sold</p>
              <p className="text-2xl font-bold text-foreground">933</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Capacity</p>
              <p className="text-2xl font-bold text-foreground">1,200</p>
            </div>
          </div>

          {/* Mock line graph using bars */}
          <div className="h-40 flex items-end justify-between gap-2 pt-4">
            {mockData.map((point, index) => (
              <div key={point.day} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-primary/30 rounded-t transition-all"
                  style={{ height: `${(point.sales / maxSales) * 100}%` }}
                />
                <span className="text-xs text-muted-foreground">{point.day}</span>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Avg. Daily</p>
              <p className="font-semibold text-foreground">133</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Peak Day</p>
              <p className="font-semibold text-foreground">Sat (220)</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fill Rate</p>
              <p className="font-semibold text-foreground">77.8%</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
