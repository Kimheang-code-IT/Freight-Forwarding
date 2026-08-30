import type { FreightModule } from '~/config/freight-modules'
import type { FreightRecord } from '~/config/freight-seed'
import type { ModuleListQuery, ModuleRepository } from '~/repositories/contracts/module'
import { useLcsRepositories } from '~/repositories'
import { delay } from '~/repositories/mock/db'
import { domainError } from '~/utils/lcs/errors'

const NUMBERED_COLLECTIONS = new Set(['quotations', 'jobCharges', 'debitNotes', 'journals'])

export function createMockModuleRepository(module: FreightModule): ModuleRepository {
  return {
    list: async (query: ModuleListQuery = {}) => {
      await delay()
      const store = useFreightStore()
      const page = query.page || 1
      const pageSize = query.page_size || 20
      const result = store.query(module, {
        q: query.q,
        filters: query.filters,
        paginate: query.paginate !== false,
        page,
        limit: pageSize,
        dateField: query.dateField,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        sortKey: query.sortKey,
        sortDir: query.sortDir,
      })
      const items = query.paginate === false ? result.all : result.rows
      return {
        items,
        meta: {
          page,
          page_size: pageSize,
          total: result.total,
        },
      }
    },
    get: async (id) => {
      await delay()
      const store = useFreightStore()
      const record = store.get(module.collection, id)
      if (!record) {
        throw domainError('REFERENCE_NOT_FOUND', 'Record not found.', { statusCode: 404 })
      }
      return record
    },
    create: async (input) => {
      await delay()
      const repos = useLcsRepositories()
      if (module.collection === 'quotations') return repos.quotations.create(input)
      if (module.collection === 'jobCharges') return repos.charges.create(input)
      if (module.collection === 'debitNotes') return repos.finance.createDocument(input)
      if (module.collection === 'journals') return repos.finance.createJournal(input)
      const store = useFreightStore()
      return store.create(module.collection, input, module.collection.slice(0, 3))
    },
    update: async (id, input) => {
      await delay()
      const repos = useLcsRepositories()
      const record = { ...input, id } as FreightRecord
      if (module.collection === 'quotations') return repos.quotations.saveDraft(record)
      if (module.collection === 'jobCharges') return repos.charges.saveDraft(record)
      if (module.collection === 'debitNotes') return repos.finance.saveDraft(record)
      if (module.collection === 'journals') return repos.finance.saveJournal(record)
      const store = useFreightStore()
      return store.save(module.collection, record)
    },
    remove: async (ids) => {
      await delay()
      const store = useFreightStore()
      store.remove(module.collection, ids)
    },
  }
}

export function isNumberedCollection(collection: string) {
  return NUMBERED_COLLECTIONS.has(collection)
}
