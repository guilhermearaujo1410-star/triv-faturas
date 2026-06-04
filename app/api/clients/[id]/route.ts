import { NextRequest, NextResponse } from 'next/server'
import { getClients, saveClients, getInvoices, saveInvoices, getTasks, saveTasks } from '@/lib/data'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const clients = await getClients()
  await saveClients(clients.filter((c) => c.id !== params.id))

  const invoices = await getInvoices()
  await saveInvoices(invoices.filter((i) => i.clientId !== params.id))

  const tasks = await getTasks()
  await saveTasks(tasks.filter((t) => t.clientId !== params.id))

  return NextResponse.json({ ok: true })
}
