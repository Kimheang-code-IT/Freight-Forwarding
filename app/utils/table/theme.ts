/** Shared Nuxt UI Table chrome: grey header + full cell grid borders + row hover. */
export const freightTableUi = {
  root: 'relative min-w-0 overflow-auto',
  // border-separate is required: collapse prevents sticky headers from pinning.
  base: 'w-full min-w-max border-separate border-spacing-0',
  thead: 'relative z-10 !bg-neutral-100 backdrop-blur-none dark:!bg-neutral-800',
  tbody: [
    '[&>tr:hover>td]:bg-neutral-100/80',
    '[&>tr[data-selected=true]>td]:bg-neutral-100/60',
    'dark:[&>tr:hover>td]:bg-neutral-800/50',
    'dark:[&>tr[data-selected=true]>td]:bg-neutral-800/40',
  ].join(' '),
  th: 'sticky top-0 z-10 !border !border-neutral-200 !bg-neutral-100 px-3 py-2.5 text-left text-xs font-semibold text-neutral-800 whitespace-nowrap dark:!border-neutral-700 dark:!bg-neutral-800 dark:text-neutral-100',
  td: 'border border-neutral-200 bg-white px-3 py-2.5 align-middle dark:border-neutral-700 dark:bg-default',
  tr: 'cursor-pointer',
} as const

/** Full-height list tables: header stays put, only rows scroll. */
export const freightTableFillUi = {
  ...freightTableUi,
  root: 'relative h-full min-h-0 min-w-0 overflow-auto',
} as const

export const freightTableUiReadonly = {
  ...freightTableUi,
  tbody: 'dark:[&>tr:hover>td]:bg-neutral-800/40 [&>tr:hover>td]:bg-neutral-100/60',
  tr: '',
} as const

export const freightTableFillUiReadonly = {
  ...freightTableUiReadonly,
  root: 'relative h-full min-h-0 min-w-0 overflow-auto',
} as const

/** Centered checkbox column classes for list tables. */
export const freightTableCheckboxMeta = {
  class: {
    th: 'sticky top-0 z-10 w-12 text-center align-middle !bg-neutral-100 dark:!bg-neutral-800',
    td: 'w-12 text-center align-middle',
  },
} as const

export const TABLE_VIRTUALIZE_AFTER = 80
