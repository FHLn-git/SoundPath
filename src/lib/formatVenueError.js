/**
 * Turn a thrown value from API/async code into a user-facing message that always
 * includes a short explanation. Never return a bare "Failed" without a reason.
 * @param {unknown} err
 * @param {{ operation: string, fallbackReason?: string }} context
 * @returns {string}
 */
export function formatOperationError(err, context) {
  const { operation, fallbackReason = 'Something went wrong on our side.' } = context

  if (err == null) {
    return `${operation} didn't complete. ${fallbackReason}`
  }

  if (typeof err === 'string') return err

  if (err instanceof Error) {
    const msg = err.message?.trim()
    if (msg) {
      if (msg.length <= 200) return msg
      return `${msg.slice(0, 197)}…`
    }
    return `${operation} didn't complete. ${fallbackReason}`
  }

  const obj = err && typeof err === 'object' ? err : {}
  const message = typeof obj.message === 'string' ? obj.message.trim() : ''
  const details = typeof obj.details === 'string' ? obj.details.trim() : ''
  const code = typeof obj.code === 'string' ? obj.code : ''

  if (message || details) {
    const parts = [message, details].filter(Boolean)
    const combined = parts.join('. ')
    if (combined.length <= 200) return combined
    return `${combined.slice(0, 197)}…`
  }

  if (code) {
    return `${operation} failed (${code}). ${fallbackReason}`
  }

  return `${operation} didn't complete. ${fallbackReason}`
}
