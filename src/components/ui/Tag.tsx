type Variant = 'red' | 'green' | 'yellow' | 'blue'
const styles: Record<Variant, string> = {
  red:    'bg-red-100 text-red-600',
  green:  'bg-green-100 text-green-600',
  yellow: 'bg-amber-100 text-amber-700',
  blue:   'bg-blue-100 text-blue-600',
}
export function Tag({ label, variant }: { label: string; variant: Variant }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${styles[variant]}`}>{label}</span>
}
