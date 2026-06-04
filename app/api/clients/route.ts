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
    currency: body.currency ?? 'BRL',
    paymentMethod: body.paymentMethod,
    billingCycle: body.billingCycle,
    nextDueDate: body.nextDueDate,
    createdAt: new Date().toISOString(),
  }

  clients.push(newClient)
  await saveClients(clients)

  const invoices = await getInvoices()
  invoices.push({
    id: uuid(),
    clientId: newClient.id,
    clientName: newClient.name,
    service: newClient.service,
    amount: newClient.amount,
    currency: newClient.currency,
    paymentMethod: newClient.paymentMethod,
    dueDate: newClient.nextDueDate,
    status: 'pending',
    weeklyChecks: {},
    createdAt: new Date().toISOString(),
  })
  await saveInvoices(invoices)

  return NextResponse.json(newClient, { status: 201 })
}
