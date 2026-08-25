import type { FreightRecord } from '~/config/freight-seed'
import { financeDomainStatus } from '~/utils/lcs/states'

export interface GeneralLedgerRow {
  id: string
  postingDate: string
  account: string
  debit: number
  credit: number
  balance: number
  voucherType: string
  voucherNo: string
  againstAccount: string
  partyType: string
  party: string
  jobNo: string
  currency: string
  remark: string
}

function expenseAccount(chargeType: string) {
  const key = chargeType.toLowerCase()
  if (key.includes('truck')) return 'Trucking Expense'
  if (key.includes('custom')) return 'Customs Expense'
  if (key.includes('vietnam')) return 'Vietnam Service Expense'
  return 'Other Expense'
}

function line(
  partial: Omit<GeneralLedgerRow, 'balance' | 'remark'> & { remark?: string },
): Omit<GeneralLedgerRow, 'balance'> {
  return {
    remark: '',
    ...partial,
  }
}

/** Build double-entry ledger lines from freight finance collections (ERPNext-style). */
export function buildGeneralLedger(collections: Record<string, FreightRecord[]>): GeneralLedgerRow[] {
  const rows: Omit<GeneralLedgerRow, 'balance'>[] = []

  for (const note of collections.debitNotes || []) {
    if (financeDomainStatus(note.status) !== 'POSTED') continue
    const amount = Number(note.total || note.amount || 0)
    if (!amount) continue
    const voucherNo = String(note.debitNoteNo || note.id)
    const date = String(note.date || '')
    const party = String(note.customer || '')
    const jobNo = String(note.jobNo || '')
    const currency = String(note.currency || 'USD')
    rows.push(
      line({
        id: `${voucherNo}-ar`,
        postingDate: date,
        account: 'Accounts Receivable',
        debit: amount,
        credit: 0,
        voucherType: 'Debit Note',
        voucherNo,
        againstAccount: 'Freight Revenue',
        partyType: 'Customer',
        party,
        jobNo,
        currency,
      }),
      line({
        id: `${voucherNo}-rev`,
        postingDate: date,
        account: 'Freight Revenue',
        debit: 0,
        credit: amount,
        voucherType: 'Debit Note',
        voucherNo,
        againstAccount: 'Accounts Receivable',
        partyType: 'Customer',
        party,
        jobNo,
        currency,
      }),
    )
  }

  for (const payment of collections.customerPayments || []) {
    const received = Number(payment.received || 0)
    if (!received) continue
    const voucherNo = String(payment.paymentNo || payment.id)
    const date = String(payment.date || '')
    const party = String(payment.customer || '')
    const jobNo = String(payment.jobNo || '')
    const currency = String(payment.currency || 'USD')
    const cashAccount = String(payment.paymentMethod || 'Cash').toLowerCase().includes('cash')
      ? 'Cash'
      : 'Bank'
    rows.push(
      line({
        id: `${voucherNo}-cash`,
        postingDate: date,
        account: cashAccount,
        debit: received,
        credit: 0,
        voucherType: 'Payment Entry',
        voucherNo,
        againstAccount: 'Accounts Receivable',
        partyType: 'Customer',
        party,
        jobNo,
        currency,
        remark: String(payment.remark || ''),
      }),
      line({
        id: `${voucherNo}-ar`,
        postingDate: date,
        account: 'Accounts Receivable',
        debit: 0,
        credit: received,
        voucherType: 'Payment Entry',
        voucherNo,
        againstAccount: cashAccount,
        partyType: 'Customer',
        party,
        jobNo,
        currency,
        remark: String(payment.remark || ''),
      }),
    )
  }

  for (const cost of collections.supplierCosts || []) {
    const amount = Number(cost.amount || 0)
    if (!amount) continue
    const voucherNo = String(cost.invoiceNo || cost.id)
    const account = expenseAccount(String(cost.chargeType || ''))
    const party = String(cost.supplier || '')
    const jobNo = String(cost.jobNo || '')
    const currency = String(cost.currency || 'USD')
    rows.push(
      line({
        id: `${voucherNo}-exp`,
        postingDate: '2026-08-12',
        account,
        debit: amount,
        credit: 0,
        voucherType: 'Purchase Invoice',
        voucherNo,
        againstAccount: 'Accounts Payable',
        partyType: 'Supplier',
        party,
        jobNo,
        currency,
        remark: String(cost.description || ''),
      }),
      line({
        id: `${voucherNo}-ap`,
        postingDate: '2026-08-12',
        account: 'Accounts Payable',
        debit: 0,
        credit: amount,
        voucherType: 'Purchase Invoice',
        voucherNo,
        againstAccount: account,
        partyType: 'Supplier',
        party,
        jobNo,
        currency,
        remark: String(cost.description || ''),
      }),
    )
  }

  for (const payment of collections.supplierPayments || []) {
    const amount = Number(payment.amount || 0)
    if (!amount) continue
    const voucherNo = String(payment.paymentNo || payment.id)
    const date = String(payment.date || '')
    const party = String(payment.supplier || '')
    const jobNo = String(payment.jobNo || '')
    const currency = String(payment.currency || 'USD')
    const cashAccount = String(payment.paymentMethod || 'Cash').toLowerCase().includes('cash')
      ? 'Cash'
      : 'Bank'
    rows.push(
      line({
        id: `${voucherNo}-ap`,
        postingDate: date,
        account: 'Accounts Payable',
        debit: amount,
        credit: 0,
        voucherType: 'Payment Entry',
        voucherNo,
        againstAccount: cashAccount,
        partyType: 'Supplier',
        party,
        jobNo,
        currency,
        remark: String(payment.remark || ''),
      }),
      line({
        id: `${voucherNo}-cash`,
        postingDate: date,
        account: cashAccount,
        debit: 0,
        credit: amount,
        voucherType: 'Payment Entry',
        voucherNo,
        againstAccount: 'Accounts Payable',
        partyType: 'Supplier',
        party,
        jobNo,
        currency,
        remark: String(payment.remark || ''),
      }),
    )
  }

  rows.sort((a, b) => {
    const dateCmp = a.postingDate.localeCompare(b.postingDate)
    if (dateCmp !== 0) return dateCmp
    return a.voucherNo.localeCompare(b.voucherNo)
  })

  let running = 0
  return rows.map((row) => {
    running += row.debit - row.credit
    return { ...row, balance: Math.round(running * 100) / 100 }
  })
}

export function filterGeneralLedger(
  rows: GeneralLedgerRow[],
  options: {
    q?: string
    account?: string
    voucherType?: string
    partyType?: string
    dateFrom?: string
    dateTo?: string
  },
): GeneralLedgerRow[] {
  const q = String(options.q || '').trim().toLowerCase()
  return rows.filter((row) => {
    if (options.account && row.account !== options.account) return false
    if (options.voucherType && row.voucherType !== options.voucherType) return false
    if (options.partyType && row.partyType !== options.partyType) return false
    if (options.dateFrom && row.postingDate < options.dateFrom) return false
    if (options.dateTo && row.postingDate > options.dateTo) return false
    if (!q) return true
    const haystack = [
      row.account,
      row.voucherType,
      row.voucherNo,
      row.againstAccount,
      row.partyType,
      row.party,
      row.jobNo,
      row.remark,
    ].join(' ').toLowerCase()
    return haystack.includes(q)
  })
}
