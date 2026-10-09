export function isAuthError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return message.includes('Unauthorized') || message.includes('Forbidden')
}
