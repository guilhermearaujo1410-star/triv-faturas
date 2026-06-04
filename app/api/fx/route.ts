import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL')
    const data = await res.json()
    const rate = parseFloat(data.USDBRL.bid)
    return NextResponse.json({ rate })
  } catch {
    return NextResponse.json({ rate: 5.70 })
  }
}
