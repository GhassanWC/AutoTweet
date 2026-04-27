import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiKey, FiCheck, FiEye, FiEyeOff, FiExternalLink,
  FiShield, FiZap, FiImage, FiArrowRight, FiAlertCircle, FiLock
} from 'react-icons/fi';
import { apiKeysAPI } from '../services/api';
import { useAuth } from '../App';

/* ─────────────────────────── helpers ─────────────────────────── */
const GROUPS = [
  {
    id: 'twitter',
    icon: '𝕏',
    label: 'X / Twitter API',
    subtitle: 'Required — needed to upload images with tweets',
    required: true,
    docsUrl: 'https://developer.twitter.com/en/portal/dashboard',
    docsLabel: 'Twitter Developer Portal',
    color: '#1d9bf0',
    fields: [
      { key: 'twitterApiKey',              label: 'API Key (Consumer Key)',          placeholder: 'xxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'twitterApiSecret',           label: 'API Key Secret (Consumer Secret)', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'twitterAccessToken',         label: 'Access Token',                   placeholder: 'xxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'twitterAccessTokenSecret',   label: 'Access Token Secret',            placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
    ],
    steps: [
      'Go to the Twitter Developer Portal',
      'Open your app → "Keys and Tokens"',
      'Copy Consumer Keys: API Key & API Key Secret',
      'Generate & copy Access Token & Secret',
    ],
  },
  {
    id: 'openai',
    icon: '⬡',
    label: 'OpenAI',
    subtitle: 'Optional — enables AI text + DALL-E image generation',
    required: false,
    docsUrl: 'https://platform.openai.com/api-keys',
    docsLabel: 'OpenAI Platform',
    color: '#10b981',
    fields: [
      { key: 'openaiApiKey', label: 'API Key', placeholder: 'sk-proj-...' },
    ],
    steps: [
      'Go to platform.openai.com/api-keys',
      'Click "+ Create new secret key"',
      'Copy and paste the key here',
    ],
  },
  {
    id: 'gemini',
    icon: '✦',
    label: 'Google Gemini',
    subtitle: 'Optional — enables Gemini text & Imagen image generation',
    required: false,
    docsUrl: 'https://aistudio.google.com/app/apikey',
    docsLabel: 'Google AI Studio',
    color: '#8b5cf6',
    fields: [
      { key: 'geminiApiKey', label: 'API Key', placeholder: 'AIza...' },
    ],
    steps: [
      'Go to aistudio.google.com/app/apikey',
      'Click "Create API Key"',
      'Copy and paste the key here',
    ],
  },
];

/* ─────────────────────────── SecretInput ─────────────────────── */
const SecretInput = ({ value, onChange, placeholder, disabled }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="secret-input-wrap">
      <input
        type={show ? 'text' : 'password'}
        className="form-input secret-input"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
      />
      <button
        type="button"
        className="secret-toggle"
        onClick={() => setShow(s => !s)}
        tabIndex={-1}
        title={show ? 'Hide' : 'Show'}
      >
        {show ? <FiEyeOff size={15} /> : <FiEye size={15} />}
      </button>
    </div>
  );
};

