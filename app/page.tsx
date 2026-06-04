'use client'

import { useState, useEffect, useCallback } from 'react'
import { Client, Invoice, Task } from '@/lib/types'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtUSD = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')

const STATUS_LABEL: Record<string, string> = { pending: 'Pendente', paid: 'Pago', overdue: 'Vencido' }
const STATUS_COLOR: Record<string, string> = { pending: '#f59e0b', paid: '#22c55e', overdue: '#ef4444' }
const STATUS_BG: Record<string, string> = { pending: '#2d1a00', paid: '#052e16', overdue: '#2d0a0a' }

type SortField = 'clientName' | 'dueDate' | 'amount' | 'paymentMethod'
type SortDir = 'asc' | 'desc'
type Tab = 'invoices' | 'clients' | 'crm'

const emptyForm = { name: '', service: '', amount: '', currency: 'BRL', paymentMethod: 'pix', billingCycle: 'monthly', nextDueDate: '' }

export default function Dashboard() {
  const [clients, setClients] = useState<Client[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [tab, setTab] = useState<Tab>('invoices')
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [usdRate, setUsdRate] = useState<number>(5.70)
  const [displayCurrency, setDisplayCurrency] = useState<'BRL' | 'USD'>('BRL')
  const [sortField, setSortField] = useState<SortField>('dueDate')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [filterPayment, setFilterPayment] = useState<'all' | 'pix' | 'stripe'>('all')
  const [expandedClient, setExpandedClient] = useState<string | null>(null)
  const [newTaskMap, setNewTaskMap] = useState<Record<string, { title: string; dueDate: string; recurrence: string }>>({})
  const [form, setForm] = useState({ ...emptyForm })

  const load = useCallback(async () => {
    const [c, i, t, fx] = await Promise.all([
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/invoices').then(r => r.json()),
      fetch('/api/tasks').then(r => r.json()),
      fetch('/api/fx').then(r => r.json()),
    ])
    setClients(c)
    setInvoices(i)
    setTasks(t)
    setUsdRate(fx.rate ?? 5.70)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const convertAmt = (amount: number, currency: 'BRL' | 'USD') => {
    if (displayCurrency === currency) return amount
    if (displayCurrency === 'USD') return amount / usdRate
    return amount * usdRate
  }

  const fmt = (amount: number, currency?: 'BRL' | 'USD') => {
    const converted = convertAmt(amount, currency ?? 'BRL')
    return displayCurrency === 'BRL' ? fmtBRL(converted) : fmtUSD(converted)
  }

  const fmtDisplay = (v: number) => displayCurrency === 'BRL' ? fmtBRL(v) : fmtUSD(v)

  const startEdit = (client: Client) => {
    setEditingClient(client)
    setForm({
      name: client.name,
      service: client.service ?? '',
      amount: client.amount.toString(),
      currency: client.currency ?? 'BRL',
      paymentMethod: client.paymentMethod,
      billingCycle: client.billingCycle,
      nextDueDate: client.nextDueDate,
    })
    setShowForm(true)
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingClient(null)
    setForm({ ...emptyForm })
  }

  const saveClient = async () => {
    if (!form.name || !form.amount || !form.nextDueDate) return
    setSaving(true)
    if (editingClient) {
      await fetch(`/api/clients/${editingClient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } else {
      await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    }
    cancelForm()
    setSaving(false)
    load()
  }

  const deleteClient = async (id: string) => {
    if (!confirm('Remover cliente e todas as faturas e tasks?')) return
    await fetch(`/api/clients/${id}`, { method: 'DELETE' })
    load()
  }

  const markPaid = async (id: string) => {
    await fetch(`/api/invoices/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    load()
  }

  const toggleWeeklyCheck = async (invoiceId: string, date: string, checked: boolean) => {
    await fetch(`/api/invoices/${invoiceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weeklyDate: date, checked }),
    })
    load()
  }

  const addTask = async (clientId: string) => {
    const t = newTaskMap[clientId]
    if (!t?.title) return
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, title: t.title, dueDate: t.dueDate || undefined, recurrence: t.recurrence || 'none' }),
    })
    setNewTaskMap(m => ({ ...m, [clientId]: { title: '', dueDate: '', recurrence: 'none' } }))
    load()
  }

  const toggleTask = async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: 'PATCH' })
    load()
  }

  const deleteTask = async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    load()
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const sortedInvoices = [...invoices]
    .filter(i => filterPayment === 'all' || i.paymentMethod === filterPayment)
    .sort((a, b) => {
      let av: string | number = a[sortField] ?? ''
      let bv: string | number = b[sortField] ?? ''
      if (sortField === 'amount') {
        av = convertAmt(a.amount, a.currency ?? 'BRL')
        bv = convertAmt(b.amount, b.currency ?? 'BRL')
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const sortIcon = (field: SortField) => sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'

  const getWeekDates = (dueDate: string) => {
    const due = new Date(dueDate + 'T12:00:00')
    const dates = []
    for (let i = 3; i >= 0; i--) {
      const d = new Date(due)
      d.setDate(d.getDate() - i * 7)
      dates.push(d.toISOString().split('T')[0])
    }
    return dates
  }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const thisMonth = today.getMonth(), thisYear = today.getFullYear()
  const monthInvoices = invoices.filter(i => {
    const d = new Date(i.dueDate + 'T12:00:00')
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  })
  const totalReceivable = monthInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + convertAmt(i.amount, i.currency ?? 'BRL'), 0)
  const totalPaid = monthInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + convertAmt(i.amount, i.currency ?? 'BRL'), 0)
  const overdueCount = invoices.filter(i => i.status === 'overdue').length
  const pendingTasks = tasks.filter(t => !t.done).length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#555' }}>
      Carregando...
    </div>
  )

  const clientForm = (
    <div style={{ background: '#141414', border: '1px solid #2e2e2e', borderRadius: 12, padding: 24, marginBottom: 24 }}>
      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 20, color: '#ccc' }}>
        {editingClient ? `Editando: ${editingClient.name}` : 'Novo cliente'}
      </p>
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
          <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 6 }}>VALOR *</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="number" placeholder="1500" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{ flex: 1 }} />
            <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} style={{ width: 80 }}>
              <option value="BRL">R$</option>
              <option value="USD">US$</option>
            </select>
          </div>
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
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button onClick={saveClient} disabled={saving} style={{ background: '#fff', color: '#000', padding: '10px 24px', fontWeight: 600, opacity: saving ? 0.5 : 1 }}>
          {saving ? 'Salvando...' : editingClient ? 'Salvar alterações' : 'Adicionar cliente'}
        </button>
        <button onClick={cancelForm} style={{ background: 'transparent', color: '#666', padding: '10px 16px', border: '1px solid #2e2e2e', borderRadius: 8 }}>
          Cancelar
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 220, background: '#0a0a0a', borderRight: '1px solid #1e1e1e', padding: '24px 0', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh' }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #1e1e1e' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>Triv Digital</p>
          <p style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Gestão de Faturas</p>
        </div>
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {([['invoices', '📄', 'Faturas'], ['clients', '👥', 'Clientes'], ['crm', '✅', 'Tasks']] as const).map(([key, icon, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '10px 12px', borderRadius: 8, marginBottom: 4,
              background: tab === key ? '#1e1e1e' : 'transparent',
              color: tab === key ? '#fff' : '#666',
              fontSize: 14, fontWeight: tab === key ? 500 : 400, textAlign: 'left',
            }}>
              <span>{icon}</span>{label}
              {key === 'crm' && pendingTasks > 0 && (
                <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>{pendingTasks}</span>
              )}
            </button>
          ))}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid #1e1e1e' }}>
          <p style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>Exibir em</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['BRL', 'USD'] as const).map(c => (
              <button key={c} onClick={() => setDisplayCurrency(c)} style={{
                flex: 1, padding: '5px 0', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: displayCurrency === c ? '#fff' : '#1e1e1e',
                color: displayCurrency === c ? '#000' : '#666',
                border: '1px solid #2e2e2e',
              }}>{c}</button>
            ))}
          </div>
          <p style={{ fontSize: 10, color: '#3e3e3e', marginTop: 8 }}>USD/BRL: {usdRate.toFixed(2)}</p>
          <p style={{ fontSize: 10, color: '#3e3e3e', marginTop: 4 }}>Cron: 8h BRT · D0,2,3,7</p>
        </div>
      </aside>

      <main style={{ marginLeft: 220, flex: 1, padding: '32px 36px', maxWidth: 1000 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'A receber (mês)', value: fmtDisplay(totalReceivable), color: '#f59e0b' },
            { label: 'Recebido (mês)', value: fmtDisplay(totalPaid), color: '#22c55e' },
            { label: 'Faturas vencidas', value: overdueCount.toString(), color: '#ef4444' },
            { label: 'Tasks pendentes', value: pendingTasks.toString(), color: '#3b82f6' },
          ].map(s => (
            <div key={s.label} style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 12, padding: '16px 20px' }}>
              <p style={{ fontSize: 11, color: '#555', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {tab === 'invoices' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>Faturas</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['all', 'pix', 'stripe'] as const).map(f => (
                  <button key={f} onClick={() => setFilterPayment(f)} style={{
                    padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                    background: filterPayment === f ? '#fff' : '#1e1e1e',
                    color: filterPayment === f ? '#000' : '#666',
                    border: '1px solid #2e2e2e',
                  }}>{f === 'all' ? 'Todos' : f.toUpperCase()}</button>
                ))}
              </div>
            </div>
            <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
              {sortedInvoices.length === 0 ? (
                <p style={{ padding: 32, color: '#555', textAlign: 'center' }}>Nenhuma fatura encontrada.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
                      {([['clientName', 'Cliente'], ['dueDate', 'Vencimento'], ['amount', 'Valor'], ['paymentMethod', 'Pagamento']] as [SortField, string][]).map(([field, label]) => (
                        <th key={field} onClick={() => handleSort(field)} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: '#555', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                          {label}{sortIcon(field)}
                        </th>
                      ))}
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: '#555', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: '#555', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedInvoices.map((inv, idx) => {
                      const client = clients.find(c => c.id === inv.clientId)
                      const isWeekly = client?.billingCycle === 'weekly'
                      const weekDates = isWeekly ? getWeekDates(inv.dueDate) : []
                      return (
                        <tr key={inv.id} style={{ borderBottom: idx < sortedInvoices.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                          <td style={{ padding: '14px 16px', fontWeight: 500 }}>{inv.clientName}</td>
                          <td style={{ padding: '14px 16px', color: inv.status === 'overdue' ? '#ef4444' : '#888' }}>
                            {fmtDate(inv.dueDate)}
                            {isWeekly && inv.status !== 'paid' && (
                              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                {weekDates.map(d => (
                                  <label key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={!!(inv.weeklyChecks?.[d])} onChange={e => toggleWeeklyCheck(inv.id, d, e.target.checked)} style={{ width: 14, height: 14, accentColor: '#22c55e' }} />
                                    <span style={{ fontSize: 9, color: '#555' }}>{d.slice(5).replace('-', '/')}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: 600 }}>{fmt(inv.amount, inv.currency ?? 'BRL')}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ background: inv.paymentMethod === 'pix' ? '#0a1628' : '#052e16', color: inv.paymentMethod === 'pix' ? '#3b82f6' : '#22c55e', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
                              {inv.paymentMethod === 'pix' ? 'PIX' : 'Stripe'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ background: STATUS_BG[inv.status], color: STATUS_COLOR[inv.status], padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
                              {STATUS_LABEL[inv.status]}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            {inv.status !== 'paid' && (
                              <button onClick={() => markPaid(inv.id)} style={{ background: '#052e16', color: '#22c55e', padding: '5px 12px', fontSize: 12, fontWeight: 500, border: '1px solid #14532d', borderRadius: 6 }}>
                                ✓ Pago
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {tab === 'clients' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>Clientes</h2>
              <button onClick={() => { setEditingClient(null); setForm({ ...emptyForm }); setShowForm(!showForm) }} style={{ background: '#fff', color: '#000', padding: '8px 18px', fontWeight: 600, fontSize: 13 }}>
                {showForm && !editingClient ? '✕ Cancelar' : '+ Novo cliente'}
              </button>
            </div>
            {showForm && clientForm}
            <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
              {clients.length === 0 ? (
                <p style={{ padding: 32, color: '#555', textAlign: 'center' }}>Nenhum cliente cadastrado.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
                      {['Nome', 'Serviço', 'MRR', 'Ciclo', 'Pagamento', 'Próx. vencimento', ''].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: '#555', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((c, idx) => (
                      <tr key={c.id} style={{ borderBottom: idx < clients.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 500 }}>{c.name}</td>
                        <td style={{ padding: '14px 16px', color: '#888' }}>{c.service || '—'}</td>
                        <td style={{ padding: '14px 16px', fontWeight: 600 }}>{fmt(c.amount, c.currency ?? 'BRL')}</td>
                        <td style={{ padding: '14px 16px', color: '#888' }}>{c.billingCycle === 'monthly' ? 'Mensal' : 'Semanal'}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ background: c.paymentMethod === 'pix' ? '#0a1628' : '#052e16', color: c.paymentMethod === 'pix' ? '#3b82f6' : '#22c55e', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
                            {c.paymentMethod === 'pix' ? 'PIX' : 'Stripe'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#888' }}>{fmtDate(c.nextDueDate)}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => { startEdit(c); setShowForm(true) }} style={{ background: 'transparent', color: '#3b82f6', padding: '5px 10px', fontSize: 12, border: '1px solid #0a1628', borderRadius: 6 }}>
                              Editar
                            </button>
                            <button onClick={() => deleteClient(c.id)} style={{ background: 'transparent', color: '#ef4444', padding: '5px 10px', fontSize: 12, border: '1px solid #2d0a0a', borderRadius: 6 }}>
                              Remover
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {tab === 'crm' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>Tasks por cliente</h2>
            </div>
            {clients.length === 0 && <p style={{ color: '#555' }}>Nenhum cliente. Cadastre um na aba Clientes.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {clients.map(client => {
                const clientTasks = tasks.filter(t => t.clientId === client.id)
                const pending = clientTasks.filter(t => !t.done)
                const done = clientTasks.filter(t => t.done)
                const isOpen = expandedClient === client.id
                const nt = newTaskMap[client.id] ?? { title: '', dueDate: '', recurrence: 'none' }

                return (
                  <div key={client.id} style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
                    <div onClick={() => setExpandedClient(isOpen ? null : client.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#888' }}>
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 14 }}>{client.name}</p>
                          <p style={{ fontSize: 12, color: '#555', marginTop: 1 }}>{client.service || 'Marketing'} · {fmt(client.amount, client.currency ?? 'BRL')}/mês</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {pending.length > 0 && (
                          <span style={{ background: '#2d1a00', color: '#f59e0b', borderRadius: 10, fontSize: 11, padding: '2px 8px', fontWeight: 600 }}>
                            {pending.length} pendente{pending.length > 1 ? 's' : ''}
                          </span>
                        )}
                        <span style={{ color: '#555', fontSize: 16 }}>{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{ borderTop: '1px solid #1e1e1e', padding: '16px 20px' }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                          <input placeholder="Nova task..." value={nt.title} onChange={e => setNewTaskMap(m => ({ ...m, [client.id]: { ...nt, title: e.target.value } }))} onKeyDown={e => e.key === 'Enter' && addTask(client.id)} style={{ flex: 1 }} />
                          <input type="date" value={nt.dueDate} onChange={e => setNewTaskMap(m => ({ ...m, [client.id]: { ...nt, dueDate: e.target.value } }))} style={{ width: 140 }} />
                          <select value={nt.recurrence} onChange={e => setNewTaskMap(m => ({ ...m, [client.id]: { ...nt, recurrence: e.target.value } }))} style={{ width: 120 }}>
                            <option value="none">Sem recorrência</option>
                            <option value="weekly">Semanal</option>
                            <option value="monthly">Mensal</option>
                          </select>
                          <button onClick={() => addTask(client.id)} style={{ background: '#fff', color: '#000', padding: '8px 16px', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>+ Adicionar</button>
                        </div>

                        {pending.length === 0 && done.length === 0 && (
                          <p style={{ color: '#555', fontSize: 13 }}>Nenhuma task. Adicione acima.</p>
                        )}
                        {pending.map(task => (
                          <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
                            <input type="checkbox" checked={false} onChange={() => toggleTask(task.id)} style={{ width: 16, height: 16, accentColor: '#22c55e', cursor: 'pointer' }} />
                            <span style={{ flex: 1, fontSize: 13 }}>{task.title}</span>
                            {task.dueDate && (
                              <span style={{ fontSize: 11, color: new Date(task.dueDate + 'T12:00:00') < today ? '#ef4444' : '#888', background: '#1a1a1a', padding: '2px 8px', borderRadius: 4 }}>
                                {fmtDate(task.dueDate)}
                              </span>
                            )}
                            {task.recurrence !== 'none' && (
                              <span style={{ fontSize: 10, color: '#3b82f6', background: '#0a1628', padding: '2px 6px', borderRadius: 4 }}>
                                {task.recurrence === 'weekly' ? '↻ semanal' : '↻ mensal'}
                              </span>
                            )}
                            <button onClick={() => deleteTask(task.id)} style={{ background: 'transparent', color: '#555', border: 'none', fontSize: 16, padding: '0 4px', lineHeight: 1 }}>×</button>
                          </div>
                        ))}

                        {done.length > 0 && (
                          <div style={{ marginTop: 12 }}>
                            <p style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>CONCLUÍDAS ({done.length})</p>
                            {done.slice(0, 3).map(task => (
                              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', opacity: 0.4 }}>
                                <input type="checkbox" checked={true} onChange={() => toggleTask(task.id)} style={{ width: 16, height: 16, accentColor: '#22c55e', cursor: 'pointer' }} />
                                <span style={{ flex: 1, fontSize: 13, textDecoration: 'line-through' }}>{task.title}</span>
                                <button onClick={() => deleteTask(task.id)} style={{ background: 'transparent', color: '#555', border: 'none', fontSize: 16, padding: '0 4px' }}>×</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
