import React from 'react'
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function Chart ({ data = [], color = '#34D399' }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <XAxis dataKey="name" hide />
        <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
