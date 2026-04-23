/**
 * Modal.tsx — Fenêtre modale générique
 * Fermeture par Escape ou clic sur l'overlay
 */
import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open:     boolean
  onClose:  () => void
  title:    string
  children: React.ReactNode
  size?:    'sm' | 'md' | 'lg'
}

const WIDTHS = { sm: '400px', md: '480px', lg: '560px' }

export const Modal: React.FC<ModalProps> = ({
  open, onClose, title, children, size = 'md'
}) => {
  // Fermeture avec la touche Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    // Overlay sombre
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(10, 14, 26, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/* Panneau — stopPropagation pour ne pas fermer en cliquant dedans */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: WIDTHS[size],
          background: 'rgba(26, 33, 64, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px rgba(10, 14, 26, 0.65)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-subtle)', padding: '4px', borderRadius: '6px',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Contenu */}
        <div style={{ padding: '20px' }}>{children}</div>
      </div>
    </div>
  )
}