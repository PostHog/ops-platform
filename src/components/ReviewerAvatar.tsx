interface ReviewerAvatarProps {
  name: string
}

export function ReviewerAvatar({ name }: ReviewerAvatarProps) {
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase()
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const getColorFromName = (name: string) => {
    // Generate a hash from the name
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }

    // Define color palette from Tailwind 100 and 300 series
    const colors = [
      { bg: 'bg-red-100', text: 'text-red-700' },
      { bg: 'bg-orange-100', text: 'text-orange-700' },
      { bg: 'bg-amber-100', text: 'text-amber-700' },
      { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      { bg: 'bg-lime-100', text: 'text-lime-700' },
      { bg: 'bg-green-100', text: 'text-green-700' },
      { bg: 'bg-emerald-100', text: 'text-emerald-700' },
      { bg: 'bg-teal-100', text: 'text-teal-700' },
      { bg: 'bg-cyan-100', text: 'text-cyan-700' },
      { bg: 'bg-sky-100', text: 'text-sky-700' },
      { bg: 'bg-blue-100', text: 'text-blue-700' },
      { bg: 'bg-indigo-100', text: 'text-indigo-700' },
      { bg: 'bg-violet-100', text: 'text-violet-700' },
      { bg: 'bg-purple-100', text: 'text-purple-700' },
      { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700' },
      { bg: 'bg-pink-100', text: 'text-pink-700' },
      { bg: 'bg-rose-100', text: 'text-rose-700' },
    ]

    // Use hash to select a color consistently for this name
    const colorIndex = Math.abs(hash) % colors.length
    return colors[colorIndex]
  }

  const initials = getInitials(name)
  const colors = getColorFromName(name)

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full ${colors.bg} ${colors.text} text-xs font-semibold`}
      >
        {initials}
      </div>
      <span>{name}</span>
    </div>
  )
}
