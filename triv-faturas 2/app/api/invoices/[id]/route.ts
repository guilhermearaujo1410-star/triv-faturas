import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'
import { getInvoices, saveInvoices, getClients, saveClients } from '@/lib/data'
import { addDays, addMonths, format } from 'date-fns'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => ({}))
  const invoices = await getInvoices()
  const idx = invoices.findIndex((i) => i.id === params.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Weekly check toggle
  if (body.weeklyDate !== undefined) {
    if (!invoices[idx].weeklyChecks) invoices[idx].weeklyChecks = {}
    invoices[idx].weeklyChecks![body.weeklyDate] = body.checked
    await saveInvoices(invoices)
    return NextResponse.json({ ok: true })
  }

  // Mark as paid
  invoices[idx].status = 'paid'
  invoices[idx].paidAt = new Date().toISOString()
  await saveInvoices(invoices)

  const clients = await getClients()
  const client = clients.find((c) => c.id === invoices[idx].clientId)
  if (client) {
    const currentDue = new Date(invoices[idx].dueDate + 'T12:00:00')
    const nextDue = client.billingCycle === 'weekly'
      ? addDays(currentDue, 7)
      : addMonths(currentDue, 1)
    const nextDueDateStr = format(nextDue, 'yyyy-MM-dd')

    const clientIdx = clients.findIndex((c) => c.id === client.id)
    clients[clientIdx].nextDueDate = nextDueDateStr
    await saveClients(clients)

    const allInvoices = await getInvoices()
    allInvoices.push({
      id: uuid(),
      clientId: client.id,
      clientName: client.name,
      service: client.service,
      amount: client.amount,
      currency: client.currency ?? 'BRL',
      paymentMethod: client.paymentMethod,
      dueDate: nextDueDateStr,
      status: 'pending',
      weeklyChecks: {},
      createdAt: new Date().toISOString(),
    })
    await saveInvoices(allInvoices)
  }

  return NextResponse.json({ ok: true })
}