/* ─────────────────────────── Main Page ──────────────────────── */
const ApiKeysSetup = ({ enforced = false }) => {
  const navigate = useNavigate();
  const { user, setSetupComplete } = useAuth();

  const [values, setValues]         = useState({});
  const [status, setStatus]         = useState({});
  const [saving, setSaving]         = useState(false);
  const [loading, setLoading]       = useState(true);
  const [testing, setTesting]       = useState(false);
  const [testResult, setTestResult] = useState(null); // {valid, message, error, hint}
  const [activeGroup, setActiveGroup] = useState('twitter');
  const [expandedStep, setExpandedStep] = useState(null);

  useEffect(() => {
    apiKeysAPI.get()
      .then(res => {
        if (res.data.success) {
          // Pre-fill with masked values so user sees ••• for saved keys
          setValues(res.data.apiKeys || {});
          setStatus(res.data.status || {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key, val) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async (groupId) => {
    const group = GROUPS.find(g => g.id === groupId);
    const payload = {};
    group.fields.forEach(f => {
      const v = values[f.key];
      // Only send if value is not a masked placeholder
      if (v && !v.startsWith('••')) payload[f.key] = v;
    });

    if (Object.keys(payload).length === 0) {
      toast.info('No new values to save.');
      return;
    }

    setSaving(groupId);
    try {
      const res = await apiKeysAPI.save(payload);
      if (res.data.success) {
        setStatus(res.data.status);
        toast.success(`${group.label} keys saved!`);

        // Update the global setup gate if Twitter is now configured
        if (res.data.status?.twitterConfigured) {
          setSetupComplete(true);
        }

        // Re-fetch to get masked values
        const fresh = await apiKeysAPI.get();
        if (fresh.data.success) {
          setValues(fresh.data.apiKeys);
          setStatus(fresh.data.status);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save keys');
    } finally {
      setSaving(null);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiKeysAPI.testTwitter();
      setTestResult(res.data);
    } catch (err) {
      setTestResult({ valid: false, error: err.response?.data?.error || err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleContinue = () => {
    if (!status.twitterConfigured) {
      toast.error('Please add your X / Twitter API keys to continue.');
      setActiveGroup('twitter');
      return;
    }
    // Unlock the global route gate before navigating
    setSetupComplete(true);
    navigate('/dashboard');
  };

  const isGroupDone = (groupId) => {
    if (groupId === 'twitter') return status.twitterConfigured;
    if (groupId === 'openai')  return status.openaiConfigured;
    if (groupId === 'gemini')  return status.geminiConfigured;
    return false;
  };

  const allRequiredDone = status.twitterConfigured;

  if (loading) {
    return (
      <div style={{ padding: '24px 20px', animation: 'skFadeIn 0.2s ease' }}>

        {/* ── Hero skeleton ── */}
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '14px 14px 0 0',
          padding: '24px 28px 20px',
          marginBottom: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div className="sk2" style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="sk2" style={{ width: 220, height: 20, borderRadius: 6 }} />
              <div className="sk2" style={{ width: 340, height: 13, borderRadius: 6 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[100, 90, 110].map((w, i) => (
              <div key={i} className="sk2" style={{ width: w, height: 28, borderRadius: 999 }} />
            ))}
          </div>
        </div>

        {/* ── Body skeleton ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '200px 1fr',
          gap: 0,
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderTop: 'none',
          borderRadius: '0 0 14px 14px',
          overflow: 'hidden',
        }}>

          {/* Left nav */}
          <div style={{
            borderRight: '1px solid var(--color-border)',
            padding: '20px 16px',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px' }}>
                <div className="sk2" style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                  <div className="sk2" style={{ width: '70%', height: 12, borderRadius: 4 }} />
                  <div className="sk2" style={{ width: '50%', height: 10, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Right panel */}
          <div style={{ padding: '28px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Panel header */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div className="sk2" style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="sk2" style={{ width: 160, height: 18, borderRadius: 6 }} />
                <div className="sk2" style={{ width: 260, height: 12, borderRadius: 6 }} />
              </div>
              <div className="sk2" style={{ width: 90, height: 28, borderRadius: 999, marginLeft: 'auto' }} />
            </div>

            {/* How-to box */}
            <div style={{
              background: 'var(--color-bg-tertiary)',
              borderRadius: 10,
              padding: '16px 18px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div className="sk2" style={{ width: 160, height: 12, borderRadius: 4 }} />
                <div className="sk2" style={{ width: 100, height: 12, borderRadius: 4 }} />
              </div>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div className="sk2" style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0 }} />
                  <div className="sk2" style={{ width: `${55 + i * 10}%`, height: 11, borderRadius: 4 }} />
                </div>
              ))}
            </div>

            {/* Input fields */}
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div className="sk2" style={{ width: 120 + i * 12, height: 11, borderRadius: 4 }} />
                <div className="sk2" style={{ width: '100%', height: 42, borderRadius: 8 }} />
              </div>
            ))}

            {/* Save button */}
            <div className="sk2" style={{ width: 148, height: 42, borderRadius: 8 }} />
          </div>
        </div>

        <style>{`
          @keyframes skFadeIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes sk2Shimmer {
            0%   { background-position: -500px 0 }
            100% { background-position:  500px 0 }
          }
          .sk2 {
            background: linear-gradient(
              90deg,
              var(--color-bg-tertiary) 25%,
              var(--color-bg-hover, rgba(255,255,255,0.04)) 50%,
              var(--color-bg-tertiary) 75%
            );
            background-size: 500px 100%;
            animation: sk2Shimmer 1.5s infinite linear;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="setup-page">
      {/* ── Header ── */}
      <div className="setup-hero">
        <div className="setup-hero-inner">
          <div className="setup-logo">
            <FiKey size={28} />
          </div>
          <div>
            <h1 className="setup-title">
              {enforced ? 'One more step before you start' : 'API Keys Setup'}
            </h1>
            <p className="setup-sub">
              {enforced
                ? 'AutoTweet needs your API keys to post on X and generate AI content. Your keys are stored securely and never shared.'
                : 'Manage the API keys that power AutoTweet. Keys are encrypted and stored only for your account.'}
            </p>
          </div>
        </div>
        {/* Progress pills */}
        <div className="setup-progress">
          {GROUPS.map(g => (
            <div
              key={g.id}
              className={`progress-pill ${isGroupDone(g.id) ? 'done' : ''} ${g.required ? 'required' : ''}`}
              onClick={() => setActiveGroup(g.id)}
            >
              <span className="pill-icon">
                {isGroupDone(g.id) ? <FiCheck size={13} /> : <span>{g.icon}</span>}
              </span>
              <span>{g.label}</span>
              {g.required && !isGroupDone(g.id) && <span className="pill-req">required</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="setup-body">
        {/* Sidebar nav */}
        <nav className="setup-nav">
          {GROUPS.map(g => (
            <button
              key={g.id}
              className={`setup-nav-item ${activeGroup === g.id ? 'active' : ''} ${isGroupDone(g.id) ? 'done' : ''}`}
              onClick={() => setActiveGroup(g.id)}
              style={{ '--accent': g.color }}
            >
              <span className="nav-icon">{isGroupDone(g.id) ? <FiCheck size={16} /> : g.icon}</span>
              <div className="nav-labels">
                <span className="nav-label">{g.label}</span>
                <span className="nav-status">{isGroupDone(g.id) ? 'Configured ✓' : g.required ? 'Required' : 'Optional'}</span>
              </div>
            </button>
          ))}

          {/* Security note */}
          <div className="security-note">
            <FiShield size={14} />
            <span>Keys are stored encrypted in your account. We never expose raw values.</span>
          </div>
        </nav>

        {/* Active group panel */}
        {GROUPS.map(g => g.id === activeGroup && (
          <div key={g.id} className="setup-panel" style={{ '--accent': g.color }}>
            {/* Panel header */}
            <div className="panel-header">
              <div className="panel-icon" style={{ background: `${g.color}18`, color: g.color }}>
                {g.icon}
              </div>
              <div>
                <h2 className="panel-title">{g.label}</h2>
                <p className="panel-sub">{g.subtitle}</p>
              </div>
              {isGroupDone(g.id) && (
                <div className="panel-badge done">
                  <FiCheck size={14} /> Configured
                </div>
              )}
              {g.required && !isGroupDone(g.id) && (
                <div className="panel-badge required">
                  <FiAlertCircle size={14} /> Required
                </div>
              )}
            </div>

            {/* How to get keys */}
            <div className="how-to">
              <div className="how-to-header">
                <span>How to get your {g.label} keys</span>
                <a href={g.docsUrl} target="_blank" rel="noreferrer" className="docs-link">
                  {g.docsLabel} <FiExternalLink size={12} />
                </a>
              </div>
              <ol className="how-to-steps">
                {g.steps.map((step, i) => (
                  <li key={i} className="how-to-step">
                    <span className="step-num">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Fields */}
            <div className="panel-fields">
              {g.fields.map(f => (
                <div key={f.key} className="form-group">
                  <label className="form-label">
                    <FiLock size={12} /> {f.label}
                  </label>
                  <SecretInput
                    value={values[f.key] || ''}
                    onChange={e => handleChange(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    disabled={saving === g.id}
                  />
                </div>
              ))}
            </div>

            {/* Save button + test button for Twitter */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-save"
                onClick={() => handleSave(g.id)}
                disabled={saving === g.id}
                style={{ '--accent': g.color, '--accent-dim': `${g.color}22` }}
              >
                {saving === g.id
                  ? 'Saving...'
                  : isGroupDone(g.id)
                    ? `Update ${g.label} Keys`
                    : `Save ${g.label} Keys`}
              </button>

              {/* Test connection button — only for Twitter */}
              {g.id === 'twitter' && isGroupDone(g.id) && (
                <button
                  className="btn btn-test"
                  onClick={handleTest}
                  disabled={testing}
                  title="Verify your OAuth 1.0a keys actually work with Twitter"
                >
                  {testing ? 'Testing...' : '⚡ Test Connection'}
                </button>
              )}
            </div>

            {/* Test result banner */}
            {g.id === 'twitter' && testResult && (
              <div className={`test-result ${testResult.valid ? 'ok' : 'fail'}`}>
                <div className="test-result-main">
                  <span>{testResult.valid ? '✓' : '✗'}</span>
                  <span>{testResult.valid ? testResult.message : testResult.error}</span>
                </div>
                {testResult.hint && (
                  <p className="test-result-hint">{testResult.hint}</p>
                )}
              </div>
            )}

            {/* Skip link for optional */}
            {!g.required && (
              <p className="skip-note">
                You can skip this for now and add it later in Settings.
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── Footer CTA ── */}
      {enforced && (
        <div className="setup-footer">
          <div className={`footer-status ${allRequiredDone ? 'ready' : 'blocked'}`}>
            {allRequiredDone
              ? <><FiCheck size={16} /> X / Twitter keys configured — you're ready to go!</>
              : <><FiAlertCircle size={16} /> Add your X / Twitter API keys to continue</>}
          </div>
          <button
            className="btn btn-continue"
            onClick={handleContinue}
            disabled={!allRequiredDone}
          >
            Continue to Dashboard <FiArrowRight size={18} />
          </button>
        </div>
      )}

      {/* ── Inline styles ── */}
      <style>{`
        .setup-page {
          background: var(--color-bg-primary);
          display: flex;
          flex-direction: column;
          font-family: var(--font-sans, 'Inter', sans-serif);
          animation: fadeIn 0.25s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; } }

        /* HERO */
        .setup-hero {
          background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
          border-bottom: 1px solid var(--color-border);
          padding: 28px 32px 20px;
          border-radius: var(--radius-lg, 12px) var(--radius-lg, 12px) 0 0;
        }
        .setup-hero-inner {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 28px;
        }
        .setup-logo {
          width: 52px; height: 52px; border-radius: 14px;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          font-size: 1.4rem;
        }
        .setup-title {
          font-size: 1.625rem; font-weight: 700; margin: 0 0 6px;
          color: var(--color-text-primary);
        }
        .setup-sub {
          font-size: 0.9375rem; color: var(--color-text-muted); margin: 0;
          max-width: 560px; line-height: 1.55;
        }
        /* progress pills */
        .setup-progress {
          display: flex; gap: 10px; flex-wrap: wrap;
        }
        .progress-pill {
          display: flex; align-items: center; gap: 7px;
          padding: 6px 14px; border-radius: 999px;
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          font-size: 0.8125rem; font-weight: 500;
          color: var(--color-text-secondary);
          cursor: pointer; transition: all 0.2s;
        }
        .progress-pill:hover { border-color: var(--color-border-light); }
        .progress-pill.done {
          background: rgba(16,185,129,0.1);
          border-color: rgba(16,185,129,0.4);
          color: #10b981;
        }
        .progress-pill.required:not(.done) {
          border-color: rgba(99,102,241,0.4);
          color: var(--color-accent-secondary);
        }
        .pill-icon { display: flex; align-items: center; font-size: 0.875rem; }
        .pill-req {
          font-size: 0.625rem; font-weight: 700;
          background: rgba(99,102,241,0.15); color: #818cf8;
          padding: 2px 6px; border-radius: 999px; text-transform: uppercase;
        }

        /* BODY */
        .setup-body {
          flex: 1; display: grid;
          grid-template-columns: 220px 1fr;
          gap: 0; max-width: 860px; margin: 28px auto; width: 100%;
          padding: 0 16px;
        }

        /* NAV */
        .setup-nav {
          padding-right: 28px;
          display: flex; flex-direction: column; gap: 6px;
        }
        .setup-nav-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; border-radius: 12px;
          background: none; border: 1px solid transparent;
          cursor: pointer; transition: all 0.2s; text-align: left; width: 100%;
          color: var(--color-text-secondary);
        }
        .setup-nav-item:hover { background: var(--color-bg-card); border-color: var(--color-border); }
        .setup-nav-item.active {
          background: var(--color-bg-card);
          border-color: var(--accent, #6366f1);
          box-shadow: 0 0 0 1px var(--accent, #6366f1)18;
        }
        .setup-nav-item.done .nav-icon { color: #10b981; }
        .nav-icon {
          width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
          font-size: 1rem; border-radius: 8px;
          background: var(--color-bg-tertiary);
          flex-shrink: 0;
        }
        .setup-nav-item.active .nav-icon {
          background: color-mix(in srgb, var(--accent, #6366f1) 15%, transparent);
          color: var(--accent, #6366f1);
        }
        .nav-labels { display: flex; flex-direction: column; }
        .nav-label { font-size: 0.875rem; font-weight: 600; color: var(--color-text-primary); }
        .nav-status { font-size: 0.75rem; color: var(--color-text-muted); }
        .setup-nav-item.done .nav-status { color: #10b981; }
        .security-note {
          display: flex; align-items: flex-start; gap: 8px;
          margin-top: 20px; padding: 12px;
          background: rgba(99,102,241,0.05);
          border: 1px solid rgba(99,102,241,0.15);
          border-radius: 10px;
          font-size: 0.75rem; color: var(--color-text-muted); line-height: 1.5;
        }

        /* PANEL */
        .setup-panel {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: 18px; padding: 36px;
          display: flex; flex-direction: column; gap: 28px;
        }
        .panel-header {
          display: flex; align-items: flex-start; gap: 16px;
        }
        .panel-icon {
          width: 48px; height: 48px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.375rem; flex-shrink: 0; font-weight: 700;
        }
        .panel-title { font-size: 1.25rem; font-weight: 700; margin: 0 0 4px; color: var(--color-text-primary); }
        .panel-sub { font-size: 0.875rem; color: var(--color-text-muted); margin: 0; }
        .panel-badge {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: 999px;
          font-size: 0.75rem; font-weight: 600;
          margin-left: auto; white-space: nowrap; flex-shrink: 0;
        }
        .panel-badge.done { background: rgba(16,185,129,0.12); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }
        .panel-badge.required { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.25); }

        /* HOW-TO */
        .how-to {
          background: var(--color-bg-tertiary);
          border: 1px solid var(--color-border);
          border-radius: 12px; padding: 18px 20px;
        }
        .how-to-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 14px; font-size: 0.8125rem; font-weight: 600;
          color: var(--color-text-secondary);
        }
        .docs-link {
          display: flex; align-items: center; gap: 5px;
          font-size: 0.75rem; color: var(--accent, #6366f1);
          text-decoration: none; transition: opacity 0.15s;
        }
        .docs-link:hover { opacity: 0.75; }
        .how-to-steps { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 9px; }
        .how-to-step {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 0.8125rem; color: var(--color-text-secondary);
        }
        .step-num {
          width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
          background: color-mix(in srgb, var(--accent, #6366f1) 18%, transparent);
          color: var(--accent, #6366f1);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.625rem; font-weight: 700;
        }

        /* FIELDS */
        .panel-fields { display: flex; flex-direction: column; gap: 18px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.8125rem; font-weight: 600; color: var(--color-text-secondary);
        }
        .secret-input-wrap { position: relative; }
        .secret-input {
          width: 100%; padding: 10px 42px 10px 14px; font-size: 0.9375rem;
          background: var(--color-bg-tertiary); border: 1px solid var(--color-border);
          border-radius: 10px; color: var(--color-text-primary);
          font-family: 'Menlo', 'Courier New', monospace;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .secret-input:focus {
          outline: none;
          border-color: var(--accent, #6366f1);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent, #6366f1) 15%, transparent);
        }
        .secret-toggle {
          position: absolute; top: 50%; right: 12px; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: var(--color-text-muted); display: flex; align-items: center;
        }
        .secret-toggle:hover { color: var(--color-text-primary); }

        /* BUTTONS */
        .btn-save {
          display: flex; align-items: center; justify-content: center;
          padding: 12px 28px; border-radius: 10px; font-size: 0.9375rem; font-weight: 600;
          background: color-mix(in srgb, var(--accent, #6366f1) 12%, transparent);
          color: var(--accent, #6366f1);
          border: 1.5px solid var(--accent, #6366f1);
          cursor: pointer; transition: all 0.2s; align-self: flex-start;
        }
        .btn-save:hover:not(:disabled) {
          background: var(--accent, #6366f1); color: #fff;
        }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-test {
          display: flex; align-items: center; gap: 7px;
          padding: 11px 22px; border-radius: 10px; font-size: 0.9rem; font-weight: 600;
          background: rgba(16,185,129,0.08); color: #10b981;
          border: 1.5px solid rgba(16,185,129,0.4);
          cursor: pointer; transition: all 0.2s;
        }
        .btn-test:hover:not(:disabled) { background: #10b981; color: #fff; }
        .btn-test:disabled { opacity: 0.5; cursor: not-allowed; }

        .test-result {
          border-radius: 10px; padding: 14px 16px;
          font-size: 0.875rem; font-weight: 500;
          animation: fadeIn 0.2s ease;
        }
        .test-result.ok {
          background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: #10b981;
        }
        .test-result.fail {
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.3); color: #ef4444;
        }
        .test-result-main { display: flex; align-items: flex-start; gap: 10px; font-weight: 600; }
        .test-result-hint {
          margin: 8px 0 0; font-size: 0.8125rem; font-weight: 400; line-height: 1.5;
          color: var(--color-text-secondary); padding-left: 22px;
        }

        .skip-note { font-size: 0.8125rem; color: var(--color-text-muted); margin: -8px 0 0; }

        /* FOOTER */
        .setup-footer {
          border-top: 1px solid var(--color-border);
          background: var(--color-bg-secondary);
          padding: 18px 32px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px;
          border-radius: 0 0 var(--radius-lg, 12px) var(--radius-lg, 12px);
          margin-bottom: 28px;
        }
        .footer-status {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.9375rem; font-weight: 500;
        }
        .footer-status.ready { color: #10b981; }
        .footer-status.blocked { color: var(--color-text-muted); }
        .btn-continue {
          display: flex; align-items: center; gap: 10px;
          padding: 13px 32px; border-radius: 12px;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          color: #fff; border: none; font-size: 1rem; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 4px 16px rgba(99,102,241,0.35);
        }
        .btn-continue:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(99,102,241,0.45);
        }
        .btn-continue:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

        /* LOADING */
        .setup-loading {
          min-height: 100vh; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 16px;
          color: var(--color-text-muted);
        }
        .setup-spinner {
          width: 36px; height: 36px; border-radius: 50%;
          border: 3px solid var(--color-border);
          border-top-color: #6366f1;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .setup-hero { padding: 24px 20px 20px; }
          .setup-body {
            grid-template-columns: 1fr;
            margin: 20px auto; padding: 0 16px;
          }
          .setup-nav { flex-direction: row; overflow-x: auto; padding: 0 0 12px; }
          .setup-nav-item { flex-shrink: 0; }
          .setup-panel { padding: 24px 20px; }
          .setup-footer { flex-direction: column; padding: 20px; }
          .btn-continue { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
};

export default ApiKeysSetup;
