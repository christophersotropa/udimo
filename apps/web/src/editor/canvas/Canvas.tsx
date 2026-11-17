// The middle area. The gray box stands in for the game screen (16:9, like a PC).
// Later builds render the user's ScreenGui inside it.
export function Canvas() {
  return (
    <main className="flex min-h-0 min-w-0 items-center justify-center overflow-hidden bg-zinc-950 p-8">
      <div className="flex aspect-video w-full max-w-4xl items-center justify-center rounded-sm bg-zinc-800 ring-1 ring-zinc-700">
        <p className="text-sm text-zinc-500">Canvas</p>
      </div>
    </main>
  )
}
