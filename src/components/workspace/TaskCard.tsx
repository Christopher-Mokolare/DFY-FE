import type { ReactNode } from 'react'
import WorkspaceCard from './WorkspaceCard'

type TaskCardProps = {
  children: ReactNode
  as?: 'div' | 'article' | 'section'
  className?: string
  id?: string
}

export default function TaskCard({ children, as = 'div', className, id }: TaskCardProps) {
  return (
    <WorkspaceCard as={as} id={id} className={className}>
      {children}
    </WorkspaceCard>
  )
}
