// Test helpers for reading .rbxmx files by text, shared by the exporter's
// and the importer's tests. (A separate file, not exported from a test
// file: importing from a test file would run its tests again.)

// The properties of the first <Item> of `className` in an .rbxmx file, as
// name -> "Type:value" with whitespace removed, so formatting doesn't matter.
export function propertiesOf(
  xml: string,
  className: string,
): Map<string, string> {
  const block = xml.match(
    new RegExp(
      `<Item class="${className}"[^>]*>\\s*<Properties>([\\s\\S]*?)</Properties>`,
    ),
  )
  if (!block) throw new Error(`No ${className} in file`)

  const props = new Map<string, string>()
  for (const [, type, name, value] of block[1].matchAll(
    /<(\w+) name="(\w+)">([\s\S]*?)<\/\1>/g,
  )) {
    props.set(name, `${type}:${value.replace(/\s+/g, '')}`)
  }
  return props
}

export function propertiesOfNamed(
  xml: string,
  name: string,
): Map<string, string> {
  for (const [, body] of xml.matchAll(
    /<Item class="\w+"[^>]*>\s*<Properties>([\s\S]*?)<\/Properties>/g,
  )) {
    if (body.includes(`<string name="Name">${name}</string>`)) {
      return propertiesOf(
        `<Item class="X"><Properties>${body}</Properties>`,
        'X',
      )
    }
  }
  throw new Error(`No item named ${name} in file`)
}

// Every <Item> of `className` in an .rbxmx file, in file order, each as
// propertiesOf gives it.
export function allPropertiesOf(
  xml: string,
  className: string,
): Map<string, string>[] {
  return [
    ...xml.matchAll(
      new RegExp(
        `<Item class="${className}"[^>]*>\\s*<Properties>([\\s\\S]*?)</Properties>`,
        'g',
      ),
    ),
  ].map(([, body]) =>
    propertiesOf(`<Item class="X"><Properties>${body}</Properties>`, 'X'),
  )
}
