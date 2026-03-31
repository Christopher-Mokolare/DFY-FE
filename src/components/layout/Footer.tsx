import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Footer.css'

export default function Footer() {
  const { canPostErrands, isProfileIncomplete } = useAuth()
  const year = new Date().getFullYear()

  const handlePostErrand = (e: React.MouseEvent) => {
    if (!canPostErrands() || isProfileIncomplete()) {
      e.preventDefault()
      window.location.href = '/user/profile'
    }
  }

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <img src="/DFY.png" alt="DoForYou" style={{ height: 28, width: 'auto', marginRight: '0.375rem' }} />
            <span className="brand-text">DoForYou</span>
            <span className="dot"><b>.</b></span>
          </Link>
          <p>Connecting South Africans through meaningful tasks and opportunities</p>
          <div className="social-links">
            <a href="https://x.com/JoinDoForYou" target="_blank" rel="noreferrer" aria-label="Twitter"><i className="fab fa-twitter" /></a>
            <a href="https://web.facebook.com/joinDoForYou/" target="_blank" rel="noreferrer" aria-label="Facebook"><i className="fab fa-facebook-f" /></a>
            <a href="https://www.instagram.com/joindoforyou/" target="_blank" rel="noreferrer" aria-label="Instagram"><i className="fab fa-instagram" /></a>
            <a href="https://www.linkedin.com/company/do-for-you/" target="_blank" rel="noreferrer" aria-label="LinkedIn"><i className="fab fa-linkedin" /></a>
            <a href="https://www.tiktok.com/@doforyoufreelance" target="_blank" rel="noreferrer" aria-label="TikTok"><i className="fab fa-tiktok" /></a>
          </div>
        </div>

        <div className="footer-links">
          <div>
            <h3>Quick Links</h3>
            <ul>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              <li><Link to="/tasks/browse">Browse Errands</Link></li>
              {canPostErrands() && <li><Link to="/tasks/post" onClick={handlePostErrand}>Post An Errand</Link></li>}
            </ul>
          </div>
          <div>
            <h3>Legal</h3>
            <ul>
              <li><a href="#">Privacy Policy</a></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><a href="#">Cookie Policy</a></li>
            </ul>
          </div>
          <div>
            <h3>Support</h3>
            <div className="contact-info">
              <a href="https://wa.me/27795258611" target="_blank" rel="noreferrer">
                <i className="fab fa-whatsapp" /> +27 79 525 8611
              </a>
              <a href="mailto:info@doforyou.co.za">
                <i className="fas fa-envelope" /> info@doforyou.co.za
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <span>&copy; {year} DoForYou<span className="dot">.</span> All rights reserved.</span>
          <span>Made with <i className="fas fa-heart" style={{ color: 'var(--primary)' }} /> in South Africa</span>
        </div>
      </div>
    </footer>
  )
}
