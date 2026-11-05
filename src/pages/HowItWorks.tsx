import { Link } from 'react-router-dom'
import { usePageMetadata } from '../hooks/usePageMetadata'
const taskImage = new URL('../assets/images/image1.jpeg', import.meta.url).href
const runnerImage = new URL('../assets/images/image2.jpeg', import.meta.url).href
const completionImage = new URL('../assets/images/image3.jpeg', import.meta.url).href

const steps = [
  { number: '01', title: 'Post the task', text: 'Describe the result you need, choose a realistic budget, and share the location, timing, and details that matter.', tip: 'Clear expectations help the right runner decide.' , image: taskImage, alt: 'Planning and describing a task' },
  { number: '02', title: 'Agree on the details', text: 'Review the task information together. Clarify the scope, timing, access, budget, and any special requirements before work begins.', tip: 'Ask questions before committing.', image: runnerImage, alt: 'A person preparing to complete a task' },
  { number: '03', title: 'Keep each other updated', text: 'Use the task status and available communication tools to share progress and raise concerns early if anything changes.', tip: 'Keep important changes clear and documented.', image: completionImage, alt: 'Task work being reviewed' },
  { number: '04', title: 'Review completion', text: 'When the runner marks the task complete, the creator has 24 hours to confirm completion or raise a dispute through the platform process.', tip: 'The confirmation window is not a promise of instant payout.', image: completionImage, alt: 'Reviewing a completed task' },
]

export default function HowItWorks() {
  usePageMetadata('How DoForYou Works | Post Tasks and Find Local Runners', 'See how DoForYou connects task creators and runners, from a clear task brief through completion review.')
  return <div className="marketing-page premium-marketing-page how-page">
    <header className="premium-page-hero how-hero">
      <div className="container premium-hero-grid">
        <div className="premium-hero-copy">
          <span className="marketing-kicker">A BETTER WAY TO GET THINGS DONE</span>
          <h1>From “I need a hand” to <em>“all sorted.”</em></h1>
          <p>DoForYou brings task creators and local runners together around clear expectations, visible progress, and a proper chance to review the result.</p>
          <div className="marketing-actions"><Link className="btn btn-primary btn-lg" to="/register">Post a task <span aria-hidden="true">→</span></Link><Link className="btn btn-secondary btn-lg" to="/tasks/browse">Explore tasks</Link></div>
          <div className="premium-trust-line"><span><i aria-hidden="true">✓</i> Clear task details</span><span><i aria-hidden="true">✓</i> Shared expectations</span><span><i aria-hidden="true">✓</i> 24-hour review window</span></div>
        </div>
        <div className="premium-hero-visual">
          <img className="premium-hero-photo" src={taskImage} alt="A person getting everyday work organised" />
          <div className="floating-info-card"><span className="floating-info-icon">✓</span><div><strong>A clear next step</strong><span>Know what happens next in the task journey.</span></div></div>
          <div className="hero-image-caption"><span className="hero-caption-dot" /> Made for everyday tasks in South Africa</div>
        </div>
      </div>
    </header>
    <section className="premium-section process-overview">
      <div className="container">
        <div className="premium-section-heading"><span className="marketing-kicker">THE TASK JOURNEY</span><h2>Four steps. Fewer surprises.</h2><p>Simple doesn't have to mean vague. Each stage helps both sides know what to expect.</p></div>
        <div className="premium-process-grid">{steps.map(step => <article key={step.number} className="premium-process-card"><div className="process-card-top"><span className="premium-step-number">{step.number}</span><span className="process-arrow" aria-hidden="true">↗</span></div><img src={step.image} alt={step.alt} loading="lazy" /><h3>{step.title}</h3><p>{step.text}</p><div className="process-card-tip"><span aria-hidden="true">✦</span>{step.tip}</div></article>)}</div>
      </div>
    </section>
    <section className="premium-section role-section">
      <div className="container role-panel">
        <div className="role-panel-heading"><span className="marketing-kicker">TWO SIDES, ONE CLEAR AGREEMENT</span><h2>Here for the people who need a hand—and the people ready to lend one.</h2><p>Whether you are getting something off your list or looking for tasks that fit your time, start with the right guide.</p></div>
        <div className="role-choice-grid">
          <article className="role-choice-card creator-choice"><span className="role-choice-icon" aria-hidden="true">↗</span><span className="role-choice-label">FOR TASK CREATORS</span><h3>Get the help you need</h3><p>Write a clear brief, set your budget, agree on the details, and review the completed task.</p><Link to="/for-creators">How to post a great task <span aria-hidden="true">→</span></Link></article>
          <article className="role-choice-card runner-choice"><span className="role-choice-icon" aria-hidden="true">✦</span><span className="role-choice-label">FOR RUNNERS</span><h3>Make your time count</h3><p>Find suitable tasks, clarify expectations before accepting, and keep the creator updated.</p><Link to="/for-runners">Explore the runner guide <span aria-hidden="true">→</span></Link></article>
        </div>
      </div>
    </section>
    <section className="premium-section confirmation-section">
      <div className="container confirmation-grid"><div className="confirmation-visual"><img src={completionImage} alt="A task result ready to be reviewed" loading="lazy" /><div className="confirmation-badge"><strong>24 hours</strong><span>Creator confirmation window</span></div></div><div className="confirmation-copy"><span className="marketing-kicker">COMPLETION SHOULD BE CLEAR</span><h2>Finish the task. Review the result. Know where things stand.</h2><p>Once a runner marks a task complete, the creator has 24 hours to confirm completion or raise a dispute. If neither happens, the platform follows its configured release process.</p><p className="premium-muted-copy">Payment processing and payout status can depend on the payment provider and the transaction's recorded status. Check the platform for the latest information.</p><Link className="text-link-arrow" to="/faq">Understand completion and payments <span aria-hidden="true">→</span></Link></div></div>
    </section>
    <section className="premium-bottom-cta"><div className="container premium-bottom-cta-inner"><div><span className="marketing-kicker">READY WHEN YOU ARE</span><h2>Let's get that task moving.</h2><p>Start with a clear brief or explore tasks that need a capable runner.</p></div><div className="marketing-actions"><Link className="btn btn-primary btn-lg" to="/register">Post a task</Link><Link className="btn btn-dark-outline btn-lg" to="/tasks/browse">Browse tasks</Link></div></div></section>
  </div>
}
