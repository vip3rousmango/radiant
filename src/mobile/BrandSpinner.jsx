/**
 * The Allegretto mark, in whatever color the app is themed.
 *
 * ⚠️ IT IS A MASK, NOT A PICTURE. The Mac paints the mark by masking
 * src/assets/allegretto-mark.png — the supplied Allegretto favicon — with the
 * current accent (see `.logo-mark` in src/styles.css). This does the same, so
 * picking a theme recolors the mark everywhere.
 *
 * The supplied mark is square, so it is appropriate for the compact mark
 * surfaces this component serves. The wider Allegretto logo remains separate
 * and is only used in a box with its own aspect ratio.
 */
import React from 'react'
import maskUrl from '../assets/allegretto-mark.png'

const maskStyle = (size) => ({
  width: size,
  height: size,
  background: 'currentColor',
  WebkitMask: `url(${maskUrl}) center / contain no-repeat`,
  mask: `url(${maskUrl}) center / contain no-repeat`
})

/** The still Allegretto mark used by compact brand surfaces. */
export function BrandMark ({ size = 29, className = '' }) {
  return (
    <span
      className={'rx-brand-static ' + className}
      style={maskStyle(size)}
      aria-hidden="true"
    />
  )
}

export default function BrandSpinner ({ size = 26, progress = null }) {
  const known = typeof progress === 'number' && isFinite(progress)
  const r = size / 2 - 1.25
  const c = 2 * Math.PI * r
  return (
    <span className="rx-brand-spin" style={{ width: size, height: size }}>
      <span className="rx-brand-spin-mark" style={maskStyle(size)} aria-hidden="true" />
      {known && (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={`${c * Math.min(Math.max(progress, 0), 1)} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
      )}
    </span>
  )
}

export { BrandSpinner }
