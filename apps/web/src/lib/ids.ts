// A random, unique id for a new node, e.g. "3b241101-e2bb-4255-8caf-4136c566a962".
// crypto.randomUUID is built into browsers and Node, so no library is needed.
export function createId(): string {
  return crypto.randomUUID()
}
