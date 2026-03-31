import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function usePostErrand() {
  const { isAuthenticated, isProfileIncomplete } = useAuth()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)

  const handlePostErrand = (e?: React.MouseEvent) => {
    e?.preventDefault()
    if (!isAuthenticated()) { navigate('/login'); return }
    if (isProfileIncomplete()) { setShowModal(true); return }
    navigate('/tasks/post')
  }

  const ProfileIncompleteModal = showModal ? (
    <div className="modal-overlay" onClick={() => setShowModal(false)}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3><i className="fas fa-user-circle" /> Complete Your Profile</h3>
          <button className="btn-close" onClick={() => setShowModal(false)}><i className="fas fa-times" /></button>
        </div>
        <div className="modal-body">
          <p>You need to complete your profile before posting a task.</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Please make sure your ID number, address, and user type are filled in.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { setShowModal(false); navigate('/user/profile') }}>
            <i className="fas fa-user-edit" /> Complete Profile
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { handlePostErrand, ProfileIncompleteModal }
}
