'use client'
interface Props { onClick: () => void }
export function FAB({ onClick }: Props) {
  return (
    <button onClick={onClick}
      className="fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-br from-amber-400 to-red-500 text-white rounded-full text-3xl font-light shadow-lg shadow-red-300/50 flex items-center justify-center z-40">
      +
    </button>
  )
}
