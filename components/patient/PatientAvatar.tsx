interface Props {
  name: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const GRADIENTS = [
  'from-pink-500 to-purple-600',
  'from-cyan-400 to-blue-600',
  'from-orange-400 to-pink-500',
  'from-green-400 to-cyan-500',
  'from-yellow-400 to-orange-500',
  'from-purple-400 to-pink-600',
  'from-blue-400 to-indigo-600',
  'from-rose-400 to-red-600',
]

function gradientFor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}

const sizes = { sm: 'h-8 w-8 text-sm', md: 'h-11 w-11 text-base', lg: 'h-14 w-14 text-xl' }

export function PatientAvatar({ name, avatarUrl, size = 'md', className = '' }: Props) {
  const s = sizes[size]
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt={name} className={`${s} rounded-full object-cover ${className}`} />
    )
  }
  const initial = name?.charAt(0)?.toUpperCase() ?? '?'
  const grad = gradientFor(name ?? '')
  return (
    <div className={`${s} rounded-full bg-gradient-to-br ${grad} flex items-center justify-center font-bold text-white flex-shrink-0 ${className}`}>
      {initial}
    </div>
  )
}
