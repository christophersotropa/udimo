// Makes the browser download `text` as a file called `filename`, without a server.
// A Blob is file-like data held in memory; an object URL is a temporary link to
// it; clicking a hidden <a download> link saves it.
export function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()

  // Free the memory once the download has started. Doing it in the same
  // instant as the click can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
