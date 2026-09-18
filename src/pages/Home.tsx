import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicApi } from '../api'
import { usePostErrand } from '../hooks/usePostErrand'
import './Home.css'

const features = [
  { image: new URL('../assets/images/image1.jpeg', import.meta.url).href, title: 'Post a Task', description: 'Describe what you need done, set your budget, and let qualified runners come to you.' },
  { image: new URL('../assets/images/image2.jpeg', import.meta.url).href, title: 'Choose a Runner', description: 'Browse profiles, check ratings, and pick the best person for your task.' },
  { image: new URL('../assets/images/image3.jpeg', import.meta.url).href, title: 'Get It Done', description: 'Your runner completes the task. Confirm completion and release payment securely.' },
]

interface PublicStats {
  tasksCompleted: number
  activeRunners: number
  averageRating: number
}

const formatCount = (value: number) => {
  if (value >= 1000) {
    const thousands = value / 1000
    const formatted = thousands >= 10 ? Math.floor(thousands) : Math.round(thousands * 10) / 10
    return formatted + 'k+'
  }
  return String(value)
}

export default function Home() {
  const { handlePostErrand, ProfileIncompleteModal } = usePostErrand()
  const [stats, setStats] = useState<PublicStats | null>(null)

  useEffect(() => {
    let mounted = true
    publicApi.getStats()
      .then(response => {
        const data = response.data?.data || response.data
        if (mounted && data) {
          setStats({
            tasksCompleted: Number(data.tasksCompleted) || 0,
            activeRunners: Number(data.activeRunners) || 0,
            averageRating: Number(data.averageRating) || 0,
          })
        }
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  return (
    <>
    <div className="home-page">
      {/* Hero */}
      <section className="hero-section">
        <div className="container hero-content">
          <div className="hero-text">
            <div className="hero-badge"><i className="fas fa-bolt" /> Trusted local task marketplace</div>
            <h1>Let’s get it done<span className="dot">.</span></h1>
            <p>Connect with reliable people in your area to post errands, complete tasks, and earn extra income without the hassle.</p>
            <div className="hero-actions">
              <Link to="/tasks/browse" className="btn btn-secondary btn-lg">Browse Errands</Link>
              <button onClick={handlePostErrand} className="btn btn-primary btn-lg">Post An Errand</button>
            </div>
            <div className="hero-stats">
              <div><strong>{stats ? formatCount(stats.tasksCompleted) : '—'}</strong><span>Tasks completed</span></div>
              <div><strong>{stats ? formatCount(stats.activeRunners) : '—'}</strong><span>Active runners</span></div>
              <div><strong>{stats ? stats.averageRating.toFixed(1) + '/5' : '—'}</strong><span>Average rating</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Video */}
      <section className="video-section">
        <div className="container">
          <video width="100%" height="auto" controls autoPlay muted playsInline preload="auto">
            <source src="/assets/videos/DoForYou Freelance Platform Introduction.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title text-center">Let<span className="dot">'</span>s get it done<span className="dot">!</span></h2>
          <div className="features-grid">
            {features.map((f, i) => (
              <div key={i} className="feature-card">
                <img src={f.image} alt={f.title} onError={(e) => { (e.target as HTMLImageElement).src = '/DFY.png' }} />
                <h3>{f.title}</h3>
                <p>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Runner CTA */}
      <section className="runner-section">
        <div className="container runner-inner">
          <div className="runner-text">
            <h2>Become a runner</h2>
            <h4>Start running errands and getting paid</h4>
            <Link to="/tasks/browse" className="btn btn-primary btn-lg">Browse Errands</Link>
          </div>
          <div className="runner-image">
            <img src="/DFY.png" alt="Become a runner" />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section">
        <div className="container">
          <h2 className="section-title text-center">What people say</h2>
          <div className="testimonials-grid">
            {[
              { name: 'Thabo M.', role: 'Task Creator', text: 'DoForYou helped me find someone to handle my grocery shopping within hours. Amazing service!' },
              { name: 'Lerato K.', role: 'Task Runner', text: 'I\'ve been earning extra income on weekends by completing tasks in my area. Highly recommend!' },
              { name: 'Sipho N.', role: 'Task Creator', text: 'The platform is so easy to use. I posted a task and had it completed the same day.' },
            ].map((t, i) => (
              <div key={i} className="testimonial-card">
                <div className="testimonial-avatar">{t.name.charAt(0)}</div>
                <p className="testimonial-text">"{t.text}"</p>
                <div className="testimonial-author">
                  <strong>{t.name}</strong>
                  <span>{t.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
    {ProfileIncompleteModal}
    </>
  )
}
