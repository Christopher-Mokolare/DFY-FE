import { useState } from 'react'

const CONTACT_METHODS = [
  {
    icon: 'fa-map-marker-alt',
    label: 'Our Location',
    lines: ['Cnr General Hertzog Road &', 'Nile Dr, Three Rivers,', 'Vereeniging, 1935'],
    href: 'https://maps.google.com/?q=Cnr+General+Hertzog+Road+Nile+Dr+Three+Rivers+Vereeniging',
  },
  {
    icon: 'fa-phone-alt',
    label: 'Call Us',
    lines: ['+27 79 525 8611'],
    href: 'tel:+27795258611',
  },
  {
    icon: 'fa-envelope',
    label: 'Email Us',
    lines: ['info@doforyou.co.za'],
    href: 'mailto:info@doforyou.co.za',
  },
]

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [sent, setSent] = useState(false)

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [f]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    window.location.href = `mailto:info@doforyou.co.za?subject=Contact from ${encodeURIComponent(form.name)}&body=${encodeURIComponent(form.message)}`
    setSent(true)
  }

  return (
    <div className="contact-page">
      {/* Hero */}
      <div className="contact-hero">
        <div className="container">
          <h1>Get In Touch<span className="dot">.</span></h1>
          <p>Connect with South Africa's premier freelance community. We're here to help you succeed.</p>
        </div>
      </div>

      <div className="container contact-body">
        {/* How to reach us */}
        <div className="contact-reach-section">
          <h2>How To Reach Us</h2>
          <p className="contact-reach-sub">We're always happy to hear from our community. Choose your preferred method below.</p>
          <div className="contact-methods">
            {CONTACT_METHODS.map((m, i) => (
              <a key={i} href={m.href} target="_blank" rel="noreferrer" className="contact-method-card">
                <div className="contact-method-icon">
                  <i className={`fas ${m.icon}`} />
                </div>
                <div className="contact-method-content">
                  <h4>{m.label}</h4>
                  {m.lines.map((line, j) => <p key={j}>{line}</p>)}
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Contact form */}
        <div className="contact-form-section">
          <div className="section-card">
            <div className="section-header">
              <h2><i className="fas fa-paper-plane" /> Send Us a Message</h2>
            </div>
            {sent ? (
              <div className="alert alert-success">
                <i className="fas fa-check-circle" /> Message sent! We'll get back to you soon.
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" placeholder="Your full name" value={form.name} onChange={set('name')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" placeholder="your@email.com" value={form.email} onChange={set('email')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea className="form-textarea" rows={5} placeholder="How can we help you?" value={form.message} onChange={set('message')} required />
                </div>
                <button type="submit" className="btn btn-primary btn-lg">
                  <i className="fas fa-paper-plane" /> Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .contact-hero {
          background: var(--primary-gradient);
          color: #fff;
          padding: 3.5rem 0 3rem;
          text-align: center;
        }
        .contact-hero h1 {
          font-size: clamp(1.75rem, 5vw, 2.5rem);
          margin-bottom: 0.75rem;
        }
        .contact-hero p {
          font-size: clamp(0.9rem, 2.5vw, 1.0625rem);
          opacity: 0.9;
          max-width: 520px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .contact-body {
          padding-top: 3rem;
          padding-bottom: 4rem;
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
        }

        .contact-reach-section { text-align: center; }
        .contact-reach-section h2 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          color: var(--text-dark);
        }
        .contact-reach-sub {
          color: var(--text-muted);
          font-size: 0.9375rem;
          margin-bottom: 2rem;
        }

        .contact-methods {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
        }

        .contact-method-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 1rem;
          padding: 1.75rem 1.25rem;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-sm);
          text-decoration: none;
          color: var(--text-dark);
          transition: transform var(--transition), box-shadow var(--transition), border-color var(--transition);
        }
        .contact-method-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: var(--primary);
          color: var(--text-dark);
        }

        .contact-method-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--primary-gradient);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.375rem;
          flex-shrink: 0;
        }

        .contact-method-content h4 {
          font-size: 0.9375rem;
          font-weight: 600;
          margin-bottom: 0.375rem;
          color: var(--text-dark);
        }
        .contact-method-content p {
          font-size: 0.875rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin: 0;
        }

        .contact-form-section { max-width: 640px; margin: 0 auto; width: 100%; }

        @media (max-width: 768px) {
          .contact-methods {
            grid-template-columns: 1fr;
            max-width: 400px;
            margin: 0 auto;
          }
          .contact-method-card {
            flex-direction: row;
            text-align: left;
          }
          .contact-method-content { flex: 1; }
        }

        @media (min-width: 769px) and (max-width: 900px) {
          .contact-methods { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  )
}
