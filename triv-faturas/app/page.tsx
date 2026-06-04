'use client'

import { useState, useEffect, useCallback } from 'react'
import { Client, Invoice } from '@/lib/types'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')

const STATUS_LABEL: Record<string, string> = { pending: 'Pendente', paid: 'Pago', overdue: 'Vencido' }
const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  paid: '#22c55e',
  overdue: '#ef4444',
}
const STATUS_BG: Record<string, string> = {
  pending: '#2d1a00',
  paid: '#052e16',
  overdue: '#2d0a0a',
}

export default function Dashboard() {
  const [clients, setClients] = useState<Client[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [tab, setTab] = useState<'invoices' | 'clients'>('invoices')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', service: '', amount: '', paymentMethod: 'pix',
    billingCycle: 'monthly', nextDueDate: '',
  })

  const load = useCallback(async () => {
    const [c, i] = await Promise.all([
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/invoices').then(r => r.json()),
    ])
    setClients(c)
    setInvoices(i)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const addClient = async () => {
    if (!form.name || !form.amount || !form.nextDueDate) return
    setSaving(true)
    await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setForm({ name: '', service: '', amount: '', paymentMethod: 'pix', billingCycle: 'monthly', nextDueDate: '' })
    setShowForm(false)
    setSaving(false)
    load()
  }

  const deleteClient = async (id: string) => {
    if (!confirm('Remover cliente e todas as faturas?')) return
    await fetch(`/api/clients/${id}`, { method: 'DELETE' })
    load()
  }

  const markPaid = async (id: string) => {
    await fetch(`/api/invoices/${id}`, { method: 'PATCH' })
    load()
  }

  // Summary stats
  const today = new Date(); today.setHours(0,0,0,0)
  const thisMonth = today.getMonth()
  const thisYear = today.getFullYear()

  const monthInvoices = invoices.filter(i => {
    const d = new Date(i.dueDate + 'T12:00:00')
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  })
  const totalReceivable = monthInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0)
  const totalPaid = monthInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const overdueCount = invoices.filter(i => i.status === 'overdue').length
  const pixClients = clients.filter(c => c.paymentMethod === 'pix').length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#555' }}>
      Carregando...
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: '#0a0a0a', borderRight: '1px solid #1e1e1e',
        padding: '24px 0', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh'
      }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #1e1e1e' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>Triv Digital</p>
          <p style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Gestão de Faturas</p>
        </div>
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {([['invoices', '📄', 'Faturas'], ['clients', '👥', 'Clientes']] as const).map(([key, icon, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '10px 12px', borderRadius: 8, marginBottom: 4,
              background: tab === key ? '#1e1e1e' : 'transparent',
              color: tab === key ? '#fff' : '#666',
              fontSize: 14, fontWeight: tab === key ? 500 : 400, textAlign: 'left',
            }}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid #1e1e1e' }}>
          <p style={{ fontSize: 11, color: '#3e3e3e' }}>Cron: todo dia 8h BRT</p>
          <p style={{ fontSize: 11, color: '#3e3e3e', marginTop: 2 }}>Notif: D0, D+2, D+3, D+7</p>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 220, flex: 1, padding: '32px 36px', maxWidth: 960 }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'A receber (mês)', value: fmt(totalReceivable), color: '#f59e0b' },
            { label: 'Recebido (mês)', value: fmt(totalPaid), color: '#22c55e' },
            { label: 'Faturas vencidas', value: overdueCount.toString(), color: '#ef4444' },
            { label: 'Clientes PIX', value: pixClients.toString(), color: '#3b82f6' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#141414', border: '1px solid #1e1e1e', borderRadius: 12, padding: '16px 20px'
            }}>
              <p style={{ fontSize: 11, color: '#555', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tab: Faturas */}
        {tab === 'invoices' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>Faturas</h2>
            </div>
            <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
              {invoices.length === 0 ? (
                <p style={{ padding: 32, color: '#555', textAlign: 'center' }}>Nenhuma fatura. Cadastre um cliente.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
                      {['Cliente', 'Serviço', 'Vencimento', 'Valor', 'Status', 'Ação'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: '#555', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv, idx) => (
                      <tr key={inv.id} style={{ borderBottom: idx < invoices.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 500 }}>{inv.clientName}</td>
                        <td style={{ padding: '14px 16px', color: '#888' }}>{inv.service}</td>
                        <td style={{ padding: '14px 16px', color: inv.status === 'overdue' ? '#ef4444' : '#888' }}>
                          {fmtDate(inv.dueDate)}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 600 }}>{fmt(inv.amount)}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            background: STATUS_BG[inv.status], color: STATUS_COLOR[inv.status],
                            padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500
                          }}>
                            {STATUS_LABEL[inv.status]}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {inv.status !== 'paid' && (
                            <button onClick={() => markPaid(inv.id)} style={{
                              background: '#052e16', color: '#22c55e', padding: '5px 12px',
                              fontSize: 12, fontWeight: 500, border: '1px solid #14532d', borderRadius: 6
                            }}>
                              ✓ Pago
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* Tab: Clientes */}
        {tab === 'clients' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>Clientes</h2>
              <button onClick={() => setShowForm(!showForm)} style={{
                background: '#fff', color: '#000', padding: '8px 18px', fontWeight: 600, fontSize: 13
              }}>
                {showForm ? '✕ Cancelar' : '+ Novo cliente'}
              </button>
            </div>

            {/* Add client form */}
            {showForm && (
              <div style={{
                background: '#141414', border: '1px solid #2e2e2e', borderRadius: 12, padding: 24, marginBottom: 24
              }}>
                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 20, color: '#ccc' }}>Novo cliente</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 6 }}>NOME *</label>
                    <input placeholder="Ex: Petronia's Cleaning" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 6 }}>SERVIÇO</label>
                    <input placeholder="Ex: Google Ads + Meta Ads" value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 6 }}>VALOR (R$) *</label>
                    <input type="number" placeholder="1500" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 6 }}>PRÓXIMO VENCIMENTO *</label>
                    <input type="date" value={form.nextDueDate} onChange={e => setForm(f => ({ ...f, nextDueDate: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 6 }}>FORMA DE PAGAMENTO</label>
                    <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                      <option value="pix">PIX</option>
                      <option value="stripe">Stripe (automático)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 6 }}>CICLO DE COBRANÇA</label>
                    <select value={form.billingCycle} onChange={e => setForm(f => ({ ...f, billingCycle: e.target.value }))}>
                      <option value="monthly">Mensal</option>
                      <option value="weekly">Semanal</option>
                    </select>
                  </div>
                </div>
                {form.paymentMethod === 'stripe' && (
                  <p style={{ fontSize: 12, color: '#555', marginTop: 12, padding: '8px 12px', background: '#1a1a1a', borderRadius: 6 }}>
                    ℹ️ Clientes Stripe não recebem notificações (pagamento automático).
                  </p>
                )}
                <button onClick={addClient} disabled={saving} style={{
                  marginTop: 20, background: '#fff', color: '#000',
                  padding: '10px 24px', fontWeight: 600, opacity: saving ? 0.5 : 1
                }}>
                  {saving ? 'Salvando...' : 'Adicionar cliente'}
                </button>
              </div>
            )}

            {/* Client list */}
            <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
              {clients.length === 0 ? (
                <p style={{ padding: 32, color: '#555', textAlign: 'center' }}>Nenhum cliente cadastrado.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
                      {['Nome', 'Serviço', 'Valor', 'Ciclo', 'Pagamento', 'Próx. vencimento', ''].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: '#555', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((c, idx) => (
                      <tr key={c.id} style={{ borderBottom: idx < clients.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 500 }}>{c.name}</td>
                        <td style={{ padding: '14px 16px', color: '#888' }}>{c.service || '—'}</td>
                        <td style={{ padding: '14px 16px', fontWeight: 600 }}>{fmt(c.amount)}</td>
                        <td style={{ padding: '14px 16px', color: '#888' }}>{c.billingCycle === 'monthly' ? 'Mensal' : 'Semanal'}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            background: c.paymentMethod === 'pix' ? '#0a1628' : '#052e16',
                            color: c.paymentMethod === 'pix' ? '#3b82f6' : '#22c55e',
                            padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500
                          }}>
                            {c.paymentMethod === 'pix' ? 'PIX' : 'Stripe'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#888' }}>{fmtDate(c.nextDueDate)}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <button onClick={() => deleteClient(c.id)} style={{
                            background: 'transparent', color: '#ef4444', padding: '5px 10px',
                            fontSize: 12, border: '1px solid #2d0a0a', borderRadius: 6
                          }}>
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
