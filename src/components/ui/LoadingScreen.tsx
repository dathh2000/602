export function LoadingScreen() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="h-20 bg-amber-200 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-16 bg-amber-100 rounded-xl" />
        <div className="h-16 bg-amber-100 rounded-xl" />
      </div>
      <div className="h-32 bg-amber-100 rounded-xl" />
      <div className="space-y-2">
        <div className="h-16 bg-amber-100 rounded-xl" />
        <div className="h-16 bg-amber-100 rounded-xl" />
      </div>
    </div>
  )
}
