/**
 * Where a dragged queue row should land.
 *
 * The row follows the finger, but the list can also scroll underneath it when
 * the finger sits in the top or bottom margin. Both move the row relative to
 * the list, so the finger's own travel (`dy`) and everything the autoscroll
 * moved (`scrollTravel`) add up before the result is rounded to a row.
 *
 * Rounded rather than floored so a row has to pass the halfway mark before it
 * swaps, and clamped so a fast flick cannot aim outside the list.
 */
export const dropIndex = ({
  from,
  dy,
  scrollTravel = 0,
  count,
  rowHeight,
}: {
  from: number
  dy: number
  scrollTravel?: number
  count: number
  rowHeight: number
}) => {
  if (count <= 0) return 0
  const rows = Math.round((dy + scrollTravel) / rowHeight)
  return Math.max(0, Math.min(count - 1, from + rows))
}
