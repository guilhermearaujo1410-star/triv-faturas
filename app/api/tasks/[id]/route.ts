import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'
import { getTasks, saveTasks } from '@/lib/data'
import { addDays, addMonths, format } from 'date-fns'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const tasks = await getTasks()
  const idx = tasks.findIndex((t) => t.id === params.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  tasks[idx].done = !tasks[idx].done

  // If recurrent and just marked done, create next occurrence
  if (tasks[idx].done && tasks[idx].recurrence !== 'none' && tasks[idx].dueDate) {
    const current = new Date(tasks[idx].dueDate! + 'T12:00:00')
    const next = tasks[idx].recurrence === 'weekly'
      ? addDays(current, 7)
      : addMonths(current, 1)
    tasks.push({
      id: uuid(),
      clientId: tasks[idx].clientId,
      title: tasks[idx].title,
      dueDate: format(next, 'yyyy-MM-dd'),
      done: false,
      recurrence: tasks[idx].recurrence,
      createdAt: new Date().toISOString(),
    })
  }

  await saveTasks(tasks)
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const tasks = await getTasks()
  await saveTasks(tasks.filter((t) => t.id !== params.id))
  return NextResponse.json({ ok: true })
}
