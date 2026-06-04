import { NextRequest, NextResponse } from 'next/server'
import { getInvoices, saveInvoices } from '@/lib/data'
import { sendInvoiceNotification } from '@/lib/email'
import { differenceInDays, parseISO } from 'date-fns'

const NOTIFY_DAYS = [0, 2, 3, 7]

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const invoices = await getInvoices()
  let updated = false
  const results: string[] = []

  for (const invoice of invoices) {
    if (invoice.status === 'paid') continue

    const due = parseISO(invoice.dueDate)
    due.setHours(0, 0, 0, 0)
    const daysOverdue = differenceInDays(today, due)

    // Mark as overdue if past due date
    if (daysOverdue > 0 && invoice.status === 'pending') {
      invoice.status = 'overdue'
      updated = true
    }

    // Send notification on D+0, D+2, D+3, D+7
    if (NOTIFY_DAYS.includes(daysOverdue)) {
      try {
        await sendInvoiceNotification(invoice, daysOverdue)
        results.push(`Notified: ${invoice.clientName} (D+${daysOverdue})`)
      } catch (err) {
        results.push(`Error notifying ${invoice.clientName}: ${err}`)
      }
    }
  }

  if (updated) {
    await saveInvoices(invoices)
  }

  return NextResponse.json({ ok: true, processed: results })
}
