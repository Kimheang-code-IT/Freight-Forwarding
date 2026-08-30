import type { RecordAttributeRepository, RecordTypeRepository } from '~/repositories/contracts/configuration'
import type { AppConfigRepository, AppInfoRepository, StorageRepository } from '~/repositories/contracts/settings'
import type {
  AttachmentRepository,
  AuditRepository,
  ComponentRepository,
  FinanceRepository,
  JobRepository,
  OrganizationRepository,
  QuotationRepository,
  ServiceChargeRepository,
  UiSchemaRepository,
} from '~/repositories/contracts/lcs'
import { createHttpRecordAttributeRepository, createHttpRecordTypeRepository } from '~/repositories/http/configuration'
import { createHttpAppConfigRepository, createHttpAppInfoRepository } from '~/repositories/http/settings'
import { createHttpStorageRepository } from '~/repositories/http/settings-storage'
import {
  createHttpAttachmentRepository,
  createHttpAuditRepository,
  createHttpComponentRepository,
  createHttpFinanceRepository,
  createHttpJobRepository,
  createHttpOrganizationRepository,
  createHttpQuotationRepository,
  createHttpServiceChargeRepository,
  createHttpUiSchemaRepository,
} from '~/repositories/http/lcs'
import { createMockRecordAttributeRepository, createMockRecordTypeRepository } from '~/repositories/mock/configuration'
import { createMockAppConfigRepository, createMockAppInfoRepository, createMockStorageRepository } from '~/repositories/mock/settings'
import {
  createMockAttachmentRepository,
  createMockAuditRepository,
  createMockComponentRepository,
  createMockFinanceRepository,
  createMockJobRepository,
  createMockOrganizationRepository,
  createMockQuotationRepository,
  createMockServiceChargeRepository,
  createMockUiSchemaRepository,
} from '~/repositories/mock/lcs'
import { createMockModuleRepository } from '~/repositories/mock/module'
import { createHttpModuleRepository } from '~/repositories/http/module'
import type { FreightModule } from '~/config/freight-modules'
import type { ModuleRepository } from '~/repositories/contracts/module'

let mode: 'mock' | 'http' | null = null
let recordAttributeRepo: RecordAttributeRepository
let recordTypeRepo: RecordTypeRepository
let appInfoRepo: AppInfoRepository
let appConfigRepo: AppConfigRepository
let storageRepo: StorageRepository
let quotationRepo: QuotationRepository
let jobRepo: JobRepository
let componentRepo: ComponentRepository
let chargeRepo: ServiceChargeRepository
let financeRepo: FinanceRepository
let organizationRepo: OrganizationRepository
let auditRepo: AuditRepository
let attachmentRepo: AttachmentRepository
let uiSchemaRepo: UiSchemaRepository

function ensureRepositories() {
  const nextMode = useRuntimeConfig().public.useMockData !== false ? 'mock' : 'http'
  if (mode === nextMode) return
  mode = nextMode
  const mock = nextMode === 'mock'
  recordAttributeRepo = mock ? createMockRecordAttributeRepository() : createHttpRecordAttributeRepository()
  recordTypeRepo = mock ? createMockRecordTypeRepository() : createHttpRecordTypeRepository()
  appInfoRepo = mock ? createMockAppInfoRepository() : createHttpAppInfoRepository()
  appConfigRepo = mock ? createMockAppConfigRepository() : createHttpAppConfigRepository()
  storageRepo = mock ? createMockStorageRepository() : createHttpStorageRepository()
  quotationRepo = mock ? createMockQuotationRepository() : createHttpQuotationRepository()
  jobRepo = mock ? createMockJobRepository() : createHttpJobRepository()
  componentRepo = mock ? createMockComponentRepository() : createHttpComponentRepository()
  chargeRepo = mock ? createMockServiceChargeRepository() : createHttpServiceChargeRepository()
  financeRepo = mock ? createMockFinanceRepository() : createHttpFinanceRepository()
  organizationRepo = mock ? createMockOrganizationRepository() : createHttpOrganizationRepository()
  auditRepo = mock ? createMockAuditRepository() : createHttpAuditRepository()
  attachmentRepo = mock ? createMockAttachmentRepository() : createHttpAttachmentRepository()
  uiSchemaRepo = mock ? createMockUiSchemaRepository() : createHttpUiSchemaRepository()
}

export function useConfigurationRepositories() {
  ensureRepositories()
  return { attributes: recordAttributeRepo!, recordTypes: recordTypeRepo! }
}

export function useSettingsRepositories() {
  ensureRepositories()
  return { appInfo: appInfoRepo!, appConfig: appConfigRepo!, storage: storageRepo! }
}

export function useLcsRepositories() {
  ensureRepositories()
  return {
    quotations: quotationRepo!,
    jobs: jobRepo!,
    components: componentRepo!,
    charges: chargeRepo!,
    finance: financeRepo!,
    organizations: organizationRepo!,
    audit: auditRepo!,
    attachments: attachmentRepo!,
    uiSchema: uiSchemaRepo!,
  }
}

export function useModuleRepository(module: FreightModule): ModuleRepository {
  ensureRepositories()
  return mode === 'mock'
    ? createMockModuleRepository(module)
    : createHttpModuleRepository(module)
}
