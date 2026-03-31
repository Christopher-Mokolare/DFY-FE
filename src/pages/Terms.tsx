export default function Terms() {
  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div className="page-header"><div className="container"><h1>Terms & Conditions</h1></div></div>
      <div className="container" style={{ maxWidth: 800, paddingTop: '2rem' }}>
        <div className="section-card" style={{ lineHeight: 1.8, color: 'var(--text-muted)' }}>
          {[
            { title: '1. Acceptance of Terms', body: 'By using DoForYou, you agree to these terms and conditions. If you do not agree, please do not use our platform.' },
            { title: '2. User Responsibilities', body: 'Users are responsible for providing accurate information, completing tasks as agreed, and treating other users with respect.' },
            { title: '3. Payment & Escrow', body: 'All payments are held in escrow until task completion is confirmed. DoForYou charges a 15% platform fee on all transactions.' },
            { title: '4. Dispute Resolution', body: 'In case of disputes, DoForYou will mediate between parties. Our decision is final in unresolved disputes.' },
            { title: '5. Privacy', body: 'We collect and process personal data as described in our Privacy Policy. By using our platform, you consent to this processing.' },
            { title: '6. Prohibited Activities', body: 'Users may not use the platform for illegal activities, harassment, fraud, or any activity that violates South African law.' },
            { title: '7. Limitation of Liability', body: 'DoForYou is not liable for any indirect, incidental, or consequential damages arising from the use of our platform.' },
          ].map((s, i) => (
            <div key={i} style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--text-dark)', marginBottom: '0.5rem', fontSize: '1rem' }}>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
          <p style={{ fontSize: '0.875rem', marginTop: '2rem' }}>Last updated: January 2026. For questions, contact <a href="mailto:info@doforyou.co.za">info@doforyou.co.za</a></p>
        </div>
      </div>
    </div>
  )
}
