import { Link } from 'react-router-dom'
import { usePostErrand } from '../../hooks/usePostErrand'
import './Footer.css'

export default function Footer() {
  const { handlePostErrand, ProfileIncompleteModal } = usePostErrand()
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer" aria-label="DoForYou site footer">
      <div className="container footer-cta"><div className="footer-cta-copy"><span className="footer-eyebrow">YOUR NEXT STEP STARTS HERE</span><h2>Got a task in mind?</h2><p>Get the help you need, or find a task that puts your time and skills to work.</p></div><div className="footer-cta-actions"><button type="button" className="btn footer-cta-primary" onClick={handlePostErrand}>Post a task <span aria-hidden="true">↗</span></button><Link to="/tasks/browse" className="btn footer-cta-secondary">Explore tasks <span aria-hidden="true">→</span></Link></div></div>
      <div className="container footer-inner">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <img src="/DFY.png" alt="DoForYou logo" className="footer-logo-image" loading="lazy" />
            <span className="brand-text">DoForYou</span><span className="dot"><b>.</b></span>
          </Link>
          <p>A South African task marketplace for getting everyday jobs done and creating local earning opportunities.</p>
          <div className="social-links">
            <a href="https://x.com/JoinDoForYou" target="_blank" rel="noreferrer" aria-label="X"><i className="fab fa-twitter" /></a>
            <a href="https://web.facebook.com/joinDoForYou/" target="_blank" rel="noreferrer" aria-label="Facebook"><i className="fab fa-facebook-f" /></a>
            <a href="https://www.instagram.com/joindoforyou/" target="_blank" rel="noreferrer" aria-label="Instagram"><i className="fab fa-instagram" /></a>
            <a href="https://www.linkedin.com/company/do-for-you/" target="_blank" rel="noreferrer" aria-label="LinkedIn"><i className="fab fa-linkedin" /></a>
            <a href="https://www.tiktok.com/@doforyoufreelance" target="_blank" rel="noreferrer" aria-label="TikTok"><i className="fab fa-tiktok" /></a>
          </div>
        </div>
        <div className="footer-links">
          <div><h3>Get started</h3><ul>
            <li><Link to="/tasks/browse"><i className="fas fa-search footer-link-icon" />Browse tasks</Link></li>
            <li><Link to="/for-creators"><i className="fas fa-plus-circle footer-link-icon" />Post a task</Link></li>
            <li><Link to="/for-runners"><i className="fas fa-running footer-link-icon" />Become a runner</Link></li>
            <li><Link to="/how-it-works"><i className="fas fa-route footer-link-icon" />How it works</Link></li>
            <li><a href="https://github.com/DoForYou-ZA/dfy-mobile/releases/download/mobile-staging-latest/dfy-mobile.apk" aria-label="Download the DoForYou Android staging app APK"><i className="fas fa-mobile-alt footer-link-icon" />Download the Android app <span aria-hidden="true">↓</span></a></li>
          </ul></div>
          <div><h3>Learn & support</h3><ul>
            <li><Link to="/faq"><i className="fas fa-question-circle footer-link-icon" />FAQs</Link></li>
            <li><Link to="/payments-and-completion"><i className="fas fa-credit-card footer-link-icon" />Payments & completion</Link></li>
            <li><Link to="/about"><i className="fas fa-info-circle footer-link-icon" />About DoForYou</Link></li>
            <li><Link to="/contact"><i className="fas fa-headset footer-link-icon" />Contact support</Link></li>
          </ul></div>
          <div><h3>Policies & contact</h3><ul>
            <li><Link to="/terms"><i className="fas fa-file-alt footer-link-icon" />Terms of service</Link></li>
            <li><Link to="/privacy"><i className="fas fa-shield-alt footer-link-icon" />Privacy & cookies</Link></li>
            <li><a href="https://wa.me/27795258611" target="_blank" rel="noreferrer"><i className="fab fa-whatsapp footer-link-icon" />+27 79 525 8611</a></li>
            <li><a href="mailto:info@doforyou.co.za"><i className="fas fa-envelope footer-link-icon" />info@doforyou.co.za</a></li>
          </ul></div>
        </div>
      </div>
      <div className="footer-bottom"><div className="container footer-bottom-inner">
        <span>&copy; {year} DoForYou. All rights reserved.</span>
        <span>Made with ♥ in South Africa</span>
      </div></div>
      {ProfileIncompleteModal}
    </footer>
  )
}
