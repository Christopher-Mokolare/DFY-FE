import { useNavigate, useLocation } from 'react-router-dom'

const NO_BACK = ['/', '/login', '/register', '/about', '/contact', '/terms']
const CHAT_PATTERN = /^\/tasks\/.+\/chat$/

export default function BackButton() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  if (NO_BACK.includes(pathname) || CHAT_PATTERN.test(pathname)) return null

  return (
    <button className="dfy-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
      <span className="dfy-back-arrow">
        <i className="fas fa-arrow-left" />
      </span>
      <span className="dfy-back-label">Back</span>
    </button>
  )
}
