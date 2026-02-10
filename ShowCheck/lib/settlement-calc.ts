/**
 * Phase 5: Settlement calculation for a show.
 * Computes "amount owed to artist" from guarantee, door split, ticket revenue, and expenses.
 */

export interface SettlementInputs {
  /** Artist guarantee (flat amount) */
  guarantee: number | null
  /** Artist share of door (e.g. 80 = 80%) */
  door_split_pct: number | null
  /** Actual ticket revenue (gross) */
  ticket_revenue: number | null
  /** Line-item expenses (e.g. [{ description, amount }]) */
  expenses: unknown[]
}

export interface SettlementSummary {
  /** Guarantee amount (if any) */
  guaranteeAmount: number
  /** Door split amount to artist (ticket_revenue * (door_split_pct/100)) */
  doorSplitAmount: number
  /** Total expenses (sum of expense amounts) */
  totalExpenses: number
  /** Amount owed to artist: typically max(guarantee, door_split) - or guarantee + door if both apply; minus any deductions per your deal. Simplified: we use the higher of guarantee or door split. */
  amountOwedToArtist: number
  /** Human-readable breakdown */
  breakdown: string[]
}

function parseExpenseAmount(expense: unknown): number {
  if (expense == null) return 0
  if (typeof expense === "number" && !Number.isNaN(expense)) return expense
  if (typeof expense === "object" && "amount" in expense) {
    const a = (expense as { amount: unknown }).amount
    return typeof a === "number" && !Number.isNaN(a) ? a : 0
  }
  return 0
}

/**
 * Compute settlement summary for a show.
 * Logic: If guarantee is set, artist gets at least guarantee. If door_split_pct and ticket_revenue are set,
 * artist gets that % of door. Common deal: "guarantee vs X% door" = artist gets the *higher* of the two.
 */
export function computeSettlement(inputs: SettlementInputs): SettlementSummary {
  const guarantee = inputs.guarantee ?? 0
  const pct = inputs.door_split_pct ?? 0
  const ticketRevenue = inputs.ticket_revenue ?? 0
  const expenses = Array.isArray(inputs.expenses) ? inputs.expenses : []
  const totalExpenses = expenses.reduce((sum, e) => sum + parseExpenseAmount(e), 0)

  const guaranteeAmount = guarantee
  const doorSplitAmount = pct && ticketRevenue > 0 ? (ticketRevenue * pct) / 100 : 0

  // "Guarantee vs door": artist gets the higher of guarantee or door split (typical deal)
  const amountOwedToArtist = Math.max(guaranteeAmount, doorSplitAmount)

  const breakdown: string[] = []
  if (guaranteeAmount > 0) breakdown.push(`Guarantee: $${guaranteeAmount.toLocaleString()}`)
  if (doorSplitAmount > 0)
    breakdown.push(`Door (${pct}% of $${ticketRevenue.toLocaleString()}): $${doorSplitAmount.toLocaleString()}`)
  if (breakdown.length > 1) breakdown.push(`Artist gets higher of two: $${amountOwedToArtist.toLocaleString()}`)
  if (totalExpenses > 0) breakdown.push(`Expenses: $${totalExpenses.toLocaleString()}`)

  return {
    guaranteeAmount,
    doorSplitAmount,
    totalExpenses,
    amountOwedToArtist,
    breakdown,
  }
}

/**
 * Simple P&L: revenue (e.g. ticket_revenue) minus costs (guarantee/amount owed + expenses).
 * Positive = in the black, negative = in the red.
 */
export function computeShowPnL(
  ticketRevenue: number,
  amountOwedToArtist: number,
  totalExpenses: number
): number {
  return ticketRevenue - amountOwedToArtist - totalExpenses
}
