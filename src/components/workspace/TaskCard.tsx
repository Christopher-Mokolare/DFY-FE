import type { HTMLAttributes, ReactNode } from 'react'
import WorkspaceCard from './WorkspaceCard'

type TaskCardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode
  as?: 'div' | 'article' | 'section'
}

export default function TaskCard({ children, as = 'div', ...attributes }: TaskCardProps) {
  return (
    <WorkspaceCard as={as} {...attributes}>
      {children}
    </WorkspaceCard>
  )
}
