import { redis } from './redis'
import { Client, Invoice, Task } from './types'

const CLIENTS_KEY = 'triv:clients'
const INVOICES_KEY = 'triv:invoices'
const TASKS_KEY = 'triv:tasks'

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

export async function getTasks(): Promise<Task[]> {
  const data = await redis.get<Task[]>(TASKS_KEY)
  return data ?? []
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  await redis.set(TASKS_KEY, tasks)
}
