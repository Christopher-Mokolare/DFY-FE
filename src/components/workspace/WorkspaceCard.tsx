import type { ReactNode } from 'react'

type WorkspaceCardProps = {
  children: ReactNode
  as?: 'div' | 'article' | 'section'
  className?: string
  id?: string
}

export default function WorkspaceCard({ children, as = 'section', className = '', id }: WorkspaceCardProps) {
  const Element = as
  return (
    <Element id={id} className={`workspace-card ${className}`.trim()}>
      {children}
    </Element>
  )
}
