import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicApi } from '../api'
import { usePostErrand } from '../hooks/usePostErrand'
import { usePageMetadata } from '../hooks/usePageMetadata'
import './Home.css'

const features = [
  { image: new URL('../assets/images/image1.jpeg', import.meta.url).href, title: 'Post a Task', description: 'Describe what you need, set your budget, and explain when and where the task should happen.' },
  { image: new URL('../assets/images/image2.jpeg', import.meta.url).href, title: 'Choose a Runner', description: 'Review available runners and choose the person who best fits your task.' },
  { image: new URL('../assets/images/image3.jpeg', import.meta.url).href, title: 'Confirm Completion', description: 'Follow the task through completion and confirm the result or raise a concern.' },
]

type PublicTestimonial = { id: number; name: string; role: string; text: string; sortOrder: number }

export default function Home() {
  usePageMetadata('DoForYou — Let’s Get It Done | South Africa Task Marketplace', "Post a task, connect with local runners, and get everyday jobs done with DoForYou — South Africa's task marketplace.")
  const { handlePostErrand, ProfileIncompleteModal } = usePostErrand()
  const [testimonials, setTestimonials] = useState<PublicTestimonial[]>([])

  useEffect(() => {
    let active = true
    publicApi.getTestimonials()
      .then(response => {
        const data = response.data?.data
        if (active) setTestimonials(Array.isArray(data) ? data : [])
      })
      .catch(() => { if (active) setTestimonials([]) })
    return () => { active = false }
  }, [])
  return (
    <>
      <div className="home-page">
        <section className="hero-section" aria-labelledby="home-heading">
          <div className="container hero-content">
            <div className="hero-text">
              <div className="hero-badge"><i className="fas fa-bolt" aria-hidden="true" /> A South African task marketplace</div>
              <h1 id="home-heading">Let’s get it done<span className="dot">.</span></h1>
              <p>Big to-do list? Not enough hours? Find practical local help for everyday tasks — or put your time and skills to work as a runner.</p>
              <div className="hero-actions">
                <Link to="/tasks/browse" className="btn btn-secondary btn-lg">Browse Tasks <span aria-hidden="true">→</span></Link>
                <button onClick={handlePostErrand} className="btn btn-primary btn-lg">Post a Task <span aria-hidden="true">↗</span></button>
              </div>
              <div className="hero-trust-note"><span className="hero-trust-mark" aria-hidden="true"><i className="fas fa-check" /></span><span>Clear task details. Local people. Progress you can follow.</span></div>
            </div>
            <div className="hero-visual" aria-label="Everyday tasks and local help">
              <div className="hero-photo-main">
                <img src={features[1].image} alt="A glimpse of the people and everyday tasks that bring a community together" fetchPriority="high" decoding="async" />
              </div>
              <div className="hero-visual-note">
                <span className="hero-note-icon"><i className="fas fa-handshake" aria-hidden="true" /></span>
                <span><strong>A little help goes a long way.</strong><small>Find your next step with DoForYou.</small></span>
              </div>
              <div className="hero-visual-label"><span className="hero-live-dot" /> Built around real-life tasks</div>
            </div>
          </div>
        </section>

        <section className="video-section" aria-labelledby="intro-video-heading">
          <div className="container video-story">
            <div className="video-story-copy">
              <p className="home-section-eyebrow">LESS RUNNING AROUND. MORE GETTING DONE.</p>
              <h2 id="intro-video-heading">A simpler way to get things moving.</h2>
              <p>DoForYou brings task creators and local runners together. Share what needs doing, agree on the details, and keep track of the task from start to finish.</p>
              <Link to="/how-it-works" className="video-story-link">Get to know the process <span aria-hidden="true">→</span></Link>
            </div>
            <div className="video-frame">
              <video width="100%" height="auto" controls muted playsInline preload="metadata" aria-label="Introducing the DoForYou platform">
                <source src="/assets/videos/DoForYou Freelance Platform Introduction.mp4" type="video/mp4" />
                Your browser does not support the video. You can still browse tasks and learn how DoForYou works.
              </video>
              <span className="video-frame-caption"><i className="fas fa-play-circle" aria-hidden="true" /> Meet DoForYou</span>
            </div>
          </div>
        </section>

        <section className="features-section" aria-labelledby="how-it-works-heading">
          <div className="container">
            <p className="home-section-eyebrow">FROM FIRST IDEA TO FINISHED TASK</p>
            <h2 id="how-it-works-heading" className="section-title text-center">Good things happen when it’s clear.</h2>
            <p className="home-section-intro">A straightforward journey helps creators and runners know what to expect at every step.</p>
            <div className="features-grid">
              {features.map((f, index) => (
                <article key={f.title} className="feature-card">
                  <div className="feature-image-wrap">
                    <img src={f.image} alt="" loading="lazy" decoding="async" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <span className="feature-step">0{index + 1}</span>
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.description}</p>
                </article>
              ))}
            </div>
            <div className="home-section-link"><Link to="/how-it-works" className="btn btn-secondary">See how the task journey works <span aria-hidden="true">→</span></Link></div>
          </div>
        </section>

        <section className="runner-section" aria-labelledby="runner-heading">
          <div className="container runner-inner">
            <div className="runner-text">
              <p className="runner-eyebrow">FOR LOCAL DOERS</p>
              <h2 id="runner-heading">Your time has value. Put it to work.</h2>
              <h4>Find tasks that suit your skills, schedule, and location.</h4>
              <p className="runner-description">Choose tasks thoughtfully, agree on expectations before you begin, and keep the creator updated as you work.</p>
              <Link to="/for-runners" className="btn btn-primary btn-lg">Explore runner opportunities <span aria-hidden="true">→</span></Link>
            </div>
            <div className="runner-image">
              <img src="/DFY.png" alt="DoForYou logo" loading="lazy" decoding="async" />
            </div>
          </div>
        </section>

        {testimonials.length > 0 && <section className="testimonials-section" aria-labelledby="testimonials-heading">
          <div className="container">
            <p className="home-section-eyebrow">FROM THE DOFORYOU COMMUNITY</p>
            <h2 id="testimonials-heading" className="section-title text-center">What people say</h2>
            <p className="home-section-intro">Experiences from people using DoForYou to get everyday tasks done and find local earning opportunities.</p>
            <div className="testimonials-grid">
              {testimonials.map((t) => (
                <article key={t.id} className="testimonial-card">
                  <div className="testimonial-avatar" aria-hidden="true">{t.name.charAt(0)}</div>
                  <p className="testimonial-text">“{t.text}”</p>
                  <div className="testimonial-author"><strong>{t.name}</strong><span>{t.role}</span></div>
                </article>
              ))}
            </div>
          </div>
        </section>}

        <section className="testimonials-section task-journey-section" aria-labelledby="completion-heading">
          <div className="container">
            <p className="home-section-eyebrow">CLARITY BUILDS CONFIDENCE</p>
            <h2 id="completion-heading" className="section-title text-center">A clear task journey</h2>
            <p className="home-section-intro">Know what to discuss before work begins and what to do when the task is marked complete.</p>
            <div className="testimonials-grid">
              {[
                { icon: 'fa-clipboard-check', title: 'Agree on the task', text: 'The creator describes the work and budget. The runner reviews the details before accepting.' },
                { icon: 'fa-list-check', title: 'Keep progress visible', text: 'Task status helps both sides understand what has happened and what action comes next.' },
                { icon: 'fa-shield-alt', title: 'Review completion', text: 'After a runner marks a task complete, the creator has 24 hours to confirm completion or raise a dispute.' },
              ].map((step) => (
                <article key={step.title} className="testimonial-card journey-card">
                  <div className="testimonial-avatar" aria-hidden="true"><i className={`fas ${step.icon}`} /></div>
                  <h3 className="testimonial-author-title">{step.title}</h3>
                  <p className="testimonial-text">{step.text}</p>
                </article>
              ))}
            </div>
            <p className="home-payment-note">If the creator takes no action during the confirmation period, the platform follows its configured release process. Payment status is determined by the payment provider and platform records.</p>
          </div>
        </section>
      </div>
      {ProfileIncompleteModal}
    </>
  )
}
