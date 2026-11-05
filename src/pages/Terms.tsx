import { Link } from 'react-router-dom'
import { usePageMetadata } from '../hooks/usePageMetadata'
import './LegacyMarketingPages.css'

const sections = [
  {
    number: '01',
    icon: '✓',
    title: 'Acceptance of Terms',
    body: 'By accessing or using DoForYou, you confirm that you have read, understood, and agree to be bound by these terms. If you do not agree, you may not use the platform.',
  },
  {
    number: '02',
    icon: '◎',
    title: 'User Responsibilities',
    body: 'All users are responsible for providing accurate information, agreeing on task requirements before work begins, completing tasks as agreed, and treating every other user with honesty and respect.',
  },
  {
    number: '03',
    icon: '↗',
    title: 'Payments, Fees & Transaction Status',
    body: 'Review the task amount, applicable platform fee, and transaction details before proceeding. Payment processing and runner payouts can remain pending or fail for reasons outside DoForYou\'s control. A task completion confirmation does not by itself prove that a payout has reached a runner\'s bank account. Always check the status recorded in your account and contact support if a transaction needs attention.',
  },
  {
    number: '04',
    icon: '⌕',
    title: 'Completion Review & Disputes',
    body: 'After a runner marks a task complete, the creator has 24 hours to confirm completion or raise a dispute. Raise concerns promptly and include relevant task details through the available platform process. DoForYou does not guarantee a particular dispute outcome.',
  },
  {
    number: '05',
    icon: '⌑',
    title: 'Privacy & Personal Information',
    body: 'DoForYou handles personal information in accordance with applicable South African law, including POPIA. Review the platform\'s privacy information before submitting personal details. For privacy or cookie questions, contact info@doforyou.co.za.',
  },
  {
    number: '06',
    icon: '✕',
    title: 'Prohibited Activities',
    body: 'Users may not use DoForYou for illegal activities, harassment, fraud, impersonation, or any conduct that violates South African law or the rights of other users. Violations may result in immediate account suspension.',
  },
  {
    number: '07',
    icon: '?',
    title: 'Questions & Support',
    body: 'For questions about these terms or a specific task or transaction, contact DoForYou support with the relevant reference. Never share your password, full card details, or one-time security codes with anyone, including support.',
  },
]

export default function Terms() {
  usePageMetadata('Terms & Conditions | DoForYou', 'Read the DoForYou platform terms and conditions covering user responsibilities, payments, completion review, disputes, and privacy.')
  return (
    <div className="marketing-page premium-marketing-page legacy-marketing-page terms-page">
      <header className="premium-page-hero">
        <div className="container premium-hero-grid">
          <div className="premium-hero-copy">
            <span className="marketing-kicker">PLATFORM TERMS & CONDITIONS</span>
            <h1>Clear rules. <em>Fair expectations.</em></h1>
            <p>These terms apply to everyone who uses DoForYou — task creators and runners alike. Please read them before posting or accepting a task.</p>
            <div className="premium-trust-line">
              <span><i aria-hidden="true">✓</i> Applies to all users</span>
              <span><i aria-hidden="true">✓</i> South African law</span>
              <span><i aria-hidden="true">✓</i> POPIA compliant intent</span>
            </div>
          </div>
        </div>
      </header>

      <section className="premium-section">
        <div className="container">
          <div className="premium-section-heading">
            <span className="marketing-kicker">WHAT YOU NEED TO KNOW</span>
            <h2>Terms that protect both sides.</h2>
            <p>DoForYou connects task creators and runners. These terms set out what each party can expect from the platform and from each other.</p>
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
            <span className="marketing-kicker">NEED MORE HELP?</span>
            <h2>Still have questions?</h2>
            <p>For payment and completion questions, visit the <Link to="/payments-and-completion">Payments & Completion</Link> page. For anything else, <Link to="/contact">contact DoForYou support</Link> with your task or transaction reference.</p>
            <p className="terms-last-updated">Last reviewed: {new Date().toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}. These terms are a platform summary and should be read alongside the full legal documentation.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
