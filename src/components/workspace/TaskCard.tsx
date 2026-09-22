import type { ReactNode } from 'react'
import WorkspaceCard from './WorkspaceCard'
import './TaskCard.css'

type TaskCardVariant = 'browse' | 'posted' | 'active' | 'completed' | 'action-required'

interface TaskCardProps {
  variant: TaskCardVariant
  status?: ReactNode
  amount?: ReactNode
  title: ReactNode
  description?: ReactNode
  meta?: ReactNode
  extra?: ReactNode
  actions?: ReactNode
  className?: string
  id?: string
}

export default function TaskCard({ variant, status, amount, title, description, meta, extra, actions, className = '', id }: TaskCardProps) {
  return (
    <WorkspaceCard
      id={id}
      className={`task-card task-card--${variant} ${className}`.trim()}
      header={
        <>
          <div className="task-card__status">{status}</div>
          {amount != null && <div className="task-card__amount">{amount}</div>}
        </>
      }
      footer={actions ? <div className="task-card__actions">{actions}</div> : undefined}
    >
      <h3 className="task-card__title">{title}</h3>
      <div className="task-card__description">{description || <span aria-hidden="true">&nbsp;</span>}</div>
      {meta && <div className="task-card__meta">{meta}</div>}
      {extra && <div className="task-card__extra">{extra}</div>}
    </WorkspaceCard>
  )
}
