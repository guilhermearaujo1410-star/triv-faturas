import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'
import { getTasks, saveTasks } from '@/lib/data'
import { Task } from '@/lib/types'

export async function GET() {
  const tasks = await getTasks()
  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const tasks = await getTasks()

  const newTask: Task = {
    id: uuid(),
    clientId: body.clientId,
    title: body.title,
    dueDate: body.dueDate || undefined,
    done: false,
    recurrence: body.recurrence ?? 'none',
    createdAt: new Date().toISOString(),
  }

  tasks.push(newTask)
  await saveTasks(tasks)
  return NextResponse.json(newTask, { status: 201 })
}
