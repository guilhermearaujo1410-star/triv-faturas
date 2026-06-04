import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'
import { getInvoices, saveInvoices, getClients, saveClients } from '@/lib/data'
import { addDays, addMonths, format } from 'date-fns'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const invoices = await getInvoices()
  const idx = invoices.findIndex((i) => i.id === params.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  invoices[idx].status = 'paid'
  invoices[idx].paidAt = new Date().toISOString()
  await saveInvoices(invoices)

  // Generate next invoice based on client billing cycle
  const clients = await getClients()
  const client = clients.find((c) => c.id === invoices[idx].clientId)
  if (client) {
    const currentDue = new Date(invoices[idx].dueDate + 'T12:00:00')
    const nextDue = client.billingCycle === 'weekly'
      ? addDays(currentDue, 7)
      : addMonths(currentDue, 1)
    const nextDueDateStr = format(nextDue, 'yyyy-MM-dd')

    // Update client nextDueDate
    const clientIdx = clients.findIndex((c) => c.id === client.id)
    clients[clientIdx].nextDueDate = nextDueDateStr
    await saveClients(clients)

    // Create next invoice
    const allInvoices = await getInvoices()
    allInvoices.push({
      id: uuid(),
      clientId: client.id,
      clientName: client.name,
      service: client.service,
      amount: client.amount,
      dueDate: nextDueDateStr,
      status: 'pending',
      createdAt: new Date().toISOString(),
    })
    await saveInvoices(allInvoices)
  }

  return NextResponse.json({ ok: true })
}
