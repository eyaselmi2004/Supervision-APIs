import React, { useEffect, useState } from 'react'
import { Plus, Radio } from 'lucide-react'
import { Layout }  from '../components/layout/Layout'
import { Header }  from '../components/layout/Header'
import { Button }  from '../components/ui/Button'
import { Modal }   from '../components/ui/Modal'
import { Select }  from '../components/ui/Input'
import { slaService }         from '../services/incidents.service'
import { apiServicesService } from '../services/apiServices.service'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const SlaPage: React.FC = () => {
  const [reports,       setReports]       = useState<any[]>([])
  const [endpoints,     setEndpoints]     = useState<any[]>([])
  const [loading,       setLoading]       = useState(false)
  const [showModal,     setShowModal]     = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [form, setForm] = useState({ endpoint_id: '', period: '24h' })

  useEffect(() => {
    const init = async () => {
      try {
        const svcs = await apiServicesService.getAll()
        const allEps: any[] = []
        for (const svc of svcs) {
          const eps = await apiServicesService.getEndpoints(svc.id)
          allEps.push(...eps)
        }
        setEndpoints(allEps)
        if (allEps.length > 0) {
          setForm(f => ({ ...f, endpoint_id: allEps[0].id }))
          await loadReports(allEps[0].id)
        }
      } catch (e) {
        console.error('Erreur chargement endpoints:', e)
      }
    }
    init()
  }, [])

  const loadReports = async (endpointId: string) => {
    if (!endpointId) return
    setLoading(true)
    try {
      const r = await slaService.getByEndpoint(endpointId)
      setReports(r)
    } catch {
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  const handleEndpointChange = async (id: string) => {
    setForm(f => ({ ...f, endpoint_id: id }))
    await loadReports(id)
  }

  const handleGenerate = async () => {
    if (!form.endpoint_id) return
    setActionLoading(true)
    try {
      const now   = new Date()
      const start = new Date(now)
      const h: Record<string, number> = {
        '1h': 1, '6h': 6, '24h': 24, '7d': 168, '30d': 720
      }
      start.setHours(start.getHours() - (h[form.period] ?? 24))
      const fmt = (d: Date) => d.toISOString().replace(/\.\d+Z$/, 'Z')
      await slaService.compute({
        endpoint_id:  form.endpoint_id,
        period_start: fmt(start),
        period_end:   fmt(now),
      })
      setShowModal(false)
      await loadReports(form.endpoint_id)
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Erreur lors de la génération'
      alert(msg)
    } finally {
      setActionLoading(false)
    }
  }

  const availabilityColor = (pct: number) => {
    if (pct >= 99) return '#10b981'
    if (pct >= 95) return '#f59e0b'
    return '#ef4444'
  }

  const exportPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4')
    doc.setFontSize(20)
    doc.setTextColor(30, 58, 95)
    doc.text('Rapport SLA — Plateforme de Supervision', 14, 20)
    doc.setFontSize(12)
    doc.setTextColor(100, 100, 100)
    const selectedEndpoint = endpoints.find(ep => ep.id === form.endpoint_id)
    const endpointLabel = selectedEndpoint
      ? `${selectedEndpoint.method} ${selectedEndpoint.path}`
      : 'Endpoint inconnu'
    doc.text(`Endpoint : ${endpointLabel}`, 14, 30)
    doc.text(`Généré le : ${new Date().toLocaleString('fr-FR')}`, 14, 38)
    autoTable(doc, {
      startY: 48,
      head: [['Période analysée', 'Disponibilité (%)', "Taux d'erreur (%)", 'Latence moy. (ms)', 'Généré le']],
      body: reports.map(report => [
        `${new Date(report.period_start).toLocaleDateString('fr-FR')} → ${new Date(report.period_end).toLocaleDateString('fr-FR')}`,
        report.availability_percent.toFixed(2),
        report.error_rate_percent.toFixed(2),
        report.avg_latency_ms.toFixed(0),
        new Date(report.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      ]),
      headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 11 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      bodyStyles: { fontSize: 10, textColor: [30, 30, 30] },
      didParseCell: (data) => {
        if (data.column.index === 1 && data.section === 'body') {
          const val = parseFloat(data.cell.text[0])
          if (val >= 99)      data.cell.styles.textColor = [16, 185, 129]
          else if (val >= 95) data.cell.styles.textColor = [245, 158, 11]
          else                data.cell.styles.textColor = [239, 68, 68]
        }
        if (data.column.index === 2 && data.section === 'body') {
          if (parseFloat(data.cell.text[0]) > 5) data.cell.styles.textColor = [239, 68, 68]
        }
        if (data.column.index === 3 && data.section === 'body') {
          if (parseFloat(data.cell.text[0]) > 500) data.cell.styles.textColor = [245, 158, 11]
        }
      },
      margin: { left: 14, right: 14 },
    })
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(9)
      doc.setTextColor(150, 150, 150)
      doc.text(`Page ${i} / ${pageCount} — Plateforme de Supervision d'APIs`, 14, doc.internal.pageSize.getHeight() - 10)
    }
    const fileName = `sla_rapport_${endpointLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
  }

  const thStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 600,
    color: 'var(--text-subtle)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  }

  const selectStyle: React.CSSProperties = {
    padding: '8px 12px',
    background: 'var(--input-bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer',
    fontFamily: 'Sora, sans-serif',
  }

  return (
    <Layout>
      <Header
        title="SLA"
        subtitle="Rapports de disponibilité et de performance"
        actions={
          <div style={{ display: 'flex', gap: '12px' }}>
            {reports.length > 0 && (
              <Button variant="secondary" onClick={exportPDF}>
                Exporter PDF
              </Button>
            )}
            <Button icon={Plus} onClick={() => setShowModal(true)}>
              Générer un rapport
            </Button>
          </div>
        }
      />

      <div style={{ padding: '24px 32px' }}>

        {/* Sélecteur endpoint */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          marginBottom: '24px', padding: '16px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Endpoint :
          </span>
          <select
            value={form.endpoint_id}
            onChange={e => handleEndpointChange(e.target.value)}
            style={selectStyle}
          >
            {endpoints.map(ep => (
              <option key={ep.id} value={ep.id}>
                {ep.method} {ep.path}
              </option>
            ))}
          </select>
        </div>

        {/* Tableau des rapports */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px', overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 160px 160px 150px 160px',
            padding: '12px 20px',
            borderBottom: '1px solid var(--border)',
          }}>
            {['Période analysée', 'Disponibilité', "Taux d'erreur", 'Latence moy.', 'Généré le'].map(h => (
              <span key={h} style={thStyle}>{h}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '20px' }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton"
                  style={{ height: '52px', marginBottom: '8px', borderRadius: '6px' }} />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div style={{ padding: '56px', textAlign: 'center' }}>
              <Radio size={32} color="var(--text-subtle)" style={{ marginBottom: '12px' }} />
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-subtle)' }}>
                Aucun rapport SLA pour cet endpoint
              </p>
              <Button icon={Plus} size="sm" onClick={() => setShowModal(true)}>
                Générer le premier rapport
              </Button>
            </div>
          ) : (
            reports.map(report => (
              <div key={report.id} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 160px 160px 150px 160px',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                alignItems: 'center',
              }}>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-primary)' }}>
                  {new Date(report.period_start).toLocaleDateString('fr-FR')}
                  {' → '}
                  {new Date(report.period_end).toLocaleDateString('fr-FR')}
                </p>
                <div>
                  <p style={{
                    margin: '0 0 4px', fontSize: '18px', fontWeight: 700,
                    fontFamily: 'monospace',
                    color: availabilityColor(report.availability_percent),
                  }}>
                    {report.availability_percent.toFixed(2)}%
                  </p>
                  <div style={{
                    height: '4px', borderRadius: '2px',
                    background: 'var(--border)', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(report.availability_percent, 100)}%`,
                      background: availabilityColor(report.availability_percent),
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
                <span style={{
                  fontSize: '14px', fontWeight: 600, fontFamily: 'monospace',
                  color: report.error_rate_percent > 5 ? '#f87171' : 'var(--text-muted)',
                }}>
                  {report.error_rate_percent.toFixed(2)}%
                </span>
                <span style={{
                  fontSize: '14px', fontWeight: 600, fontFamily: 'monospace',
                  color: report.avg_latency_ms > 500 ? '#f59e0b' : 'var(--text-muted)',
                }}>
                  {report.avg_latency_ms.toFixed(0)} ms
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>
                  {new Date(report.created_at).toLocaleString('fr-FR', {
                    day: '2-digit', month: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Générer un rapport SLA">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Select
            label="Endpoint"
            value={form.endpoint_id}
            onChange={e => setForm(f => ({ ...f, endpoint_id: e.target.value }))}
            options={endpoints.map(ep => ({ value: ep.id, label: `${ep.method} ${ep.path}` }))}
          />
          <Select
            label="Période d'analyse"
            value={form.period}
            onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
            options={[
              { value: '1h',  label: 'Dernière heure'      },
              { value: '6h',  label: '6 dernières heures'  },
              { value: '24h', label: '24 dernières heures' },
              { value: '7d',  label: '7 derniers jours'    },
              { value: '30d', label: '30 derniers jours'   },
            ]}
          />
          <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
            <Button variant="secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>
              Annuler
            </Button>
            <Button onClick={handleGenerate} loading={actionLoading} disabled={!form.endpoint_id} style={{ flex: 1 }}>
              Générer
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}