# LockedIn UI workflow

Reviewed October 12, 2026. This work compares official public Notion guidance with
the local LockedIn source. It does not sign in to a user's Notion, copy private page
data, execute downloaded UI code, or decompile a proprietary Notion executable.

## Public guidance observed

| Official source                                                                                                       | Documented pattern                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| [Writing and editing](https://www.notion.com/help/writing-and-editing-basics)                                         | Blocks expose insertion and contextual actions. Desktop has slash commands and block handles; mobile uses visible editing controls. |
| [Page styling](https://www.notion.com/help/customize-and-style-your-content)                                          | Page-wide styling and width options are grouped in the upper-right menu.                                                            |
| [Sidebar navigation](https://www.notion.com/help/navigate-with-the-sidebar)                                           | Sidebar shortcuts and content sections organize pages; Cmd/Ctrl+\\ toggles navigation.                                              |
| [Search](https://www.notion.com/help/search) and [keyboard shortcuts](https://www.notion.com/help/keyboard-shortcuts) | Cmd/Ctrl+K opens search outside a focused block; pages can be reached through search.                                               |
| [Starting with templates](https://www.notion.com/help/start-with-a-template)                                          | Templates become editable copies; reusable blank pages can be duplicated.                                                           |

These observations describe publicly documented behavior, not measured pixels or
an inspection of Notion's internal implementation.

## LockedIn decisions and invariants

The decisions below are design inferences suited to this personal productivity app.
They preserve the existing sidebar shell, theme tokens, typography, rounded cards,
default page width, and one/two-column layout. They do not introduce a new visual
design or claim every Notion interaction is supported.

- Keep save status, Undo, Preview/Edit, and Page options easy to reach. Page options
  groups export/import, reusable templates, layout, and accent and is available in
  both editor modes. Mutations remain gated during draft recovery; export stays useful.
- Put block color, movement, duplication, and deletion inside a contextual menu.
  Controls must remain available by keyboard and touch rather than relying on hover.
  Reordering and removal remain undoable within the current editor session.
- Use a searchable component picker for the actual supported types. Do not advertise
  slash editing, drag-and-drop, rich text, boards, or formulas that are not implemented.
- Allow multiline task descriptions. Preserve newlines and completion state across
  rendering, saves, copies, and reviewed edits. Add task remains an explicit action.
- Default the composer to Edit current page when the page contains blocks. Creation
  in the public workspace opens a separate page through the parent callback; append
  is an explicit alternative. Retain fingerprint validation, typed previews, and clear
  provider disclosure before applying or creating a page.
- Put duplicate/delete actions beside the active sidebar page. Deletion requires a
  confirmation; switching and page creation must first validate and persist the
  current document. Failed writes retain the current page and truthful save status.
- Search starters and reusable templates in one gallery, retaining their distinct
  labels. Selection shows real supported blocks in a read-only preview. Use template
  creates a separate editable copy with new IDs; previewing never modifies a page.
- Cmd/Ctrl+K reveals the existing sidebar and focuses its page-title filter.
  Cmd/Ctrl+\\ toggles navigation. Do not intercept these shortcuts in text inputs,
  editable content, or open dialogs. Mobile navigation uses the existing Sheet with
  accessible titles, focus handling, and a visible trigger.

Notion's width and typography options informed grouping page settings. LockedIn keeps
its current default font and width; this iteration does not add Notion's font switcher,
Small text, or Full width controls. The local sidebar filter does not imply Notion's
full-content search, recent-page ranking, cloud indexes, or connected-app search.

## Implementation map and validation

`components/templates/template-studio.tsx` owns sidebar/current-page actions,
navigation shortcuts, gallery preview, and new-page persistence.
`components/templates/template-editor.tsx` owns Page options, contextual block menus,
component search, composer defaults, and guarded creation callbacks.
`components/templates/template-block.tsx` renders multiline task descriptions and
typed preview content. Existing Radix/shadcn primitives supply the menus and dialogs.

Browser checks should exercise keyboard and touch access, Preview-mode Page options,
multiline task persistence, component/gallery empty searches, preview selection
without mutation, separate-page creation, failed creation retention, and navigation
with edited data. Completed checks and external configuration gaps belong in
[validation](validation.md); see [architecture](architecture.md) and
[template behavior](template-components.md) for contracts.
