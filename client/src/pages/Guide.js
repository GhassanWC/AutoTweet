import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiCheckCircle, 
  FiCircle, 
  FiZap, 
  FiArrowRight, 
  FiTarget, 
  FiLayers, 
  FiSliders, 
  FiBookOpen,
  FiTrendingUp,
  FiUser,
  FiActivity
} from 'react-icons/fi';
import { FaXTwitter } from 'react-icons/fa6';
import { brandVoiceAPI, pillarAPI, ruleAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Guide = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [setupState, setSetupState] = useState({
    identity: false,
    pillars: false,
    strategy: false
  });

  useEffect(() => {
    fetchSetupStatus();
  }, []);

  const fetchSetupStatus = async () => {
    try {
      const [voiceRes, pillarsRes, rulesRes] = await Promise.all([
        brandVoiceAPI.get(),
        pillarAPI.getAll(),
        ruleAPI.getAll()
      ]);

      setSetupState({
        identity: !!(voiceRes.data.brandVoice?.accountRole && voiceRes.data.brandVoice?.niche),
        pillars: (pillarsRes.data.pillars?.length || 0) > 0,
        strategy: (rulesRes.data.rules?.length || 0) > 0
      });
    } catch (err) {
      console.error('Error fetching setup status:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    const total = 3;
    const completed = Object.values(setupState).filter(Boolean).length;
    return Math.round((completed / total) * 100);
  };

  const getNextAction = () => {
    if (!setupState.identity) return { label: 'Connect your voice', path: '/workspace?tab=identity' };
    if (!setupState.pillars) return { label: 'Define your topics', path: '/workspace?tab=pillars' };
    if (!setupState.strategy) return { label: 'Set your rules', path: '/rules' };
    return { label: 'Create your first post', path: '/workspace?tab=generate' };
  };

  const progress = calculateProgress();
  const nextAction = getNextAction();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="guide-page animate-fade-in">
      {/* 1. Dynamic Header CTA */}
      <div className="guide-banner">
        <div className="banner-content">
          <div className="progress-section">
            <div className="progress-info">
              <span className="progress-label">Profile setup {progress}% complete</span>
              <span className="progress-value">{progress}/100</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="banner-cta">
            <h2>{progress === 100 ? 'Ready to grow?' : 'Lets finish your setup'}</h2>
            <button 
              className="btn btn-primary btn-lg" 
              onClick={() => navigate(nextAction.path)}
            >
              {progress === 100 ? 'Create high-performing post' : nextAction.label}
              <FiArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="guide-grid">
        <div className="guide-main">
          {/* 2. Interactive Checklist */}
          <section className="guide-section">
            <div className="section-header">
              <FiActivity className="text-cyan" />
              <h2>Setup Checklist</h2>
            </div>
            <div className="checklist-items">
              <div 
                className={`checklist-item ${setupState.identity ? 'completed' : ''}`}
                onClick={() => navigate('/workspace?tab=identity')}
              >
                {setupState.identity ? <FiCheckCircle className="text-success" /> : <FiCircle />}
                <div className="item-info">
                  <h3>Tell AutoTweet how you think</h3>
                  <p>Define your role and tone so posts sound like you, not a bot.</p>
                </div>
                <FiArrowRight className="item-arrow" />
              </div>

              <div 
                className={`checklist-item ${setupState.pillars ? 'completed' : ''}`}
                onClick={() => navigate('/workspace?tab=pillars')}
              >
                {setupState.pillars ? <FiCheckCircle className="text-success" /> : <FiCircle />}
                <div className="item-info">
                  <h3>Set your core content topics</h3>
                  <p>Define 3-5 pillars so your audience knows what to expect.</p>
                </div>
                <FiArrowRight className="item-arrow" />
              </div>

              <div 
                className={`checklist-item ${setupState.strategy ? 'completed' : ''}`}
                onClick={() => navigate('/rules')}
              >
                {setupState.strategy ? <FiCheckCircle className="text-success" /> : <FiCircle />}
                <div className="item-info">
                  <h3>Add your specific rules</h3>
                  <p>Set guardrails to keep the AI on track and avoid generic talk.</p>
                </div>
                <FiArrowRight className="item-arrow" />
              </div>
            </div>
          </section>

          {/* 3. Action Cards */}
          <section className="guide-section">
            <div className="section-header">
              <FiZap className="text-purple" />
              <h2>Action Hub</h2>
            </div>
            <div className="action-cards">
              <div className="action-card" onClick={() => navigate('/workspace?tab=generate')}>
                <div className="card-icon purple"><FiZap /></div>
                <div className="card-body">
                  <h3>Next high-impact post</h3>
                  <p>Generate ideas or threads in seconds.</p>
                </div>
              </div>
              <div className="action-card" onClick={() => navigate('/schedule')}>
                <div className="card-icon pink"><FiTrendingUp /></div>
                <div className="card-body">
                  <h3>Keep your feed alive</h3>
                  <p>Review and manage your queue.</p>
                </div>
              </div>
              <div className="action-card" onClick={() => navigate('/dashboard')}>
                <div className="card-icon cyan"><FiTarget /></div>
                <div className="card-body">
                  <h3>Track your growth</h3>
                  <p>See what resonates with your audience.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="guide-sidebar">
          {/* 4. Live Preview */}
          <section className="guide-section preview-section">
            <div className="section-header">
              <FiBookOpen className="text-pink" />
              <h2>Output Preview</h2>
            </div>
            <p className="sidebar-hint">This is what a high-performing "Insight" post looks like when your setup is dialed in:</p>
            <div className="live-preview-box">
              <div className="preview-tweet">
                <div className="tweet-header">
                  <div className="tweet-avatar" />
                  <div className="tweet-user">
                    <span className="tw-name">You</span>
                    <span className="tw-handle">@yourhandle</span>
                  </div>
                  <FaXTwitter className="tw-logo" />
                </div>
                <div className="tweet-content">
                  Most founders overthink their first post.
                  <br /><br />
                  The real hack? Just start. Share one lesson from this week.
                  <br /><br />
                  Your audience doesn't need perfection — they need perspective. 💡
                </div>
                <div className="tweet-footer">
                  <span>9:41 AM · Apr 23, 2026</span>
                </div>
              </div>
            </div>
          </section>

          {/* 5. Recommended Next Step */}
          <div className="next-step-box">
            <h3>Recommended next:</h3>
            <div className="next-step-card" onClick={() => navigate(nextAction.path)}>
              <span className="step-label">DO THIS NOW</span>
              <h4>{nextAction.label}</h4>
              <p>Critical for getting the most out of our AI engine.</p>
              <FiArrowRight size={18} />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .guide-page { max-width: 1200px; margin: 0 auto; color: var(--color-text-primary); }

        /* Banner */
        .guide-banner { 
          background: var(--color-bg-card); 
          border: 1px solid var(--color-border); 
          border-radius: var(--radius-xl); 
          padding: var(--spacing-xl);
          margin-bottom: var(--spacing-xl);
          background: linear-gradient(135deg, var(--color-bg-card) 0%, var(--color-bg-tertiary) 100%);
          position: relative;
          overflow: hidden;
        }
        .guide-banner::after {
          content: ''; position: absolute; top: -50%; right: -10%; width: 300px; height: 300px;
          background: radial-gradient(circle, var(--color-accent-primary) 0%, transparent 70%);
          opacity: 0.1; filter: blur(40px); pointer-events: none;
        }
        .banner-content { display: flex; justify-content: space-between; align-items: center; gap: var(--spacing-2xl); }
        .progress-section { flex: 1; max-width: 400px; }
        .progress-info { display: flex; justify-content: space-between; margin-bottom: var(--spacing-sm); font-size: 0.875rem; }
        .progress-label { font-weight: 600; color: var(--color-text-primary); }
        .progress-value { font-family: var(--font-mono); color: var(--color-accent-primary); }
        .progress-bar-bg { height: 8px; background: var(--color-bg-primary); border-radius: var(--radius-full); overflow: hidden; }
        .progress-bar-fill { height: 100%; background: var(--color-accent-primary); transition: width 0.5s ease; box-shadow: var(--shadow-glow); }
        .banner-cta { text-align: right; }
        .banner-cta h2 { font-size: 1.5rem; margin-bottom: var(--spacing-sm); letter-spacing: -0.02em; }

        /* Layout */
        .guide-grid { display: grid; grid-template-columns: 1fr 340px; gap: var(--spacing-xl); }
        .guide-section { 
          background: var(--color-bg-card); border: 1px solid var(--color-border); 
          border-radius: var(--radius-xl); padding: var(--spacing-xl); margin-bottom: var(--spacing-xl); 
        }
        .section-header { display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-lg); }
        .section-header h2 { font-size: 1.25rem; margin: 0; }

        /* Checklist */
        .checklist-items { display: flex; flex-direction: column; gap: var(--spacing-md); }
        .checklist-item { 
          display: flex; align-items: center; gap: var(--spacing-md); padding: var(--spacing-md); 
          background: var(--color-bg-tertiary); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .checklist-item:hover { border-color: var(--color-border-light); transform: translateX(5px); background: var(--color-bg-hover); }
        .checklist-item.completed { border-color: rgba(16, 185, 129, 0.2); }
        .checklist-item svg:first-child { font-size: 1.5rem; color: var(--color-text-secondary); flex-shrink: 0; }
        .checklist-item.completed svg:first-child { color: var(--color-success); }
        .item-info { flex: 1; }
        .item-info h3 { font-size: 1rem; margin-bottom: 2px; color: var(--color-text-primary); }
        .item-info p { font-size: 0.8125rem; color: var(--color-text-secondary); margin: 0; }
        .item-arrow { color: var(--color-text-muted); opacity: 0; transition: opacity 0.2s; }
        .checklist-item:hover .item-arrow { opacity: 1; }

        /* Action Cards */
        .action-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-md); }
        .action-card { 
          background: var(--color-bg-tertiary); border: 1px solid var(--color-border); border-radius: var(--radius-lg); 
          padding: var(--spacing-md); cursor: pointer; transition: all var(--transition-fast); text-align: center;
        }
        .action-card:hover { transform: translateY(-4px); border-color: var(--color-accent-primary); box-shadow: var(--shadow-md); }
        .card-icon { width: 44px; height: 44px; margin: 0 auto var(--spacing-md); border-radius: var(--radius-md); 
          display: flex; align-items: center; justify-content: center; font-size: 1.25rem; }
        .card-icon.purple { background: rgba(129, 140, 248, 0.15); color: var(--color-accent-secondary); }
        .card-icon.pink { background: rgba(244, 114, 182, 0.15); color: var(--color-accent-tertiary); }
        .card-icon.cyan { background: rgba(34, 211, 238, 0.15); color: var(--color-accent-primary); }
        .card-body h3 { font-size: 0.9375rem; margin-bottom: 4px; color: var(--color-text-primary); }
        .card-body p { font-size: 0.75rem; color: var(--color-text-secondary); margin: 0; }

        /* Sidebar & Preview */
        .sidebar-hint { font-size: 0.8125rem; color: var(--color-text-secondary); margin-bottom: var(--spacing-md); }
        .live-preview-box { background: var(--color-bg-primary); border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--color-border); }
        .preview-tweet { padding: var(--spacing-md); }
        .tweet-header { display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm); }
        .tweet-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--color-bg-tertiary); border: 1px solid var(--color-border); }
        .tweet-user { flex: 1; display: flex; flex-direction: column; line-height: 1.2; }
        .tw-name { font-size: 0.8125rem; font-weight: 700; color: var(--color-text-primary); }
        .tw-handle { font-size: 0.75rem; color: var(--color-text-muted); }
        .tw-logo { color: var(--color-text-muted); font-size: 0.875rem; }
        .tweet-content { font-size: 0.875rem; line-height: 1.5; color: var(--color-text-primary); margin-bottom: var(--spacing-md); }
        .tweet-footer { font-size: 0.75rem; color: var(--color-text-muted); }

        .next-step-box { margin-top: var(--spacing-xl); }
        .next-step-box h3 { font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-secondary); margin-bottom: var(--spacing-sm); }
        .next-step-card { 
          background: var(--color-accent-gradient); padding: var(--spacing-lg); border-radius: var(--radius-lg); 
          color: #0a0e17; cursor: pointer; transition: all var(--transition-fast); position: relative;
        }
        .next-step-card:hover { transform: scale(1.02); box-shadow: var(--shadow-glow); }
        .step-label { font-size: 0.6875rem; font-weight: 800; color: rgba(10, 14, 23, 0.7); }
        .next-step-card h4 { font-size: 1.125rem; margin: 4px 0; font-weight: 700; color: #0a0e17; }
        .next-step-card p { font-size: 0.8125rem; margin: 0; color: rgba(10, 14, 23, 0.8); }
        .next-step-card svg { position: absolute; top: var(--spacing-lg); right: var(--spacing-lg); color: #0a0e17; }

        .text-cyan { color: var(--color-accent-primary); }
        .text-purple { color: var(--color-accent-secondary); }
        .text-pink { color: var(--color-accent-tertiary); }
        .text-success { color: var(--color-success); }

        @media (max-width: 1024px) {
          .guide-grid { grid-template-columns: 1fr; }
          .banner-content { flex-direction: column; text-align: center; }
          .banner-cta { text-align: center; margin-top: var(--spacing-md); }
          .progress-section { max-width: 100%; }
        }
        @media (max-width: 768px) {
          .action-cards { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default Guide;
