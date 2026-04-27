import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiUser, FiSave, FiPlus, FiX, FiCheckCircle, FiTarget, FiMessageCircle } from 'react-icons/fi';
import { brandVoiceAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const ROLE_PRESETS = [
  { value: 'Founder building in public', label: 'Founder / Builder' },
  { value: 'Design creator sharing process and ideas', label: 'Design Creator' },
  { value: 'Agency sharing expert industry insights', label: 'Agency' },
  { value: 'Product marketing — positioning and messaging', label: 'Product Marketing' },
  { value: 'Educational creator — making complex topics accessible', label: 'Educator / Coach' },
];

const GOAL_PRESETS = [
  'Grow followers and build audience',
  'Drive traffic to my product or website',
  'Build thought leadership in my niche',
  'Generate leads and DM conversations',
  'Build a personal brand for career opportunities',
];

const BrandVoice = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    accountRole: '',
    accountGoals: '',
    growthStage: 'early',
    postingStyle: '',
    platformNotes: '',
    niche: '',
    audience: '',
    tone: '',
    personality: '',
    avoidTopics: '',
    examplePosts: [''],
  });

  useEffect(() => { fetchVoice(); }, []);

  const fetchVoice = async () => {
    try {
      const res = await brandVoiceAPI.get();
      if (res.data.success && res.data.brandVoice) {
        const v = res.data.brandVoice;
        setForm({
          accountRole: v.accountRole || '',
          accountGoals: v.accountGoals || '',
          growthStage: v.growthStage || 'early',
          postingStyle: v.postingStyle || '',
          platformNotes: v.platformNotes || '',
          niche: v.niche || '',
          audience: v.audience || '',
          tone: v.tone || '',
          personality: v.personality || '',
          avoidTopics: v.avoidTopics || '',
          examplePosts: v.examplePosts?.length > 0 ? v.examplePosts : [''],
        });
      }
    } catch (err) {
      toast.error('Failed to load account identity');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await brandVoiceAPI.save({
        ...form,
        examplePosts: form.examplePosts.filter(p => p.trim()),
      });
      toast.success('Account identity saved');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addExample = () => {
    if (form.examplePosts.length < 5) {
      setForm({ ...form, examplePosts: [...form.examplePosts, ''] });
    }
  };

  const removeExample = (i) => {
    const updated = form.examplePosts.filter((_, idx) => idx !== i);
    setForm({ ...form, examplePosts: updated.length > 0 ? updated : [''] });
  };

  const updateExample = (i, val) => {
    const updated = [...form.examplePosts];
    updated[i] = val;
    setForm({ ...form, examplePosts: updated });
  };

  const selectRolePreset = (preset) => {
    setForm({ ...form, accountRole: preset });
  };

  const selectGoalPreset = (goal) => {
    // Toggle or append
    const current = form.accountGoals;
    if (current.includes(goal)) {
      setForm({ ...form, accountGoals: current.replace(goal, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim() });
    } else {
      setForm({ ...form, accountGoals: current ? `${current}, ${goal}` : goal });
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="brand-voice animate-fade-in">
      <div className="page-header justify-end">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : saved ? <><FiCheckCircle size={18} /> Saved</> : <><FiSave size={18} /> Save</>}
        </button>
      </div>

      <div className="voice-grid">
        {/* Section 1: Who You Are */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><FiUser size={20} /> Who You Are</h3>
          </div>
          <div className="card-content">
            <div className="form-group">
              <label className="form-label">Account Role</label>
              <div className="preset-chips">
                {ROLE_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    className={`preset-chip ${form.accountRole === preset.value ? 'active' : ''}`}
                    onClick={() => selectRolePreset(preset.value)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <input className="form-input" value={form.accountRole} onChange={e => setForm({ ...form, accountRole: e.target.value })}
                placeholder="Or describe your role — e.g., Solo dev building AI tools in public" />
              <span className="form-hint">What type of X account is this? Pick a preset or write your own.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Niche</label>
              <input className="form-input" value={form.niche} onChange={e => setForm({ ...form, niche: e.target.value })}
                placeholder="e.g., SaaS marketing, AI tools, indie hacking, design systems" />
              <span className="form-hint">Your main area of expertise or topic space.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Target Audience</label>
              <input className="form-input" value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })}
                placeholder="e.g., Early-stage founders, product designers, developer advocates" />
              <span className="form-hint">Who are you trying to reach and help?</span>
            </div>

            <div className="form-group">
              <label className="form-label">Personality</label>
              <textarea className="form-textarea" rows={3} value={form.personality} onChange={e => setForm({ ...form, personality: e.target.value })}
                placeholder="e.g., I'm a founder who shares honest lessons from building a startup. I don't sugarcoat failures. I use short sentences and real numbers." />
              <span className="form-hint">Describe yourself the way you'd describe your posting style to a friend.</span>
            </div>
          </div>
        </div>

        {/* Section 2: Goals & Growth */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><FiTarget size={20} /> Goals & Growth</h3>
          </div>
          <div className="card-content">
            <div className="form-group">
              <label className="form-label">Account Goals</label>
              <div className="preset-chips">
                {GOAL_PRESETS.map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    className={`preset-chip ${form.accountGoals.includes(goal) ? 'active' : ''}`}
                    onClick={() => selectGoalPreset(goal)}
                  >
                    {goal}
                  </button>
                ))}
              </div>
              <input className="form-input" value={form.accountGoals} onChange={e => setForm({ ...form, accountGoals: e.target.value })}
                placeholder="Or write your own goals" />
              <span className="form-hint">What is this account trying to achieve? Select any that apply or type your own.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Growth Stage</label>
              <div className="stage-selector">
                {[
                  { value: 'early', label: 'Early', desc: 'Building from scratch, under 1K' },
                  { value: 'growing', label: 'Growing', desc: 'Gaining traction, 1K–10K' },
                  { value: 'established', label: 'Established', desc: 'Strong following, 10K+' },
                ].map(stage => (
                  <button
                    key={stage.value}
                    type="button"
                    className={`stage-btn ${form.growthStage === stage.value ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, growthStage: stage.value })}
                  >
                    <span className="stage-label">{stage.label}</span>
                    <span className="stage-desc">{stage.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Topics to Avoid</label>
              <input className="form-input" value={form.avoidTopics} onChange={e => setForm({ ...form, avoidTopics: e.target.value })}
                placeholder="e.g., Politics, generic motivational quotes, hustle culture" />
              <span className="form-hint">What should the AI never write about?</span>
            </div>
          </div>
        </div>

        {/* Section 3: How You Post */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><FiMessageCircle size={20} /> How You Post</h3>
          </div>
          <div className="card-content">
            <div className="form-group">
              <label className="form-label">Tone</label>
              <input className="form-input" value={form.tone} onChange={e => setForm({ ...form, tone: e.target.value })}
                placeholder="e.g., Direct, casual, witty, no-nonsense, thoughtful" />
              <span className="form-hint">The feeling your posts should give the reader.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Posting Style</label>
              <textarea className="form-textarea" rows={3} value={form.postingStyle} onChange={e => setForm({ ...form, postingStyle: e.target.value })}
                placeholder="e.g., Short punchy takes, mostly under 200 chars. Lowercase sometimes. Never use threads longer than 5 posts. I quote-tweet other founders a lot." />
              <span className="form-hint">How do you actually post on X? Sentence length, formatting habits, patterns.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Platform Notes</label>
              <textarea className="form-textarea" rows={2} value={form.platformNotes} onChange={e => setForm({ ...form, platformNotes: e.target.value })}
                placeholder="e.g., I never use hashtags. I avoid emojis. I reply to big accounts in my niche." />
              <span className="form-hint">Any X-specific behaviors or preferences.</span>
            </div>
          </div>
        </div>

        {/* Section 4: Voice Examples */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><FiCheckCircle size={20} /> Voice Examples</h3>
            <span className="card-hint">The AI matches this style</span>
          </div>
          <div className="card-content">
            <p className="example-intro">
              Paste 2–5 real posts you've written that represent your best voice. These are the AI's primary style reference.
            </p>
            {form.examplePosts.map((ex, i) => (
              <div key={i} className="example-row">
                <textarea className="form-textarea example-input" rows={2} value={ex}
                  onChange={e => updateExample(i, e.target.value)}
                  placeholder={`Example post ${i + 1}...`} />
                {form.examplePosts.length > 1 && (
                  <button className="btn btn-sm btn-ghost example-remove" onClick={() => removeExample(i)} title="Remove">
                    <FiX size={14} />
                  </button>
                )}
              </div>
            ))}
            {form.examplePosts.length < 5 && (
              <button className="btn btn-sm btn-secondary" onClick={addExample}>
                <FiPlus size={14} /> Add Example
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-xl); }
        .page-header h1 { margin-bottom: var(--spacing-xs); }
        .page-header p { color: var(--color-text-muted); max-width: 500px; }
        .voice-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-lg); }
        .card-hint { font-size: 0.8125rem; color: var(--color-text-muted); }
        .form-textarea { width: 100%; padding: var(--spacing-md); background: var(--color-bg-tertiary); border: 1px solid var(--color-border);
          border-radius: var(--radius-md); color: var(--color-text-primary); font-family: inherit; font-size: 0.9375rem; line-height: 1.5; resize: vertical;
          transition: border-color var(--transition-fast); }
        .form-textarea:focus { outline: none; border-color: var(--color-accent-primary); }
        .form-hint { display: block; font-size: 0.75rem; color: var(--color-text-muted); margin-top: var(--spacing-xs); }
        .example-intro { font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: var(--spacing-lg); line-height: 1.5; }
        .example-row { position: relative; margin-bottom: var(--spacing-md); }
        .example-input { padding-right: 40px; }
        .example-remove { position: absolute; top: 8px; right: 8px; }

        .preset-chips { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); margin-bottom: var(--spacing-sm); }
        .preset-chip { padding: 6px 14px; font-size: 0.8125rem; font-weight: 500; background: var(--color-bg-tertiary);
          border: 1px solid var(--color-border); border-radius: 20px; color: var(--color-text-secondary);
          cursor: pointer; transition: all var(--transition-fast); white-space: nowrap; }
        .preset-chip:hover { border-color: var(--color-border-light); color: var(--color-text-primary); }
        .preset-chip.active { border-color: var(--color-accent-secondary); color: var(--color-accent-secondary); background: rgba(129,140,248,0.1); }

        .stage-selector { display: flex; gap: var(--spacing-sm); }
        .stage-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: var(--spacing-md);
          background: var(--color-bg-tertiary); border: 1px solid var(--color-border); border-radius: var(--radius-md);
          cursor: pointer; transition: all var(--transition-fast); text-align: center; }
        .stage-btn:hover { border-color: var(--color-border-light); }
        .stage-btn.active { border-color: var(--color-accent-secondary); background: rgba(129,140,248,0.1); }
        .stage-label { font-size: 0.875rem; font-weight: 600; color: var(--color-text-primary); }
        .stage-desc { font-size: 0.6875rem; color: var(--color-text-muted); }

        @media (max-width: 1024px) { .voice-grid { grid-template-columns: 1fr; } }
        @media (max-width: 768px) {
          .page-header { flex-direction: column; gap: var(--spacing-md); }
          .stage-selector { flex-direction: column; }
        }
      `}</style>
    </div>
  );
};

export default BrandVoice;
