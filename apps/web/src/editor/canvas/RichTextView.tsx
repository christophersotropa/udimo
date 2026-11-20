import type { CSSProperties } from 'react'
import { parseRichText, type RichStyle, type Rgb } from '../../lib/richText.ts'
import { FONT_IDS, FONTS } from '../../model/fonts.ts'

// A RichText element's text on the canvas: each run of styled text (see
// lib/richText.ts) as a <span> with that style. Only React elements and
// style values are made here, never HTML, so tags in text can only style.
export function RichTextView({ text }: { text: string }) {
  return (
    <>
      {parseRichText(text).map((run, i) =>
        'lineBreak' in run ? (
          <br key={i} />
        ) : (
          <span key={i} style={runStyle(run.style)}>
            {run.text}
          </span>
        ),
      )}
    </>
  )
}

const rgb = ({ r, g, b }: Rgb, transparency = 0) =>
  `rgb(${r} ${g} ${b} / ${1 - transparency})`

// A font named in <font face="...">, if it's one Udimo has: by its id
// ("SourceSansPro") or its name ("Source Sans Pro"), case and spaces aside.
function fontCssFor(face: string): string | undefined {
  const wanted = face.replace(/\s+/g, '').toLowerCase()
  const id = FONT_IDS.find(
    (candidate) =>
      candidate.toLowerCase() === wanted ||
      FONTS[candidate].label.replace(/\s+/g, '').toLowerCase() === wanted,
  )
  return id ? FONTS[id].css : undefined
}

function runStyle(style: RichStyle): CSSProperties {
  const decorations = [
    style.underline && 'underline',
    style.strike && 'line-through',
  ].filter(Boolean)
  return {
    fontWeight: style.weight ?? (style.bold ? 700 : undefined),
    fontStyle: style.italic ? 'italic' : undefined,
    textDecorationLine: decorations.length ? decorations.join(' ') : undefined,
    textTransform: style.uppercase ? 'uppercase' : undefined,
    fontVariant: style.smallcaps ? 'small-caps' : undefined,
    fontSize: style.size,
    fontFamily: style.face ? fontCssFor(style.face) : undefined,
    // A colour of its own takes the transparency; otherwise the run fades
    // whatever colour it inherits.
    color: style.color ? rgb(style.color, style.transparency) : undefined,
    opacity:
      !style.color && style.transparency !== undefined
        ? 1 - style.transparency
        : undefined,
    backgroundColor: style.mark
      ? rgb(style.mark.color, style.mark.transparency)
      : undefined,
  }
}
