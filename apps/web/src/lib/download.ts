// Makes the browser download `text` as a file called `filename`, without a server.
// A Blob is file-like data held in memory; an object URL is a temporary link to
// it; clicking a hidden <a download> link saves it.
// `type` tells the browser what kind of file it is, e.g. 'application/json'.
export function downloadTextFile(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()

  // Free the memory once the download has started. Doing it in the same
  // instant as the click can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
