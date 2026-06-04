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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json()
  const clients = await getClients()
  const idx = clients.findIndex((c) => c.id === params.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  clients[idx] = {
    ...clients[idx],
    name: body.name ?? clients[idx].name,
    service: body.service ?? clients[idx].service,
    amount: body.amount !== undefined ? Number(body.amount) : clients[idx].amount,
    currency: body.currency ?? clients[idx].currency,
    paymentMethod: body.paymentMethod ?? clients[idx].paymentMethod,
    billingCycle: body.billingCycle ?? clients[idx].billingCycle,
    nextDueDate: body.nextDueDate ?? clients[idx].nextDueDate,
  }

  await saveClients(clients)
  return NextResponse.json(clients[idx])
}
