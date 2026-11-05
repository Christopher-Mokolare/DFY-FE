import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePageMetadata } from '../hooks/usePageMetadata'
import { supportApi } from '../api'
import './LegacyMarketingPages.css'

const CONTACT_METHODS = [
  { icon: 'fa-map-marker-alt', label: 'Visit our location', lines: ['Cnr General Hertzog Road & Nile Dr', 'Three Rivers, Vereeniging, 1935'], href: 'https://maps.google.com/?q=Cnr+General+Hertzog+Road+Nile+Dr+Three+Rivers+Vereeniging', external: true },
  { icon: 'fa-phone-alt', label: 'Call support', lines: ['+27 79 525 8611'], href: 'tel:+27795258611', external: false },
  { icon: 'fa-envelope', label: 'Email support', lines: ['info@doforyou.co.za'], href: 'mailto:info@doforyou.co.za', external: false },
]

export default function Contact() {
  usePageMetadata('Contact Support | DoForYou', 'Get in touch with DoForYou support about your account, a task, completion review, or payment status.')
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await supportApi.createTicket({
        name: form.name,
        email: form.email,
        subject: `Website contact from ${form.name}`,
        message: form.message,
        category: 'General',
        priority: 'Normal',
      })
      if (response.data?.success === false) throw new Error(response.data?.message || 'Unable to send your message.')
      setSent(true)
      setForm({ name: '', email: '', message: '' })
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Unable to send your message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return <div className="marketing-page premium-marketing-page legacy-marketing-page contact-page">
    <header className="premium-page-hero"><div className="container premium-hero-grid">
      <div className="premium-hero-copy"><span className="marketing-kicker">WE'RE HERE TO HELP</span><h1>Let's get you <em>back on track.</em></h1><p>Questions about a task, your account, completion review, or payment status? Choose a contact method or send the support team a message.</p><div className="marketing-actions"><a className="btn btn-primary btn-lg" href="mailto:info@doforyou.co.za">Email our team <span aria-hidden="true">→</span></a><Link className="btn btn-secondary btn-lg" to="/faq">Browse FAQs</Link></div><div className="premium-trust-line"><span><i aria-hidden="true">✓</i> Account and task support</span><span><i aria-hidden="true">✓</i> Payment questions</span><span><i aria-hidden="true">✓</i> South African support</span></div></div>
      <div className="premium-hero-visual"><img className="premium-hero-photo" src={new URL('../assets/images/image2.jpeg', import.meta.url).href} alt="A person ready to help with everyday tasks" /><div className="hero-image-caption"><span className="hero-caption-dot" /> A real person is behind every support request</div></div>
    </div></header>
    <main className="contact-main"><div className="container contact-layout">
      <section className="contact-intro"><span className="marketing-kicker">CHOOSE HOW TO REACH US</span><h2>How can we help?</h2><p>For task or payment questions, include the task or transaction reference and the status you see. Please never send passwords, full card details, or one-time security codes.</p>
        <div className="contact-methods">{CONTACT_METHODS.map(m => <a key={m.label} href={m.href} {...(m.external ? { target: '_blank', rel: 'noreferrer' } : {})} className="contact-method-card"><span className="contact-method-icon" aria-hidden="true"><i className={`fas ${m.icon}`} /></span><span className="contact-method-content"><h3>{m.label}</h3>{m.lines.map(line => <p key={line}>{line}</p>)}</span><span aria-hidden="true" style={{marginLeft:'auto',color:'#B85E00'}}>↗</span></a>)}</div>
      </section>
      <section className="contact-form-card" aria-labelledby="contact-form-title"><h2 id="contact-form-title">Send the team a message</h2><p>Tell us what happened and we'll help you find the next step.</p>
        {sent ? <div className="alert alert-success" role="status"><i className="fas fa-check-circle" /> Message received. We will get back to you as soon as we can.</div> : <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          {error && <div className="alert alert-error" role="alert"><i className="fas fa-exclamation-circle" /> {error}</div>}
          <div className="form-group"><label className="form-label" htmlFor="contact-name">Your name</label><input id="contact-name" name="name" autoComplete="name" className="form-input" placeholder="Your full name" value={form.name} onChange={set('name')} required disabled={loading} /></div>
          <div className="form-group"><label className="form-label" htmlFor="contact-email">Email address</label><input id="contact-email" name="email" autoComplete="email" type="email" className="form-input" placeholder="you@example.com" value={form.email} onChange={set('email')} required disabled={loading} /></div>
          <div className="form-group"><label className="form-label" htmlFor="contact-message">How can we help?</label><textarea id="contact-message" name="message" className="form-textarea" rows={5} maxLength={5000} placeholder="Describe your question or issue. Include a task reference if relevant, but no passwords or security codes." value={form.message} onChange={set('message')} required disabled={loading} /></div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>{loading ? <><span className="spinner spinner-sm" /> Sending message...</> : <><i className="fas fa-paper-plane" /> Send message</>}</button>
        </form>}
        <p className="contact-safety-note">For your security, do not include passwords, full payment card details, or one-time verification codes in this form.</p>
      </section>
    </div></main>
  </div>
}
