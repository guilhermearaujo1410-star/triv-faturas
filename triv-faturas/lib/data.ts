import { redis } from './redis'
import { Client, Invoice } from './types'

const CLIENTS_KEY = 'triv:clients'
const INVOICES_KEY = 'triv:invoices'

export async function getClients(): Promise<Client[]> {
  const data = await redis.get<Client[]>(CLIENTS_KEY)
  return data ?? []
}

export async function saveClients(clients: Client[]): Promise<void> {
  await redis.set(CLIENTS_KEY, clients)
}

export async function getInvoices(): Promise<Invoice[]> {
  const data = await redis.get<Invoice[]>(INVOICES_KEY)
  return data ?? []
}

export async function saveInvoices(invoices: Invoice[]): Promise<void> {
  await redis.set(INVOICES_KEY, invoices)
}
