import { createContext } from 'react'

// What's typed in "Filter properties". Rows whose name doesn't contain it
// hide themselves. A context lets every row read it without it being
// passed down through every section. (It has its own file because files
// with components should export only components, for fast refresh.)
export const PropertyFilter = createContext('')
