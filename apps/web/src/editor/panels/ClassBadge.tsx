import type { ClassName, ModifierClass } from '../../model/types.ts'

// The small coloured letter in front of each Explorer row and menu entry,
// so you can tell kinds of objects apart at a glance. The colour is the
// family (blue: containers, green: text, orange: buttons, teal: images,
// purple: modifiers), the letter the kind.
const BADGES: Record<
  ClassName | 'Modifier',
  { letter: string; color: string }
> = {
  ScreenGui: { letter: 'S', color: 'bg-indigo-500/20 text-indigo-300' },
  Frame: { letter: 'F', color: 'bg-blue-500/20 text-blue-300' },
  ScrollingFrame: { letter: 'F', color: 'bg-blue-500/20 text-blue-300' },
  TextLabel: { letter: 'T', color: 'bg-emerald-500/20 text-emerald-300' },
  TextBox: { letter: 'T', color: 'bg-emerald-500/20 text-emerald-300' },
  TextButton: { letter: 'B', color: 'bg-orange-500/20 text-orange-300' },
  ImageButton: { letter: 'B', color: 'bg-orange-500/20 text-orange-300' },
  ImageLabel: { letter: 'I', color: 'bg-teal-500/20 text-teal-300' },
  Modifier: { letter: 'M', color: 'bg-violet-500/20 text-violet-300' },
}

export function ClassBadge({
  className,
}: {
  className: ClassName | ModifierClass
}) {
  const badge =
    className in BADGES ? BADGES[className as ClassName] : BADGES.Modifier // every UI… modifier
  return (
    <span
      aria-hidden="true"
      className={`inline-flex size-4 shrink-0 items-center justify-center rounded text-[10px] font-bold ${badge.color}`}
    >
      {badge.letter}
    </span>
  )
}
