// A Luau string literal, in double quotes. Backslashes, quotes and line
// breaks are escaped; other invisible control characters become \ddd
// (their character code), which Luau understands.
export function luauString(text: string): string {
  let out = '"'
  for (const char of text) {
    const code = char.codePointAt(0)!
    if (char === '\\') out += '\\\\'
    else if (char === '"') out += '\\"'
    else if (char === '\n') out += '\\n'
    else if (char === '\r') out += '\\r'
    else if (char === '\t') out += '\\t'
    else if (code < 32 || code === 127) {
      out += `\\${String(code).padStart(3, '0')}`
    } else out += char
  }
  return out + '"'
}
