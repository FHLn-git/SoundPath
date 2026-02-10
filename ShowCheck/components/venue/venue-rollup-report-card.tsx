"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useEvent } from "@/components/event-context"
import { computeSettlement } from "@/lib/settlement-calc"
import { BarChart3, Download, Music } from "lucide-react"
import { format, parseISO } from "date-fns"

/** Build CSV string from rows (array of string arrays). */
function toCSV(rows: string[][]): string {
  return rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n")
}

/** Trigger download of a blob as a file. */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function VenueRollupReportCard() {
  const { events } = useEvent()

  const { revenueByMonth, topArtists } = useMemo(() => {
    const monthMap = new Map<string, { revenue: number; shows: number }>()
    const artistMap = new Map<string, { shows: number; revenue: number }>()
    events.forEach((e) => {
      const summary = computeSettlement({
        guarantee: e.guarantee ?? null,
        door_split_pct: e.doorSplitPct ?? null,
        ticket_revenue: e.ticketRevenue ?? null,
        expenses: Array.isArray(e.expenses) ? e.expenses : [],
      })
      const revenue = (e.ticketRevenue ?? 0) || 0
      const artistName = (e.name || e.id).trim() || "—"
      const monthKey = e.date.slice(0, 7)
      const existing = monthMap.get(monthKey) ?? { revenue: 0, shows: 0 }
      monthMap.set(monthKey, {
        revenue: existing.revenue + revenue,
        shows: existing.shows + 1,
      })
      const art = artistMap.get(artistName) ?? { shows: 0, revenue: 0 }
      artistMap.set(artistName, {
        shows: art.shows + 1,
        revenue: art.revenue + summary.amountOwedToArtist,
      })
    })
    const revenueByMonth = Array.from(monthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12)
    const topArtists = Array.from(artistMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.shows - a.shows)
      .slice(0, 10)
    return { revenueByMonth, topArtists }
  }, [events])

  const handleExportCSV = () => {
    const rows: string[][] = [
      ["Report", "Venue roll-up"],
      [],
      ["Revenue by month"],
      ["Month", "Shows", "Ticket revenue"],
      ...revenueByMonth.map((r) => [
        r.month,
        String(r.shows),
        String(r.revenue.toFixed(2)),
      ]),
      [],
      ["Top artists (by show count)"],
      ["Artist", "Shows", "Amount owed (artist)"],
      ...topArtists.map((r) => [
        r.name,
        String(r.shows),
        String(r.revenue.toFixed(2)),
      ]),
    ]
    const csv = toCSV(rows)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const filename = `venue-rollup-${format(new Date(), "yyyy-MM-dd")}.csv`
    downloadBlob(blob, filename)
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Roll-up report</CardTitle>
            <CardDescription className="text-xs">
              Revenue by month · Top artists
            </CardDescription>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            Revenue by month
          </h4>
          {revenueByMonth.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono">Month</TableHead>
                  <TableHead className="text-right">Shows</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueByMonth.map((r) => (
                  <TableRow key={r.month}>
                    <TableCell className="font-mono">
                      {format(parseISO(r.month + "-01"), "MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-right font-mono">{r.shows}</TableCell>
                    <TableCell className="text-right font-mono">
                      ${r.revenue.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <Music className="w-4 h-4 text-muted-foreground" />
            Top artists (by show count)
          </h4>
          {topArtists.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artist</TableHead>
                  <TableHead className="text-right">Shows</TableHead>
                  <TableHead className="text-right">Amount owed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topArtists.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right font-mono">{r.shows}</TableCell>
                    <TableCell className="text-right font-mono">
                      ${r.revenue.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
