import type { FreightRecord } from '~/config/freight-seed'

export interface QuotationRecord extends FreightRecord {
  quotationNo: string
  customer: string
  status: string
  direction?: string
  currency?: string
  total?: number
}

export interface ServiceOrderRecord extends FreightRecord {
  jobNo: string
  customer: string
  status: string
  workflowStatus?: string
}

export interface ServiceChargeRecord extends FreightRecord {
  chargeNo?: string
  jobNo: string
  chargeSide: string
  amount: number
  status: string
}

export interface FinancialDocumentRecord extends FreightRecord {
  debitNoteNo: string
  documentType: string
  customer?: string
  supplier?: string
  total?: number
  status: string
}

export interface JournalRecord extends FreightRecord {
  entryNo: string
  status: string
  debitTotal?: number
  creditTotal?: number
  lines?: Array<Record<string, unknown>>
}

export function toQuotationRecord(dto: Record<string, unknown>): QuotationRecord {
  return {
    id: String(dto.id || ''),
    quotationNo: String(dto.quotation_no || dto.quotationNo || ''),
    customer: String(dto.customer || ''),
    status: String(dto.status || 'Draft'),
    direction: dto.direction ? String(dto.direction) : undefined,
    currency: dto.currency ? String(dto.currency) : undefined,
    total: dto.total == null ? undefined : Number(dto.total),
    ...dto,
  }
}

export function toQuotationDto(record: QuotationRecord): Record<string, unknown> {
  return {
    ...record,
    quotation_no: record.quotationNo,
  }
}

export function toServiceChargeRecord(dto: Record<string, unknown>): ServiceChargeRecord {
  return {
    id: String(dto.id || ''),
    chargeNo: dto.charge_no ? String(dto.charge_no) : dto.chargeNo ? String(dto.chargeNo) : undefined,
    jobNo: String(dto.job_no || dto.jobNo || ''),
    chargeSide: String(dto.charge_side || dto.chargeSide || ''),
    amount: Number(dto.amount || 0),
    status: String(dto.status || 'Draft'),
    ...dto,
  }
}

export function toServiceChargeDto(record: ServiceChargeRecord): Record<string, unknown> {
  return {
    ...record,
    charge_no: record.chargeNo,
    job_no: record.jobNo,
    charge_side: record.chargeSide,
  }
}

export function toFinancialDocumentRecord(dto: Record<string, unknown>): FinancialDocumentRecord {
  return {
    id: String(dto.id || ''),
    debitNoteNo: String(dto.debit_note_no || dto.debitNoteNo || ''),
    documentType: String(dto.document_type || dto.documentType || 'CUSTOMER_INVOICE'),
    customer: dto.customer ? String(dto.customer) : undefined,
    supplier: dto.supplier ? String(dto.supplier) : undefined,
    total: dto.total == null ? undefined : Number(dto.total),
    status: String(dto.status || 'Draft'),
    ...dto,
  }
}

export function toFinancialDocumentDto(record: FinancialDocumentRecord): Record<string, unknown> {
  return {
    ...record,
    debit_note_no: record.debitNoteNo,
    document_type: record.documentType,
  }
}

export function toJournalRecord(dto: Record<string, unknown>): JournalRecord {
  return {
    id: String(dto.id || ''),
    entryNo: String(dto.entry_no || dto.entryNo || ''),
    status: String(dto.status || 'DRAFT'),
    debitTotal: dto.debit_total == null ? dto.debitTotal == null ? undefined : Number(dto.debitTotal) : Number(dto.debit_total),
    creditTotal: dto.credit_total == null ? dto.creditTotal == null ? undefined : Number(dto.creditTotal) : Number(dto.credit_total),
    lines: Array.isArray(dto.lines) ? dto.lines as Array<Record<string, unknown>> : undefined,
    ...dto,
  }
}

export function toJournalDto(record: JournalRecord): Record<string, unknown> {
  return {
    ...record,
    entry_no: record.entryNo,
    debit_total: record.debitTotal,
    credit_total: record.creditTotal,
  }
}
