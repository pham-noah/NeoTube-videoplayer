/*
 * The text behind the crash screen's "Copy details" button. Kept apart from the
 * component so it can be tested without a renderer, and so the same shape is
 * what a user pastes into an issue.
 */
export const formatErrorReport = (
  error: unknown,
  info?: { componentStack?: string | null },
  context?: { app?: string; version?: string; platform?: string },
) => {
  const message =
    error instanceof Error ? `${error.name}: ${error.message}` : typeof error === 'string' ? error : error ? JSON.stringify(error) : 'Unknown error'
  const stack = error instanceof Error && error.stack ? error.stack : ''
  const head = [context?.app, context?.version, context?.platform].filter(Boolean).join(' ')

  return [
    head ? `## ${head}` : '',
    message,
    stack && !stack.includes(message) ? stack : '',
    info?.componentStack ? `Component stack:${info.componentStack}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}
