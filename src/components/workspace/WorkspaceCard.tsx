import type { ReactNode } from 'react'
import './WorkspaceCard.css'

interface WorkspaceCardProps {
  children: ReactNode
  header?: ReactNode
  footer?: ReactNode
  className?: string
  id?: string
}

export default function WorkspaceCard({ children, header, footer, className = '', id }: WorkspaceCardProps) {
  return (
    <section id={id} className={`workspace-card ${className}`.trim()}>
      {header && <div className="workspace-card__header">{header}</div>}
      <div className="workspace-card__body">{children}</div>
      {footer && <div className="workspace-card__footer">{footer}</div>}
    </section>
  )
}
