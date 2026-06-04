import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'
import { getClients, saveClients, getInvoices, saveInvoices } from '@/lib/data'
import { Client } from '@/lib/types'

export async function GET() {
  const clients = await getClients()
  return NextResponse.json(clients)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const clients = await getClients()

  const newClient: Client = {
    id: uuid(),
    name: body.name,
    service: body.service,
    amount: Number(body.amount),
    paymentMethod: body.paymentMethod,
    billingCycle: body.billingCycle,
    nextDueDate: body.nextDueDate,
    createdAt: new Date().toISOString(),
  }

  clients.push(newClient)
  await saveClients(clients)

  // Create first invoice for this client
  const invoices = await getInvoices()
  const { v4: uuidv4 } = await import('uuid')
  invoices.push({
    id: uuidv4(),
    clientId: newClient.id,
    clientName: newClient.name,
    service: newClient.service,
    amount: newClient.amount,
    dueDate: newClient.nextDueDate,
    status: 'pending',
    createdAt: new Date().toISOString(),
  })
  await saveInvoices(invoices)

  return NextResponse.json(newClient, { status: 201 })
}
