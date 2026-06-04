import { NextRequest, NextResponse } from 'next/server'
import { getClients, saveClients, getInvoices, saveInvoices } from '@/lib/data'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const clients = await getClients()
  const filtered = clients.filter((c) => c.id !== params.id)
  await saveClients(filtered)

  // Remove invoices for this client too
  const invoices = await getInvoices()
  const filteredInvoices = invoices.filter((i) => i.clientId !== params.id)
  await saveInvoices(filteredInvoices)

  return NextResponse.json({ ok: true })
}
