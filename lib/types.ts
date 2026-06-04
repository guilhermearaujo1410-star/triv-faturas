export type PaymentMethod = 'pix' | 'stripe'
export type BillingCycle = 'weekly' | 'monthly'
export type InvoiceStatus = 'pending' | 'paid' | 'overdue'
export type TaskRecurrence = 'none' | 'weekly' | 'monthly'

export interface Client {
  id: string
  name: string
  service: string
  amount: number
  currency: 'BRL' | 'USD'
  paymentMethod: PaymentMethod
  billingCycle: BillingCycle
  nextDueDate: string
  createdAt: string
}

export interface Invoice {
  id: string
  clientId: string
  clientName: string
  service: string
  amount: number
  currency: 'BRL' | 'USD'
  paymentMethod: PaymentMethod
  dueDate: string
  status: InvoiceStatus
  paidAt?: string
  weeklyChecks?: Record<string, boolean> // key: YYYY-MM-DD, value: paid
  createdAt: string
}

export interface Task {
  id: string
  clientId: string
  title: string
  dueDate?: string
  done: boolean
  recurrence: TaskRecurrence
  createdAt: string
}
