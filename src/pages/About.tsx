export default function About() {
  return (
    <div style={{ paddingBottom: '3rem' }}>
      <div className="page-header"><div className="container"><h1>About DoForYou</h1><p>Connecting South Africans through meaningful tasks</p></div></div>
      <div className="container" style={{ maxWidth: 800, paddingTop: '2rem' }}>
        <div className="section-card">
          <h2 style={{ marginBottom: '1rem' }}>Our Mission</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: '1rem' }}>DoForYou is a freelance platform that allows ordinary South Africans to perform tasks for each other, providing an opportunity to earn extra cash while helping their community.</p>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.8 }}>Whether you need groceries picked up, a package delivered, or help with household tasks — DoForYou connects you with trusted people in your area who can get it done.</p>
        </div>
        <div className="section-card">
          <h2 style={{ marginBottom: '1rem' }}>How It Works</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { icon: 'fa-plus-circle', title: 'Post a Task', desc: 'Describe what you need done, set your budget, and post your task.' },
              { icon: 'fa-search', title: 'Find a Runner', desc: 'A qualified runner in your area accepts your task.' },
              { icon: 'fa-check-circle', title: 'Get It Done', desc: 'The runner completes the task. Confirm and release payment securely.' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-gradient)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><i className={`fas ${s.icon}`} /></div>
                <div><h4 style={{ marginBottom: '0.25rem' }}>{s.title}</h4><p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{s.desc}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
