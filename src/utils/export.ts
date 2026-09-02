export async function exportAllCSV<T>(filename: string, headers: string[], fetchAll: () => Promise<T[]>, mapRow: (item: T) => (string | number)[]) {
  const items = await fetchAll()
  exportCSV(filename, headers, items.map(mapRow))
}

export async function exportAllPDF<T>(title: string, headers: string[], fetchAll: () => Promise<T[]>, mapRow: (item: T) => (string | number)[]) {
  const items = await fetchAll()
  exportPDF(title, headers, items.map(mapRow))
}

export function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? '').replace(/"/g, '""')
    return /[",\n]/.test(s) ? `"${s}"` : s
  }
  const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportPDF(title: string, headers: string[], rows: (string | number)[][]) {
  const tableRows = rows.map(r =>
    `<tr>${r.map(c => `<td>${String(c ?? '').replace(/</g, '&lt;')}</td>`).join('')}</tr>`
  ).join('')

  const html = `<!DOCTYPE html><html><head><title>${title}</title><style>
    body{font-family:Arial,sans-serif;font-size:12px;margin:20px}
    h2{color:#FF8A00;margin-bottom:4px}
    .meta{color:#6B7280;font-size:11px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse}
    th{background:#FF8A00;color:#fff;padding:8px 6px;text-align:left;font-size:11px}
    td{padding:6px;border-bottom:1px solid #E5E7EB;font-size:11px}
    tr:nth-child(even) td{background:#F9FAFB}
    @media print{body{margin:0}}
  </style></head><body>
    <h2>${title}</h2>
    <div class="meta">Generated: ${new Date().toLocaleString('en-ZA')} · DoForYou Admin</div>
    <table>
      <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  </body></html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 500)
}
