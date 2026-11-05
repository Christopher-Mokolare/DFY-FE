import type { HTMLAttributes, ReactNode } from 'react'

type WorkspaceCardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode
  as?: 'div' | 'article' | 'section'
}

export default function WorkspaceCard({
  children,
  as = 'section',
  className = '',
  ...attributes
}: WorkspaceCardProps) {
  const Element = as

  return (
    <Element {...attributes} className={`workspace-card ${className}`.trim()}>
      {children}
    </Element>
  )
}
