export type PaymentMethod = 'pix' | 'stripe'
export type BillingCycle = 'weekly' | 'monthly'
export type InvoiceStatus = 'pending' | 'paid' | 'overdue'

export interface Client {
  id: string
  name: string
  service: string
  amount: number
  paymentMethod: PaymentMethod
  billingCycle: BillingCycle
  nextDueDate: string // ISO date string YYYY-MM-DD
  createdAt: string
}

export interface Invoice {
  id: string
  clientId: string
  clientName: string
  service: string
  amount: number
  dueDate: string // YYYY-MM-DD
  status: InvoiceStatus
  paidAt?: string
  createdAt: string
}
