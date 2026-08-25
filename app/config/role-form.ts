import type { DocumentFieldSchema } from '~/types/docetra/common'
import { ACTIVE_STATUS } from '~/config/freight-options'

const statusOptions = ACTIVE_STATUS.map(value => ({ label: value, value }))

export const roleMainFields: DocumentFieldSchema[] = [
  {
    key: 'code',
    labelKey: 'docetra.fields.code',
    type: 'text',
    required: true,
    helpKey: 'docetra.fieldHelp.code',
  },
  {
    key: 'name',
    labelKey: 'docetra.fields.roleName',
    type: 'text',
    required: true,
    helpKey: 'docetra.fieldHelp.roleName',
  },
  {
    key: 'status',
    labelKey: 'docetra.fields.status',
    type: 'select',
    colSpan: 2,
    options: statusOptions,
    helpKey: 'docetra.fieldHelp.status',
  },
  {
    key: 'description',
    labelKey: 'docetra.fields.description',
    type: 'textarea',
    colSpan: 2,
    rows: 4,
    helpKey: 'docetra.fieldHelp.description',
  },
]
