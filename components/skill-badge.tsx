import { skillIcons, brandColor } from '@/lib/skill-icons'

export function SkillBadge({ name }: { name: string }) {
  const icon = skillIcons[name]
  const color = icon ? brandColor(icon) : undefined

  return (
    <li className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
      {icon ? (
        <svg
          role="img"
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-3.5 shrink-0"
          fill={color ?? 'currentColor'}
        >
          <path d={icon.path} />
        </svg>
      ) : null}
      {name}
    </li>
  )
}
