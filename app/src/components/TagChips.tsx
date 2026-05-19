import { TAG_META, type TagKey } from '@/lib/tags'

interface Props {
  tags: TagKey[]
}

export default function TagChips({ tags }: Props) {
  if (tags.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {tags.map((key) => {
        const meta = TAG_META[key]
        return (
          <span
            key={key}
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${meta.tw}`}
          >
            {meta.emoji} {meta.label}
          </span>
        )
      })}
    </div>
  )
}
