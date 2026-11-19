import { type ChangeEvent, useRef } from 'react'
import { createPetInventoryDocument } from '../../app/petInventory.ts'
import { createSampleDocument } from '../../app/sampleDocument.ts'
import { createEmptyDocument } from '../../model/document.ts'
import { ChevronDownIcon, LogoIcon } from '../panels/icons.tsx'
import { MenuItem, MenuLabel, MenuSeparator, Popover } from '../ui/Popover.tsx'
import { openProjectFile, saveProject, startFrom } from './projectFiles.ts'

// The logo in the top-left corner opens the main menu: new designs,
// opening and saving project files.
export function MainMenu() {
  // A hidden file picker, clicked by "Open project…", because a real
  // <input type="file"> can't be styled like a menu item.
  const fileInputRef = useRef<HTMLInputElement>(null)

  function onFilePicked(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // so picking the same file again still counts
    if (file) void openProjectFile(file)
  }

  return (
    <>
      <Popover
        width="w-72"
        trigger={({ open, toggle }) => (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-label="Main menu"
            className="flex items-center gap-2 rounded-md py-1 pr-1.5 pl-1 hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-accent text-white">
              <LogoIcon size={16} />
            </span>
            <span className="text-sm font-semibold text-ink">Udimo</span>
            <ChevronDownIcon className="text-faint" size={12} />
          </button>
        )}
      >
        {(close) => {
          const run = (action: () => void) => () => {
            close()
            action()
          }
          return (
            <>
              <MenuLabel>New</MenuLabel>
              <MenuItem
                onClick={run(() => startFrom(createEmptyDocument))}
                hint="Start from nothing"
              >
                Empty ScreenGui
              </MenuItem>
              <MenuItem
                onClick={run(() => startFrom(createSampleDocument))}
                hint="The small starter layout"
              >
                Shop example
              </MenuItem>
              <MenuItem
                onClick={run(() => startFrom(createPetInventoryDocument))}
                hint="A bigger layout: grid, list, modifiers, fonts"
              >
                Pet Inventory example
              </MenuItem>
              <MenuSeparator />
              <MenuItem
                onClick={run(() => fileInputRef.current?.click())}
                hint="A .udimo.json file you saved"
              >
                Open project…
              </MenuItem>
              <MenuItem
                onClick={run(saveProject)}
                hint="Download this design as a .udimo.json file"
              >
                Save project
              </MenuItem>
            </>
          )
        }}
      </Popover>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={onFilePicked}
        hidden
      />
    </>
  )
}
