import { NextResponse } from 'next/server'
import { getInvoices } from '@/lib/data'

export async function GET() {
  const invoices = await getInvoices()
  // Sort by due date desc
  invoices.sort((a, b) => b.dueDate.localeCompare(a.dueDate))
  return NextResponse.json(invoices)
}
