const COLORS = ['bg-amber-400','bg-blue-400','bg-purple-400','bg-green-400','bg-red-400']
interface Props { name: string; index?: number; size?: 'sm' | 'md' }
export function Avatar({ name, index = 0, size = 'sm' }: Props) {
  const sz = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'
  return (
    <div className={`${sz} ${COLORS[index % COLORS.length]} rounded-full flex items-center justify-center text-white font-bold`}>
      {name[0]?.toUpperCase()}
    </div>
  )
}
