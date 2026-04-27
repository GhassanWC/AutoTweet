import React from 'react';
import { useAuth } from '../App';
import { 
  FiEdit3, 
  FiCalendar, 
  FiTarget,
  FiLayers,
  FiCompass,
  FiCheckCircle,
  FiArrowRight,
  FiUsers,
  FiBarChart2,
  FiSliders,
  FiFeather
} from 'react-icons/fi';

const Landing = () => {
  const { login } = useAuth();

  const features = [
    {
      icon: FiCompass,
      title: 'Niche & Voice Setup',
      description: 'Define your niche, audience, and tone. AutoTweet learns how you communicate so every post sounds like you — not a bot.'
    },
    {
      icon: FiEdit3,
      title: 'AI Content Creation',
      description: 'Generate post ideas, tweets, and threads tailored to your brand. Edit, refine, and approve everything before it goes live.'
    },
    {
      icon: FiLayers,
      title: 'Content Pillars & Themes',
      description: 'Organize your content around core themes. Stay focused, avoid repetition, and cover the topics your audience cares about.'
    },
    {
      icon: FiTarget,
      title: 'Multiple Post Formats',
      description: 'Hot takes, storytelling, listicles, threads, insights. Vary your content style so your feed never feels one-dimensional.'
    },
    {
      icon: FiCalendar,
      title: 'Plan & Publish',
      description: 'Schedule content for optimal times. Review your week at a glance and publish with confidence — nothing goes out unreviewed.'
    },
    {
      icon: FiBarChart2,
      title: 'Learn & Improve',
      description: 'Track what resonates with your audience. AutoTweet surfaces insights so your content strategy gets sharper over time.'
    }
  ];

  const audiences = [
    {
      icon: FiFeather,
      title: 'Creators',
      description: 'You have ideas but struggle to turn them into a consistent posting habit. AutoTweet gives you the structure.'
    },
    {
      icon: FiTarget,
      title: 'Founders & Personal Brands',
      description: 'You know you need to be on X. You just need help showing up with quality content that builds trust.'
    },
    {
      icon: FiUsers,
      title: 'Agencies & Teams',
      description: 'Manage content for multiple clients. Keep every account on-brand and on-schedule without burning out.'
    }
  ];

  const howItWorks = [
    {
      step: '01',
      title: 'Set Up Your Brand Voice',
      description: 'Tell us your niche, audience, topics, and tone. This is your content foundation — everything flows from here.'
    },
    {
      step: '02',
      title: 'Generate & Refine Content',
      description: 'Get AI-powered post ideas, drafts, and threads. Edit them until they feel right. Nothing publishes without your approval.'
    },
    {
      step: '03',
      title: 'Schedule & Publish',
      description: 'Plan your content calendar. Pick the right times. Hit publish. Show up consistently without the daily scramble.'
    }
  ];

  return (
    <div className="landing">
      {/* Background effects */}
      <div className="landing-bg">
        <div className="bg-gradient" />
        <div className="bg-grid" />
        <div className="bg-glow bg-glow-1" />
        <div className="bg-glow bg-glow-2" />
        <div className="bg-glow bg-glow-3" />
      </div>

      {/* Hero Section */}
      <header className="landing-header">
        <nav className="landing-nav">
          <div className="nav-logo">
            <div className="nav-logo-icon">
              <FiEdit3 size={20} />
            </div>
            <span>AutoTweet</span>
          </div>
          <div className="nav-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <a href="#who" className="nav-link">Who It's For</a>
            <button className="btn btn-secondary btn-sm" onClick={login}>
              Sign in with X
            </button>
          </div>
        </nav>

        <div className="hero">
          <div className="hero-content animate-slide-up">
            <div className="hero-badge">
              <FiFeather size={14} />
              <span>AI-powered content workspace for X</span>
            </div>
            <h1 className="hero-title">
              Know what to post.
              <br />
              <span className="gradient-text">Create it faster.</span>
              <br />
              Publish consistently.
            </h1>
            <p className="hero-description">
              AutoTweet is a content workspace that helps you plan, create, and publish 
              on X — with AI that actually sounds like you. Not a bot. Not a growth hack. 
              A smarter way to build your presence.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" onClick={login}>
                Get Started Free
                <FiArrowRight size={18} />
              </button>
              <a href="#how-it-works" className="btn btn-ghost btn-lg">
                See How It Works
              </a>
            </div>
          </div>

          <div className="hero-visual animate-slide-up stagger-2">
            <div className="dashboard-preview">
              <div className="preview-header">
                <div className="preview-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="preview-title">Content Workspace</span>
              </div>
              <div className="preview-content">
                <div className="preview-draft">
                  <div className="draft-label">
                    <FiEdit3 size={12} />
                    <span>AI Draft</span>
                  </div>
                  <p className="draft-text">Most founders overthink their first post. The real hack? Just start. Share one lesson from this week. That's it. Your audience doesn't need perfection — they need perspective.</p>
                  <div className="draft-meta">
                    <span className="draft-pillar">🎯 Personal Branding</span>
                    <span className="draft-style">Hot Take</span>
                  </div>
                </div>
                <div className="preview-actions-bar">
                  <button className="preview-btn active">
                    <FiCheckCircle size={14} />
                    Approve
                  </button>
                  <button className="preview-btn">
                    <FiEdit3 size={14} />
                    Edit
                  </button>
                  <button className="preview-btn">
                    <FiCalendar size={14} />
                    Schedule
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Anti-Generic AI Section */}
      <section className="anti-section">
        <div className="anti-content">
          <div className="anti-badge">Why we built this differently</div>
          <h2>AI content doesn't have to be <span className="gradient-text">generic.</span></h2>
          <p className="anti-description">
            Most AI tools create content that sounds the same for everyone. Bland, robotic, 
            interchangeable. We think that defeats the purpose. AutoTweet is built around 
            <strong> your</strong> voice, <strong>your</strong> niche, and <strong>your</strong> ideas — 
            so the content it helps you create is actually worth posting.
          </p>
          <div className="anti-grid">
            <div className="anti-item">
              <FiCheckCircle size={20} />
              <span>Brand voice that sounds like you</span>
            </div>
            <div className="anti-item">
              <FiCheckCircle size={20} />
              <span>Content pillars to stay focused</span>
            </div>
            <div className="anti-item">
              <FiCheckCircle size={20} />
              <span>Different styles & angles for variety</span>
            </div>
            <div className="anti-item">
              <FiCheckCircle size={20} />
              <span>Human review before every post</span>
            </div>
            <div className="anti-item">
              <FiCheckCircle size={20} />
              <span>Built for quality, not just volume</span>
            </div>
            <div className="anti-item">
              <FiCheckCircle size={20} />
              <span>Gets better as it learns your style</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <div className="section-badge">Features</div>
          <h2>Everything you need to create better content</h2>
          <p>A complete workspace for planning, creating, and publishing on X.</p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div 
              key={feature.title} 
              className={`feature-card animate-slide-up stagger-${index + 1}`}
            >
              <div className="feature-icon">
                <feature.icon size={24} />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="how-section">
        <div className="section-header">
          <div className="section-badge">How It Works</div>
          <h2>From blank page to published — in minutes</h2>
          <p>Three steps to a content system that actually works.</p>
        </div>

        <div className="how-grid">
          {howItWorks.map((item, index) => (
            <div key={item.step} className={`how-card animate-slide-up stagger-${index + 1}`}>
              <div className="how-step">{item.step}</div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who It's For */}
      <section id="who" className="who-section">
        <div className="section-header">
          <div className="section-badge">Who It's For</div>
          <h2>Built for people who take content seriously</h2>
          <p>Whether you're a solo creator or an agency, AutoTweet fits your workflow.</p>
        </div>

        <div className="who-grid">
          {audiences.map((item, index) => (
            <div key={item.title} className={`who-card animate-slide-up stagger-${index + 1}`}>
              <div className="who-icon">
                <item.icon size={28} />
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social Proof / Trust */}
      <section className="trust-section">
        <div className="trust-content">
          <div className="trust-stats">
            <div className="trust-stat">
              <span className="trust-value">Quality</span>
              <span className="trust-label">over quantity — always</span>
            </div>
            <div className="trust-divider" />
            <div className="trust-stat">
              <span className="trust-value">Your voice</span>
              <span className="trust-label">not a template</span>
            </div>
            <div className="trust-divider" />
            <div className="trust-stat">
              <span className="trust-value">You approve</span>
              <span className="trust-label">every post before it goes live</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Stop guessing what to post.</h2>
          <p>
            Join creators and founders who use AutoTweet to show up consistently 
            on X — with content that actually sounds like them.
          </p>
          <button className="btn btn-primary btn-lg" onClick={login}>
            Get Started Free
            <FiArrowRight size={18} />
          </button>
          <span className="cta-note">Free to start · No credit card required</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <div className="footer-logo-icon">
              <FiEdit3 size={16} />
            </div>
            <span>AutoTweet</span>
          </div>
          <p>&copy; {new Date().getFullYear()} AutoTweet. All rights reserved.</p>
        </div>
      </footer>

      <style jsx>{`
        .landing {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
        }

        .landing-bg {
          position: fixed;
          inset: 0;
          z-index: -1;
        }

        .bg-gradient {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at top, #131a2e 0%, var(--color-bg-primary) 70%);
        }

        .bg-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(129, 140, 248, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(129, 140, 248, 0.02) 1px, transparent 1px);
          background-size: 72px 72px;
        }

        .bg-glow {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          filter: blur(140px);
          opacity: 0.12;
        }

        .bg-glow-1 {
          top: -200px;
          left: -100px;
          background: #818cf8;
        }

        .bg-glow-2 {
          bottom: -200px;
          right: -200px;
          background: #22d3ee;
        }

        .bg-glow-3 {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 800px;
          height: 400px;
          background: #f472b6;
          opacity: 0.05;
        }

        /* ---- NAV ---- */
        .landing-header {
          max-width: 1280px;
          margin: 0 auto;
          padding: var(--spacing-lg) var(--spacing-xl);
        }

        .landing-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-md) 0;
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--color-text-primary);
        }

        .nav-logo-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-accent-gradient);
          border-radius: var(--radius-md);
          color: var(--color-bg-primary);
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
        }

        .nav-link {
          color: var(--color-text-secondary);
          font-size: 0.9375rem;
          font-weight: 500;
          text-decoration: none;
          transition: color var(--transition-fast);
        }

        .nav-link:hover {
          color: var(--color-text-primary);
        }

        /* ---- HERO ---- */
        .hero {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-2xl);
          align-items: center;
          padding: var(--spacing-2xl) 0;
          min-height: 80vh;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: 6px var(--spacing-md);
          background: rgba(129, 140, 248, 0.08);
          border: 1px solid rgba(129, 140, 248, 0.15);
          border-radius: var(--radius-full);
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--color-accent-secondary);
          margin-bottom: var(--spacing-lg);
          letter-spacing: 0.01em;
        }

        .hero-title {
          font-size: 3.5rem;
          font-weight: 700;
          line-height: 1.15;
          margin-bottom: var(--spacing-lg);
          letter-spacing: -0.02em;
        }

        .gradient-text {
          background: var(--color-accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-description {
          font-size: 1.125rem;
          color: var(--color-text-secondary);
          line-height: 1.7;
          margin-bottom: var(--spacing-xl);
          max-width: 520px;
        }

        .hero-actions {
          display: flex;
          gap: var(--spacing-md);
        }

        /* ---- HERO PREVIEW ---- */
        .hero-visual {
          display: flex;
          justify-content: center;
        }

        .dashboard-preview {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          overflow: hidden;
          width: 100%;
          max-width: 500px;
          box-shadow: var(--shadow-lg), 0 0 80px rgba(129, 140, 248, 0.07);
        }

        .preview-header {
          background: var(--color-bg-tertiary);
          padding: var(--spacing-sm) var(--spacing-md);
          border-bottom: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .preview-dots {
          display: flex;
          gap: 6px;
        }

        .preview-dots span {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--color-border);
        }

        .preview-dots span:first-child { background: #ef4444; }
        .preview-dots span:nth-child(2) { background: #f59e0b; }
        .preview-dots span:last-child { background: #10b981; }

        .preview-title {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          font-weight: 500;
        }

        .preview-content {
          padding: var(--spacing-lg);
        }

        .preview-draft {
          background: var(--color-bg-tertiary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--spacing-md);
          margin-bottom: var(--spacing-md);
        }

        .draft-label {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--color-accent-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: var(--spacing-sm);
        }

        .draft-text {
          font-size: 0.875rem;
          color: var(--color-text-primary);
          line-height: 1.6;
          margin-bottom: var(--spacing-sm);
        }

        .draft-meta {
          display: flex;
          gap: var(--spacing-sm);
        }

        .draft-pillar {
          font-size: 0.6875rem;
          padding: 2px 8px;
          background: rgba(129, 140, 248, 0.1);
          color: var(--color-accent-secondary);
          border-radius: var(--radius-full);
        }

        .draft-style {
          font-size: 0.6875rem;
          padding: 2px 8px;
          background: rgba(244, 114, 182, 0.1);
          color: var(--color-accent-tertiary);
          border-radius: var(--radius-full);
        }

        .preview-actions-bar {
          display: flex;
          gap: var(--spacing-sm);
        }

        .preview-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          font-size: 0.75rem;
          font-family: var(--font-primary);
          font-weight: 500;
          color: var(--color-text-muted);
          background: var(--color-bg-tertiary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          cursor: default;
          transition: all var(--transition-fast);
        }

        .preview-btn.active {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.3);
          color: var(--color-success);
        }

        /* ---- ANTI SECTION ---- */
        .anti-section {
          padding: var(--spacing-2xl) var(--spacing-xl);
          border-top: 1px solid var(--color-border);
          border-bottom: 1px solid var(--color-border);
          background: linear-gradient(135deg, rgba(129, 140, 248, 0.03) 0%, rgba(244, 114, 182, 0.03) 100%);
        }

        .anti-content {
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
        }

        .anti-badge {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-accent-tertiary);
          margin-bottom: var(--spacing-md);
        }

        .anti-content h2 {
          font-size: 2.25rem;
          margin-bottom: var(--spacing-md);
          letter-spacing: -0.01em;
        }

        .anti-description {
          font-size: 1.0625rem;
          color: var(--color-text-secondary);
          line-height: 1.7;
          margin-bottom: var(--spacing-xl);
          max-width: 640px;
          margin-left: auto;
          margin-right: auto;
        }

        .anti-description strong {
          color: var(--color-text-primary);
        }

        .anti-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-sm) var(--spacing-xl);
          text-align: left;
          max-width: 600px;
          margin: 0 auto;
        }

        .anti-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) 0;
          color: var(--color-text-secondary);
          font-size: 0.9375rem;
        }

        .anti-item svg {
          color: var(--color-success);
          flex-shrink: 0;
        }

        /* ---- FEATURES ---- */
        .features-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 80px var(--spacing-xl);
        }

        .section-header {
          text-align: center;
          margin-bottom: var(--spacing-2xl);
        }

        .section-badge {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-accent-primary);
          margin-bottom: var(--spacing-sm);
        }

        .section-header h2 {
          font-size: 2.25rem;
          margin-bottom: var(--spacing-sm);
          letter-spacing: -0.01em;
        }

        .section-header p {
          font-size: 1.0625rem;
          color: var(--color-text-muted);
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--spacing-lg);
        }

        .feature-card {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-xl);
          transition: all var(--transition-normal);
        }

        .feature-card:hover {
          border-color: rgba(129, 140, 248, 0.3);
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3), 0 0 20px rgba(129, 140, 248, 0.08);
        }

        .feature-icon {
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(129, 140, 248, 0.1);
          border-radius: var(--radius-md);
          color: var(--color-accent-secondary);
          margin-bottom: var(--spacing-md);
        }

        .feature-card h3 {
          font-size: 1.0625rem;
          margin-bottom: var(--spacing-sm);
        }

        .feature-card p {
          font-size: 0.9375rem;
          color: var(--color-text-muted);
          line-height: 1.65;
        }

        /* ---- HOW IT WORKS ---- */
        .how-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 80px var(--spacing-xl);
          border-top: 1px solid var(--color-border);
        }

        .how-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--spacing-lg);
        }

        .how-card {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-xl);
          position: relative;
        }

        .how-step {
          font-size: 3rem;
          font-weight: 800;
          font-family: var(--font-mono);
          background: var(--color-accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          opacity: 0.4;
          margin-bottom: var(--spacing-sm);
          line-height: 1;
        }

        .how-card h3 {
          font-size: 1.125rem;
          margin-bottom: var(--spacing-sm);
        }

        .how-card p {
          font-size: 0.9375rem;
          color: var(--color-text-muted);
          line-height: 1.65;
        }

        /* ---- WHO IT'S FOR ---- */
        .who-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 80px var(--spacing-xl);
          border-top: 1px solid var(--color-border);
        }

        .who-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--spacing-lg);
        }

        .who-card {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-xl) var(--spacing-xl) var(--spacing-lg);
          text-align: center;
          transition: all var(--transition-normal);
        }

        .who-card:hover {
          border-color: rgba(34, 211, 238, 0.3);
          transform: translateY(-3px);
        }

        .who-icon {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(34, 211, 238, 0.08);
          border-radius: var(--radius-lg);
          color: var(--color-accent-primary);
          margin: 0 auto var(--spacing-md);
        }

        .who-card h3 {
          font-size: 1.125rem;
          margin-bottom: var(--spacing-sm);
        }

        .who-card p {
          font-size: 0.9375rem;
          color: var(--color-text-muted);
          line-height: 1.65;
        }

        /* ---- TRUST ---- */
        .trust-section {
          padding: var(--spacing-2xl) var(--spacing-xl);
          border-top: 1px solid var(--color-border);
        }

        .trust-content {
          max-width: 900px;
          margin: 0 auto;
        }

        .trust-stats {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-2xl);
        }

        .trust-stat {
          text-align: center;
        }

        .trust-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin-bottom: 2px;
        }

        .trust-label {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .trust-divider {
          width: 1px;
          height: 48px;
          background: var(--color-border);
        }

        /* ---- CTA ---- */
        .cta-section {
          background: linear-gradient(135deg, rgba(129, 140, 248, 0.05) 0%, rgba(34, 211, 238, 0.05) 100%);
          border-top: 1px solid var(--color-border);
          border-bottom: 1px solid var(--color-border);
          padding: 80px var(--spacing-xl);
        }

        .cta-content {
          max-width: 600px;
          margin: 0 auto;
          text-align: center;
        }

        .cta-content h2 {
          font-size: 2.25rem;
          margin-bottom: var(--spacing-sm);
          letter-spacing: -0.01em;
        }

        .cta-content p {
          font-size: 1.0625rem;
          color: var(--color-text-muted);
          margin-bottom: var(--spacing-lg);
          line-height: 1.7;
        }

        .cta-note {
          display: block;
          margin-top: var(--spacing-md);
          font-size: 0.8125rem;
          color: var(--color-text-muted);
        }

        /* ---- FOOTER ---- */
        .landing-footer {
          padding: var(--spacing-xl) var(--spacing-xl);
          border-top: 1px solid var(--color-border);
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .footer-logo {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          font-weight: 600;
          color: var(--color-text-secondary);
        }

        .footer-logo-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-accent-gradient);
          border-radius: var(--radius-sm);
          color: var(--color-bg-primary);
        }

        .footer-content p {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        /* ---- RESPONSIVE ---- */
        @media (max-width: 1024px) {
          .hero {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .hero-description {
            max-width: none;
          }

          .hero-actions {
            justify-content: center;
          }

          .features-grid,
          .how-grid,
          .who-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .trust-stats {
            flex-direction: column;
            gap: var(--spacing-lg);
          }

          .trust-divider {
            width: 48px;
            height: 1px;
          }
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.25rem;
          }

          .nav-links .nav-link {
            display: none;
          }

          .features-grid,
          .how-grid,
          .who-grid {
            grid-template-columns: 1fr;
          }

          .anti-grid {
            grid-template-columns: 1fr;
          }

          .anti-content h2,
          .section-header h2,
          .cta-content h2 {
            font-size: 1.75rem;
          }

          .footer-content {
            flex-direction: column;
            gap: var(--spacing-md);
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};

export default Landing;
