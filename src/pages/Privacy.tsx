import { Link } from 'react-router-dom'
import { usePageMetadata } from '../hooks/usePageMetadata'
import './LegacyMarketingPages.css'

const sections = [
  {
    number: '01',
    icon: '◎',
    title: 'Who We Are',
    body: 'DoForYou is a South African task marketplace that connects task creators with local runners. We are the responsible party (operator) for personal information collected through the platform, as defined under the Protection of Personal Information Act 4 of 2013 (POPIA). Contact us at info@doforyou.co.za for any privacy-related queries.',
  },
  {
    number: '02',
    icon: '↓',
    title: 'Information We Collect',
    body: 'We collect information you provide directly: your name, email address, phone number, South African ID number, date of birth, physical address, profile photo, and bank account details (for runners receiving payouts). We also collect task content, messages exchanged on the platform, and usage data such as login timestamps and device information.',
  },
  {
    number: '03',
    icon: '✓',
    title: 'Why We Collect Your Information',
    body: 'Your personal information is used to create and manage your account, verify your identity in line with South African legal requirements, process payments and runner payouts via Paystack, match task creators with runners, send platform notifications and support communications, and comply with applicable law including POPIA and financial regulations.',
  },
  {
    number: '04',
    icon: '⌑',
    title: 'Legal Basis for Processing',
    body: 'DoForYou processes your personal information on the following grounds: performance of a contract (to provide the platform service you signed up for), compliance with a legal obligation (identity verification, financial record-keeping), and legitimate interest (platform security, fraud prevention, and service improvement). Where required, we will request your consent separately.',
  },
  {
    number: '05',
    icon: '↗',
    title: 'How We Share Your Information',
    body: 'We share your information only as necessary: with Paystack to process payments and verify bank accounts, with runners or creators as required to complete a task (e.g. contact details after a task is accepted), with law enforcement or regulators when legally required, and with service providers who operate under confidentiality obligations. We do not sell your personal information.',
  },
  {
    number: '06',
    icon: '⌕',
    title: 'Data Retention',
    body: 'We retain your account information for as long as your account is active and for a reasonable period thereafter to comply with legal obligations, resolve disputes, and enforce our agreements. Task records and payment history are retained for a minimum of five years in line with South African financial record-keeping requirements. You may request deletion of your account by contacting info@doforyou.co.za.',
  },
  {
    number: '07',
    icon: '✕',
    title: 'Your Rights Under POPIA',
    body: 'You have the right to access the personal information we hold about you, request correction of inaccurate information, request deletion of your information (subject to legal retention obligations), object to processing in certain circumstances, and lodge a complaint with the Information Regulator of South Africa at inforeg.org.za. To exercise any of these rights, contact info@doforyou.co.za.',
  },
  {
    number: '08',
    icon: '⚙',
    title: 'Cookies & Tracking',
    body: 'DoForYou uses essential cookies to keep you signed in and maintain your session. We do not use third-party advertising cookies or sell browsing data. Analytics data, if collected, is used solely to improve platform performance and is not linked to your identity. You can disable cookies in your browser settings, but doing so may prevent the platform from functioning correctly.',
  },
  {
    number: '09',
    icon: '⚑',
    title: 'Security',
    body: 'We apply industry-standard security measures including encrypted data transmission (HTTPS), hashed password storage, and access controls. No system is completely secure. If you believe your account has been compromised, contact us immediately at info@doforyou.co.za and change your password. Never share your password or one-time codes with anyone, including DoForYou support.',
  },
  {
    number: '10',
    icon: '?',
    title: 'Changes to This Policy',
    body: 'We may update this policy from time to time. Material changes will be communicated via the platform or by email. Continued use of DoForYou after a policy update constitutes acceptance of the revised terms. The date at the bottom of this page reflects the last review.',
  },
]

export default function Privacy() {
  usePageMetadata(
    'Privacy & Cookies | DoForYou',
    'Read the DoForYou privacy and cookie policy covering how we collect, use, and protect your personal information in line with POPIA and South African law.',
  )
  return (
    <div className="marketing-page premium-marketing-page legacy-marketing-page terms-page">
      <header className="premium-page-hero">
        <div className="container premium-hero-grid">
          <div className="premium-hero-copy">
            <span className="marketing-kicker">PRIVACY & COOKIES</span>
            <h1>Your data. <em>Your rights.</em></h1>
            <p>DoForYou is committed to handling your personal information responsibly and transparently, in line with the Protection of Personal Information Act (POPIA) and applicable South African law.</p>
            <div className="premium-trust-line">
              <span><i aria-hidden="true">✓</i> POPIA compliant</span>
              <span><i aria-hidden="true">✓</i> No data selling</span>
              <span><i aria-hidden="true">✓</i> South African law</span>
            </div>
          </div>
        </div>
      </header>

      <section className="premium-section">
        <div className="container">
          <div className="premium-section-heading">
            <span className="marketing-kicker">WHAT YOU NEED TO KNOW</span>
            <h2>How we handle your information.</h2>
            <p>This policy explains what personal information DoForYou collects, why we collect it, how we use it, and what rights you have as a user.</p>
          </div>
          <div className="legacy-card-grid terms-grid">
            {sections.map(s => (
              <article key={s.number} className="legacy-info-card">
                <span className="legacy-info-icon" aria-hidden="true">{s.icon}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="legacy-split-section">
        <div className="container">
          <div className="terms-footer-note">
            <span className="marketing-kicker">QUESTIONS OR CONCERNS?</span>
            <h2>We're here to help.</h2>
            <p>For privacy queries, data access requests, or to lodge a complaint, <Link to="/contact">contact DoForYou support</Link> or email <a href="mailto:info@doforyou.co.za">info@doforyou.co.za</a> directly. You may also contact the <a href="https://inforeg.org.za" target="_blank" rel="noreferrer">Information Regulator of South Africa</a>.</p>
            <p className="terms-last-updated">Last reviewed: {new Date().toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}. This policy applies to all users of the DoForYou platform.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
