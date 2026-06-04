import { Resend } from 'resend'
import { Invoice } from './types'

const resend = new Resend(process.env.RESEND_API_KEY!)
const NOTIFY_EMAIL = 'guilhermearaujo1410@gmail.com'

export async function sendInvoiceNotification(invoice: Invoice, daysOverdue: number) {
  const isToday = daysOverdue === 0
  const subject = isToday
    ? `💰 Fatura vence hoje – ${invoice.clientName}`
    : `⚠️ Fatura em atraso (${daysOverdue}d) – ${invoice.clientName}`

  const dueDateFormatted = new Date(invoice.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')
  const amountFormatted = invoice.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 32px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e5;">
    <div style="background: #0f0f0f; padding: 24px 32px;">
      <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600;">Triv Digital</p>
      <p style="margin: 4px 0 0; color: #888; font-size: 13px;">Gestão de Faturas</p>
    </div>
    <div style="padding: 32px;">
      <div style="background: ${isToday ? '#fff8e1' : '#fff3f3'}; border-left: 3px solid ${isToday ? '#f59e0b' : '#ef4444'}; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 13px; font-weight: 600; color: ${isToday ? '#92400e' : '#991b1b'};">
          ${isToday ? '📅 Vence hoje' : `⏰ ${daysOverdue} ${daysOverdue === 1 ? 'dia' : 'dias'} em atraso`}
        </p>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666; font-size: 14px;">Cliente</td>
          <td style="padding: 8px 0; text-align: right; font-size: 14px; font-weight: 500; color: #0f0f0f;">${invoice.clientName}</td>
        </tr>
        <tr style="border-top: 1px solid #f0f0f0;">
          <td style="padding: 8px 0; color: #666; font-size: 14px;">Serviço</td>
          <td style="padding: 8px 0; text-align: right; font-size: 14px; color: #0f0f0f;">${invoice.service}</td>
        </tr>
        <tr style="border-top: 1px solid #f0f0f0;">
          <td style="padding: 8px 0; color: #666; font-size: 14px;">Vencimento</td>
          <td style="padding: 8px 0; text-align: right; font-size: 14px; color: #0f0f0f;">${dueDateFormatted}</td>
        </tr>
        <tr style="border-top: 1px solid #f0f0f0;">
          <td style="padding: 8px 0; color: #666; font-size: 14px; font-weight: 600;">Valor</td>
          <td style="padding: 8px 0; text-align: right; font-size: 20px; font-weight: 700; color: #0f0f0f;">${amountFormatted}</td>
        </tr>
      </table>
      <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #f0f0f0;">
        <p style="margin: 0; font-size: 12px; color: #999;">Pagamento via PIX · Marque como pago no painel da Triv quando receber.</p>
      </div>
    </div>
  </div>
</body>
</html>`

  await resend.emails.send({
    from: 'Triv Faturas <onboarding@resend.dev>',
    to: NOTIFY_EMAIL,
    subject,
    html,
  })
}
