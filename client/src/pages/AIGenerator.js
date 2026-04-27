import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  FiZap, FiCopy, FiCalendar, FiSend, FiRefreshCw, FiList,
  FiEdit2, FiAlertCircle, FiX, FiClock, FiRotateCcw, FiImage, FiTrash2, FiExternalLink, FiUpload, FiCpu
} from 'react-icons/fi';
import { useAuth } from '../App';
import { aiAPI, tweetAPI, brandVoiceAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const STYLES = {
  hot_take: { icon: '🔥', label: 'Hot Take', desc: 'Bold, opinionated' },
  insight: { icon: '💡', label: 'Insight', desc: 'Specific, valuable' },
  storytelling: { icon: '📖', label: 'Story', desc: 'Personal anecdote' },
  listicle: { icon: '📋', label: 'List Post', desc: 'Numbered points' },
  question: { icon: '❓', label: 'Question', desc: 'Conversation starter' },
  tutorial: { icon: '🛠️', label: 'How-To', desc: 'Tactical tip' },
  observation: { icon: '👁️', label: 'Observation', desc: 'Sharp industry take' },
};

const QUICK_SUGGESTIONS = [
  'Sound more human', 'Less corporate', 'Stronger hook', 'More specific',
  'Add curiosity', 'Founder voice', 'No hashtags', 'Shorter', 'More opinionated'
];

const AIGenerator = () => {
  const { user } = useAuth();
  const [aiConfigured, setAiConfigured] = useState(null);
  const [mode, setMode] = useState('post'); // 'post', 'ideas', 'thread'
  const [style, setStyle] = useState('insight');
  const [topic, setTopic] = useState('');
  const [trendContext, setTrendContext] = useState('');
  const [threadLength, setThreadLength] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(null); // index of post being generated for
  const [imageProvider, setImageProvider] = useState('openai');
  const [brandVoice, setBrandVoice] = useState(null);
  const [savingRequirements, setSavingRequirements] = useState(false);

  // Results
  const [posts, setPosts] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [thread, setThread] = useState([]);
  const [publishingIdx, setPublishingIdx] = useState(null);
  
  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // { index, content, originalContent, setter, items }
  const [editValue, setEditValue] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const editTextAreaRef = React.useRef(null);
  
  // Scheduling State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleData, setScheduleData] = useState({ type: 'post', content: null });
  const [customScheduledTime, setCustomScheduledTime] = useState('');
  const [requirements, setRequirements] = useState('');

  useEffect(() => {
    if (user?.settings?.defaultImageProvider) {
      setImageProvider(user.settings.defaultImageProvider);
    }
  }, [user]);

  useEffect(() => {
    aiAPI.getStatus().then(res => {
      setAiConfigured(res.data.openaiConfigured || res.data.geminiConfigured);
    }).catch(() => setAiConfigured(false));

    // Load brand voice for persistent requirements
    brandVoiceAPI.get().then(res => {
      if (res.data.success && res.data.brandVoice) {
        setBrandVoice(res.data.brandVoice);
        if (res.data.brandVoice.aiRequirements) {
          setRequirements(res.data.brandVoice.aiRequirements);
        }
      }
    }).catch(err => console.error('Failed to load brand voice:', err));
  }, []);

  const toggleSuggestion = (s) => {
    const current = requirements.split(',').map(item => item.trim()).filter(Boolean);
    if (current.includes(s)) {
      setRequirements(current.filter(item => item !== s).join(', '));
    } else {
      setRequirements([...current, s].join(', '));
    }
  };

  const handleGenerate = async () => {
    if (mode !== 'ideas' && !topic.trim()) { toast.error('Enter a topic'); return; }
    setGenerating(true);
    setPosts([]); setIdeas([]); setThread([]);
    try {
      const ctx = trendContext.trim() || undefined;
      const reqs = requirements.trim() || undefined;
      if (mode === 'post') {
        const res = await aiAPI.generateVariations({ style, topic, count: 3, trendContext: ctx, requirements: reqs });
        if (res.data.success) {
          setPosts(res.data.posts.map(p => ({ 
            content: p, 
            originalContent: p, 
            status: 'draft',
            media: null 
          })));
        }
      } else if (mode === 'ideas') {
        const res = await aiAPI.generateIdeas({ count: 5, trendContext: ctx, requirements: reqs });
        if (res.data.success) setIdeas(res.data.ideas.map(p => ({ ...p, originalContent: p.topic })));
      } else if (mode === 'thread') {
        const res = await aiAPI.generateThread({ topic, threadLength, trendContext: ctx, requirements: reqs });
        if (res.data.success) setThread(res.data.posts.map(p => ({ 
          content: p, 
          originalContent: p, 
          status: 'draft',
          media: null
        })));
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Generation failed');
    } finally {
      setGenerating(false);
      // Auto-save requirements to Brand Voice so they persist
      if (requirements.trim() !== brandVoice?.aiRequirements) {
        setSavingRequirements(true);
        brandVoiceAPI.save({ ...brandVoice, aiRequirements: requirements.trim() })
          .then(res => {
            if (res.data.success) setBrandVoice(res.data.brandVoice);
          })
          .catch(err => console.error('Failed to auto-save requirements:', err))
          .finally(() => setSavingRequirements(false));
      }
    }
  };

  const handleGenerateImage = async (index, type = 'post') => {
    const list = type === 'post' ? posts : thread;
    const setter = type === 'post' ? setPosts : setThread;
    const post = list[index];

    setGeneratingImage({ index, type });
    try {
      // 1. Generate prompt
      const promptRes = await aiAPI.generatePrompt({ 
        content: post.content, 
        provider: imageProvider 
      });
      
      // 2. Generate image
      const imageRes = await aiAPI.generateImage({ 
        prompt: promptRes.data.prompt, 
        provider: imageProvider 
      });

      if (imageRes.data.success) {
        const updated = [...list];
        updated[index] = { 
          ...updated[index], 
          media: {
            url: imageRes.data.url,
            provider: imageRes.data.provider,
            prompt: imageRes.data.prompt,
            type: 'image'
          }
        };
        setter(updated);
        toast.success('Image generated!');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Image generation failed');
    } finally {
      setGeneratingImage(null);
    }
  };

  const removeMedia = (index, type = 'post') => {
    const list = type === 'post' ? posts : thread;
    const setter = type === 'post' ? setPosts : setThread;
    const updated = [...list];
    updated[index] = { ...updated[index], media: null };
    setter(updated);
  };

  const handleFileUpload = (index, type = 'post', e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large (max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const list = type === 'post' ? posts : thread;
      const setter = type === 'post' ? setPosts : setThread;
      const updated = [...list];
      updated[index] = { 
        ...updated[index], 
        media: {
          url: event.target.result,
          provider: 'upload',
          type: 'image',
          fileName: file.name
        }
      };
      setter(updated);
      toast.success('Image uploaded!');
    };
    reader.readAsDataURL(file);
  };

  const handleExternalUrl = (index, type = 'post') => {
    const url = window.prompt('Enter image URL:');
    if (!url) return;

    const list = type === 'post' ? posts : thread;
    const setter = type === 'post' ? setPosts : setThread;
    const updated = [...list];
    updated[index] = { 
      ...updated[index], 
      media: {
        url,
        provider: 'url',
        type: 'image'
      }
    };
    setter(updated);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const openScheduleModal = (type, content) => {
    setScheduleData({ type, content });
    
    // Default to 1 hour from now, rounded to 5 mins
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5);
    setCustomScheduledTime(now.toISOString().slice(0, 16));
    
    setShowScheduleModal(true);
  };

  const confirmSchedule = async () => {
    if (!customScheduledTime) {
      toast.error('Please select a time');
      return;
    }

    const scheduledDate = new Date(customScheduledTime);
    if (scheduledDate <= new Date()) {
      toast.error('Time must be in the future');
      return;
    }

    setGenerating(true); // Reuse generating state for simple loading
    try {
      if (scheduleData.type === 'thread') {
        const tweetsData = scheduleData.content.map((t, i) => ({
          content: t.content,
          media: t.media,
          scheduledTime: new Date(scheduledDate.getTime() + i * 60000).toISOString(),
        }));
        await tweetAPI.scheduleThread(tweetsData);
        toast.success('Thread scheduled successfully');
      } else {
        await tweetAPI.schedule({ 
          content: scheduleData.content, 
          media: scheduleData.media,
          scheduledTime: scheduledDate.toISOString() 
        });
        toast.success('Post scheduled successfully');
      }
      setShowScheduleModal(false);
    } catch (err) {
      console.error('Schedule error:', err);
      toast.error(err.response?.data?.error || 'Failed to schedule');
    } finally {
      setGenerating(false);
    }
  };

  const schedulePost = (content) => openScheduleModal('post', content);
  const scheduleThread = () => openScheduleModal('thread', thread);

  const publishNow = async (content) => {
    // Guard: block publishing if tweet is over the character limit
    if (content.content.length > 280) {
      toast.error(`Tweet is ${content.content.length - 280} characters over the 280 limit. Please edit it first.`);
      return;
    }
    if (!window.confirm('Publish this post now?')) return;
    setPublishingIdx(content);
    try {
      // Add a 5s buffer to ensure it's not rejected by the server as "in the past"
      const now = new Date();
      const bufferTime = new Date(now.getTime() + 5000).toISOString();

      const res = await tweetAPI.schedule({
        content: content.content,
        media: content.media,
        scheduledTime: bufferTime,
      });
      if (res.data.success && res.data.tweet?.id) {
        await tweetAPI.sendNow(res.data.tweet.id);
        toast.success('Post published!');
      }
    } catch (err) {
      console.error('Publish error:', err);
      // err.message is enriched by the api.js interceptor to include validation details
      const errorMsg = err.response?.data?.error || err.message || 'Failed to publish';
      // If Twitter auth expired, prompt the user to re-login
      if (err.response?.status === 401 || errorMsg.toLowerCase().includes('expired')) {
        toast.error('Twitter session expired — please log out and log in again.');
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setPublishingIdx(null);
    }
  };

  const publishThreadNow = async () => {
    if (!window.confirm(`Publish all ${thread.length} posts as a thread now?`)) return;
    setGenerating(true);
    try {
      // 1. Create the thread in DB with "now" (buffered) times
      const now = new Date();
      const tweetsData = thread.map((t, i) => ({
        content: t.content,
        media: t.media,
        scheduledTime: new Date(now.getTime() + (i + 1) * 5000).toISOString(),
      }));
      
      const res = await tweetAPI.scheduleThread(tweetsData);
      if (res.data.success && res.data.tweets) {
        // 2. Send them sequentially. Our backend now handles threadPreviousId linking in sendNow.
        for (const t of res.data.tweets) {
          await tweetAPI.sendNow(t.id);
          // Small delay to ensure Twitter processes them in order
          await new Promise(r => setTimeout(r, 1000));
        }
        toast.success('Thread published successfully!');
        setThread([]); // Clear after success
      }
    } catch (err) {
      console.error('Thread publish error:', err);
      toast.error(err.response?.data?.error || 'Failed to publish thread');
    } finally {
      setGenerating(false);
    }
  };

  const startEdit = (idx, content, setter, items, field = 'content') => {
    const item = items[idx];
    setEditingItem({ 
      index: idx, 
      content, 
      originalContent: item.originalContent || content, 
      setter, 
      items,
      field
    });
    setEditValue(content);
    setShowEditModal(true);
    setHasUnsavedChanges(false);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    const { index, setter, items, field } = editingItem;
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: editValue };
    setter(updated);
    setShowEditModal(false);
    setEditingItem(null);
    toast.success('Updated successfully');
  };

  const closeEditModal = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Discard them?')) return;
    }
    setShowEditModal(false);
    setEditingItem(null);
  };

  const resetToOriginal = () => {
    if (editingItem?.originalContent) {
      setEditValue(editingItem.originalContent);
      setHasUnsavedChanges(true);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (showEditModal && editTextAreaRef.current) {
      const textarea = editTextAreaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [editValue, showEditModal]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showEditModal) return;
      if (e.key === 'Escape') closeEditModal();
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSaveEdit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showEditModal, hasUnsavedChanges, editValue, editingItem]);

  const pickIdea = (idea) => {
    setMode('post');
    setTopic(idea.topic);
    if (idea.style && STYLES[idea.style]) setStyle(idea.style);
  };

  // Removed old scheduleThread implementation

  if (aiConfigured === null) return <LoadingSpinner />;

  return (
    <div className="ai-gen animate-fade-in">
      <div className="page-header justify-end">
        <div className="generator-modes">
        </div>
      </div>

      {!aiConfigured ? (
        <div className="setup-notice">
          <FiAlertCircle size={24} />
          <div>
            <h3>OpenAI API key not configured</h3>
            <p>Add <code>OPENAI_API_KEY</code> to your <code>.env</code> file and restart the server to enable AI generation.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Mode Tabs */}
          <div className="mode-tabs">
            <button className={`mode-tab ${mode === 'post' ? 'active' : ''}`} onClick={() => setMode('post')}>
              <FiEdit2 size={16} /> Posts
            </button>
            <button className={`mode-tab ${mode === 'ideas' ? 'active' : ''}`} onClick={() => setMode('ideas')}>
              <FiZap size={16} /> Ideas
            </button>
            <button className={`mode-tab ${mode === 'thread' ? 'active' : ''}`} onClick={() => setMode('thread')}>
              <FiList size={16} /> Thread
            </button>
          </div>

          {/* Input Area */}
          <div className="gen-input-area">
            {mode !== 'ideas' && (
              <div className="form-group">
                <label className="form-label">{mode === 'thread' ? 'Thread Topic' : 'Topic or Angle'}</label>
                <textarea className="form-textarea gen-topic" value={topic} onChange={e => setTopic(e.target.value)}
                  placeholder={mode === 'thread' ? 'What should this thread teach or explore?' : 'What should this post be about?'} rows={2} />
              </div>
            )}

            {/* AI Tuning Section - Moved Higher */}
            <div className="form-group tuning-panel">
              <div className="tuning-header">
                <FiZap className="tuning-icon" />
                <label className="form-label">
                  Tune the AI Output <span className="label-optional">optional</span>
                  {savingRequirements && <span className="save-indicator">Saving...</span>}
                  {!savingRequirements && brandVoice?.aiRequirements && requirements.trim() === brandVoice.aiRequirements && (
                    <span className="save-indicator success">Saved to profile</span>
                  )}
                </label>
              </div>
              <p className="tuning-helper">Tell the AI how you want the post to sound, what to avoid, and what rules to follow.</p>
              <textarea 
                className="form-textarea gen-requirements" 
                value={requirements} 
                onChange={e => setRequirements(e.target.value)}
                placeholder="Example: Make it sound casual and founder-like. Avoid generic AI wording. Keep it short, direct, and slightly opinionated." 
                rows={2} 
              />
              <div className="suggestion-chips">
                {QUICK_SUGGESTIONS.map(s => (
                  <button 
                    key={s} 
                    className={`chip ${requirements.includes(s) ? 'active' : ''}`}
                    onClick={() => toggleSuggestion(s)}
                    type="button"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="tuning-info-note">
                <FiAlertCircle size={12} />
                <span>This directly changes how the AI writes your {mode === 'post' ? 'post' : mode === 'ideas' ? 'ideas' : 'thread'}.</span>
              </div>
            </div>

            {/* Context Area */}
            <div className="form-group">
              <label className="form-label">Context / What's Happening <span className="label-optional">optional</span></label>
              <textarea className="form-textarea gen-context" value={trendContext} onChange={e => setTrendContext(e.target.value)}
                placeholder="Paste a trend, article headline, recent event, or industry context. The AI will use this to make the post timely and relevant." rows={2} />
              <span className="form-hint">This is manual context — paste anything fresh you want the AI to factor in. Not automated trend intelligence.</span>
            </div>

            {mode === 'post' && (
              <div className="form-group">
                <label className="form-label">Post Style</label>
                <div className="style-grid">
                  {Object.entries(STYLES).map(([key, s]) => (
                    <button key={key} className={`style-btn ${style === key ? 'active' : ''}`} onClick={() => setStyle(key)} type="button">
                      <span className="style-icon">{s.icon}</span>
                      <span className="style-label">{s.label}</span>
                      <span className="style-desc">{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'thread' && (
              <div className="form-group thread-length-group">
                <label className="form-label">Thread Length</label>
                <div className="thread-length-selector">
                  {[3, 5, 7, 10].map(n => (
                    <button key={n} className={`len-btn ${threadLength === n ? 'active' : ''}`} onClick={() => setThreadLength(n)} type="button">
                      {n} posts
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="gen-footer">
              <div className="provider-selector">
                <span className="provider-label">AI Image Provider:</span>
                <button 
                  className={`provider-btn ${imageProvider === 'openai' ? 'active' : ''}`} 
                  onClick={() => setImageProvider('openai')}
                  title="OpenAI DALL-E 3"
                >
                  <FiCpu size={14} /> OpenAI
                </button>
                <button 
                  className={`provider-btn ${imageProvider === 'gemini' ? 'active' : ''}`} 
                  onClick={() => setImageProvider('gemini')}
                  title="Google Gemini (Imagen)"
                >
                  <FiZap size={14} /> Gemini
                </button>
              </div>
              <button className="btn btn-primary gen-btn" onClick={handleGenerate} disabled={generating}>
                {generating ? <><FiRefreshCw size={18} className="spin" /> Generating...</> : <><FiZap size={18} /> Generate</>}
              </button>
            </div>
          </div>

          {/* Results: Posts */}
          {posts.length > 0 && mode === 'post' && (
            <div className="results">
              <h3 className="results-title">Generated Posts — pick one, edit it, or regenerate</h3>
              {posts.map((p, i) => (
                <div key={i} className="result-card">
                  {p.media && (
                    <div className="media-preview-container">
                      <img src={p.media.url} alt="Generated preview" className="media-preview-img" />
                      <button className="media-remove-btn" onClick={() => removeMedia(i)} title="Remove media">
                        <FiTrash2 size={16} />
                      </button>
                      <div className="media-provider-tag">
                        {p.media.provider === 'openai' && 'DALL-E 3'}
                        {p.media.provider === 'gemini' && 'Imagen'}
                        {p.media.provider === 'upload' && 'Uploaded'}
                        {p.media.provider === 'url' && 'External'}
                      </div>
                    </div>
                  )}
                  <p className="result-text">{p.content}</p>
                  <div className="result-meta">
                    <span className="char-count">{p.content.length}/280</span>
                    <div className="result-actions">
                      {!p.media && (
                        <div className="media-add-actions">
                          <button 
                            className="btn btn-sm btn-ghost" 
                            onClick={() => handleGenerateImage(i)}
                            disabled={generatingImage?.index === i}
                          >
                            {generatingImage?.index === i ? <FiRefreshCw size={14} className="spin" /> : <FiImage size={14} />} 
                            {generatingImage?.index === i ? 'Generating...' : 'AI Image'}
                          </button>
                          <div className="dropdown">
                            <button className="btn btn-sm btn-ghost dropdown-toggle" title="Other media options">
                              <FiUpload size={14} />
                            </button>
                            <div className="dropdown-menu">
                              <label className="dropdown-item">
                                <FiUpload size={12} /> Upload
                                <input type="file" hidden accept="image/*" onChange={(e) => handleFileUpload(i, 'post', e)} />
                              </label>
                              <button className="dropdown-item" onClick={() => handleExternalUrl(i)}>
                                <FiExternalLink size={12} /> URL
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      <button className="btn btn-sm btn-ghost" onClick={() => startEdit(i, p.content, setPosts, posts)} title="Edit"><FiEdit2 size={14} /> Edit</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => copyToClipboard(p.content)} title="Copy"><FiCopy size={14} /></button>
                      <button className="btn btn-sm btn-secondary" onClick={() => schedulePost(p)} title="Queue"><FiCalendar size={14} /> Queue</button>
                      <button 
                        className="btn btn-sm btn-primary" 
                        onClick={() => publishNow(p)} 
                        title="Publish"
                        disabled={publishingIdx === p}
                      >
                        {publishingIdx === p ? <FiRefreshCw size={14} className="spin" /> : <FiSend size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results: Ideas */}
          {ideas.length > 0 && mode === 'ideas' && (
            <div className="results">
              <h3 className="results-title">Content Ideas — click one to turn it into a post</h3>
              <div className="ideas-grid">
                {ideas.map((idea, i) => (
                  <div key={i} className="idea-card" onClick={() => pickIdea(idea)}>
                    <div className="idea-style-row">
                      <div className="idea-style">{STYLES[idea.style]?.icon || '💡'} {STYLES[idea.style]?.label || idea.style}</div>
                      <button 
                        className="btn-icon-sm" 
                        onClick={(e) => { e.stopPropagation(); startEdit(i, idea.topic, setIdeas, ideas, 'topic'); }}
                        title="Edit Idea"
                      >
                        <FiEdit2 size={12} />
                      </button>
                    </div>
                    <h4 className="idea-topic">{idea.topic}</h4>
                    <p className="idea-preview">{idea.preview}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results: Thread */}
          {thread.length > 0 && mode === 'thread' && (
            <div className="results">
              <div className="results-header">
                <h3 className="results-title">Thread Draft — edit any post, then schedule</h3>
                <div className="thread-global-actions">
                  <button className="btn btn-secondary" onClick={publishThreadNow} disabled={generating}>
                    {generating ? <FiRefreshCw size={16} className="spin" /> : <FiSend size={16} />} 
                    Publish Now
                  </button>
                  <button className="btn btn-primary" onClick={scheduleThread} disabled={generating}>
                    <FiCalendar size={16} /> Schedule Thread
                  </button>
                </div>
              </div>
              {thread.map((t, i) => (
                <div key={i} className="thread-post">
                  <span className="thread-num">{i + 1}</span>
                  <div className="thread-content">
                    {t.media && (
                      <div className="media-preview-container thread-media">
                        <img src={t.media.url} alt="Thread media preview" className="media-preview-img" />
                        <button className="media-remove-btn" onClick={() => removeMedia(i, 'thread')} title="Remove media">
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    )}
                    <p>{t.content}</p>
                    <div className="thread-actions">
                      <span className="char-count">{t.content.length}/280</span>
                      <div className="thread-actions-group">
                        {!t.media && (
                          <button 
                            className="btn btn-sm btn-ghost" 
                            onClick={() => handleGenerateImage(i, 'thread')}
                            disabled={generatingImage?.index === i && generatingImage?.type === 'thread'}
                          >
                            {generatingImage?.index === i && generatingImage?.type === 'thread' ? <FiRefreshCw size={14} className="spin" /> : <FiImage size={14} />}
                            AI Image
                          </button>
                        )}
                        <button className="btn btn-sm btn-ghost" onClick={() => startEdit(i, t.content, setThread, thread)}><FiEdit2 size={14} /> Edit</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}


      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className={`modal ${scheduleData.type === 'thread' ? 'modal-lg' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Schedule {scheduleData.type === 'thread' ? 'Thread' : 'Post'}</h3>
              <button className="modal-close" onClick={() => setShowScheduleModal(false)}><FiX /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label"><FiClock size={14} /> Choose Publish Time</label>
                <input 
                  type="datetime-local" 
                  className="form-input" 
                  value={customScheduledTime} 
                  onChange={e => setCustomScheduledTime(e.target.value)}
                  min={new Date(Date.now() + 300000).toISOString().slice(0, 16)} // Min 5 mins from now
                />
                <span className="form-hint">
                  {scheduleData.type === 'thread' 
                    ? `Each post in the thread will be spaced 1 minute apart starting from this time.`
                    : 'Your post will be queued and sent at this exact time.'}
                </span>
              </div>
              
              <div className="schedule-preview">
                <div className="preview-label">Preview content</div>
                <div className="preview-box">
                  {scheduleData.type === 'thread' ? (
                    <div className="thread-preview-list">
                      {scheduleData.content.map((t, i) => (
                        <div key={i} className="thread-preview-item">
                          <span className="p-num">{i+1}</span>
                          <p>{t.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>{scheduleData.content}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowScheduleModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmSchedule} disabled={generating}>
                {generating ? 'Scheduling...' : 'Confirm Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal modal-edit" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header border-none">
              <div className="edit-modal-top">
                <button className="modal-close" onClick={closeEditModal}><FiX size={20} /></button>
                <div className="edit-modal-label">Refine your post</div>
                <button className="edit-reset-btn" onClick={resetToOriginal} title="Reset to AI version">
                  <FiRotateCcw size={14} /> Reset
                </button>
              </div>
            </div>
            <div className="modal-body edit-modal-body">
              <div className="edit-compose-area">
                <div className="edit-avatar">
                  {user?.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt="avatar" />
                  ) : (
                    <div className="avatar-placeholder">{user?.twitterUsername?.charAt(0) || 'U'}</div>
                  )}
                </div>
                <div className="edit-main">
                  <textarea 
                    ref={editTextAreaRef}
                    className="edit-textarea" 
                    value={editValue} 
                    onChange={e => {
                      setEditValue(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Refine your post..."
                    autoFocus
                  />
                  <div className="edit-footer">
                    <div className={`edit-char-count ${editValue.length > 280 ? 'error' : editValue.length > 250 ? 'warning' : ''}`}>
                      {editValue.length}/280
                    </div>
                    <div className="edit-actions-row">
                      <button className="btn btn-primary" onClick={handleSaveEdit}>Save Changes</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-header { margin-bottom: var(--spacing-xl); }
        .page-header h1 { margin-bottom: var(--spacing-xs); }
        .page-header p { color: var(--color-text-muted); }

        .setup-notice { display: flex; align-items: flex-start; gap: var(--spacing-md); padding: var(--spacing-xl); background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-lg); color: var(--color-warning); }
        .setup-notice h3 { color: var(--color-text-primary); margin-bottom: var(--spacing-xs); }
        .setup-notice p { color: var(--color-text-secondary); font-size: 0.875rem; }
        .setup-notice code { background: var(--color-bg-tertiary); padding: 2px 6px; border-radius: var(--radius-sm); font-size: 0.8125rem; }

        .mode-tabs { display: flex; gap: var(--spacing-xs); margin-bottom: var(--spacing-xl); background: var(--color-bg-card); padding: var(--spacing-xs);
          border-radius: var(--radius-lg); border: 1px solid var(--color-border); width: fit-content; }
        .mode-tab { display: flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-sm) var(--spacing-lg); border: none; background: none;
          color: var(--color-text-muted); font-size: 0.875rem; font-weight: 500; border-radius: var(--radius-md); cursor: pointer; transition: all var(--transition-fast); }
        .mode-tab:hover { color: var(--color-text-primary); }
        .mode-tab.active { background: var(--color-accent-secondary); color: var(--color-bg-primary); }

        .gen-input-area { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--spacing-xl);
          margin-bottom: var(--spacing-xl); }
        .label-optional { font-size: 0.6875rem; font-weight: 400; color: var(--color-text-muted); margin-left: 6px; }
        .gen-topic { font-size: 1rem; }

        .style-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: var(--spacing-sm); }
        .style-btn { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: var(--spacing-md); background: var(--color-bg-tertiary);
          border: 1px solid var(--color-border); border-radius: var(--radius-md); cursor: pointer; transition: all var(--transition-fast); text-align: center; }
        .style-btn:hover { border-color: var(--color-border-light); }
        .style-btn.active { border-color: var(--color-accent-secondary); background: rgba(129,140,248,0.1); }
        .style-icon { font-size: 1.25rem; }
        .style-label { font-size: 0.8125rem; font-weight: 600; color: var(--color-text-primary); }
        .style-desc { font-size: 0.6875rem; color: var(--color-text-muted); }

        .thread-length-group { margin-top: var(--spacing-sm); }
        .thread-length-selector { display: flex; gap: var(--spacing-sm); }
        .len-btn { padding: var(--spacing-sm) var(--spacing-lg); background: var(--color-bg-tertiary); border: 1px solid var(--color-border);
          border-radius: var(--radius-md); color: var(--color-text-secondary); font-size: 0.875rem; cursor: pointer; transition: all var(--transition-fast); }
        .len-btn.active { border-color: var(--color-accent-secondary); color: var(--color-accent-secondary); background: rgba(129,140,248,0.1); }

        .gen-btn { margin-top: var(--spacing-lg); min-width: 160px; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .results { margin-top: var(--spacing-lg); }
        .results-title { font-size: 1rem; color: var(--color-text-secondary); margin-bottom: var(--spacing-lg); font-weight: 500; }
        .results-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-lg); }
        .thread-global-actions { display: flex; gap: var(--spacing-sm); }

        .result-card { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--spacing-lg);
          margin-bottom: var(--spacing-md); transition: border-color var(--transition-fast); }
        .result-card:hover { border-color: var(--color-border-light); }
        .result-text { font-size: 1rem; line-height: 1.6; margin-bottom: var(--spacing-md); }
        .result-meta { display: flex; justify-content: space-between; align-items: center; }
        .result-actions { display: flex; gap: var(--spacing-xs); align-items: center; }
        .char-count { font-size: 0.75rem; color: var(--color-text-muted); }

        .edit-area { }
        .edit-area .form-textarea { margin-bottom: var(--spacing-sm); }
        .edit-actions { display: flex; gap: var(--spacing-xs); }

        .idea-card { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--spacing-lg);
          margin-bottom: var(--spacing-md); cursor: pointer; transition: all var(--transition-fast); position: relative; }
        .idea-card:hover { border-color: var(--color-accent-secondary); transform: translateY(-1px); }
        .idea-style-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-xs); }
        .idea-style { font-size: 0.75rem; color: var(--color-accent-secondary); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
        .idea-topic { font-size: 1rem; font-weight: 600; margin-bottom: var(--spacing-xs); }
        .idea-preview { font-size: 0.875rem; color: var(--color-text-muted); line-height: 1.5; }
        
        .btn-icon-sm { background: none; border: none; color: var(--color-text-muted); cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.2s; }
        .btn-icon-sm:hover { background: var(--color-bg-hover); color: var(--color-accent-primary); }

        .thread-post { display: flex; gap: var(--spacing-md); margin-bottom: var(--spacing-md); }
        .thread-num { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: var(--color-accent-secondary);
          color: var(--color-bg-primary); border-radius: 50%; font-weight: 700; font-size: 0.875rem; flex-shrink: 0; }
        .thread-content { flex: 1; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--spacing-md); }
        .thread-content p { font-size: 0.9375rem; line-height: 1.5; margin-bottom: var(--spacing-sm); }
        .thread-actions { display: flex; justify-content: space-between; align-items: center; }
        .thread-edit { flex: 1; }

        .form-textarea { width: 100%; padding: var(--spacing-md); background: var(--color-bg-tertiary); border: 1px solid var(--color-border);
          border-radius: var(--radius-md); color: var(--color-text-primary); font-family: inherit; font-size: 0.9375rem; line-height: 1.5; resize: vertical; }
        .form-textarea:focus { outline: none; border-color: var(--color-accent-primary); }

        @media (max-width: 768px) {
          .style-grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); }
          .result-meta { flex-direction: column; gap: var(--spacing-sm); align-items: flex-start; }
          .thread-post { flex-direction: column; }
        }

        .schedule-preview { margin-top: var(--spacing-lg); }
        .preview-label { font-size: 0.75rem; font-weight: 600; color: var(--color-text-muted); margin-bottom: var(--spacing-xs); text-transform: uppercase; }
        .preview-box { background: var(--color-bg-tertiary); border-radius: var(--radius-md); padding: var(--spacing-md); max-height: 200px; overflow-y: auto; }
        .preview-box p { font-size: 0.875rem; line-height: 1.5; color: var(--color-text-secondary); }
        .thread-preview-item { display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm); padding-bottom: var(--spacing-sm); border-bottom: 1px solid var(--color-border); }
        .thread-preview-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .thread-preview-item .p-num { font-weight: 700; color: var(--color-accent-secondary); font-size: 0.75rem; flex-shrink: 0; }
        
        .suggestion-chips { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); margin-top: var(--spacing-xs); margin-bottom: var(--spacing-xs); }
        .chip { padding: 4px 10px; background: var(--color-bg-tertiary); border: 1px solid var(--color-border); border-radius: var(--radius-full); 
          font-size: 0.75rem; color: var(--color-text-secondary); cursor: pointer; transition: all var(--transition-fast); }
        .chip:hover { border-color: var(--color-border-light); color: var(--color-text-primary); }
        .chip.active { background: var(--color-accent-secondary); color: var(--color-bg-primary); border-color: var(--color-accent-secondary); }

        .tuning-panel {
          background: rgba(129, 140, 248, 0.03);
          border: 1px solid rgba(129, 140, 248, 0.2);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          margin-bottom: var(--spacing-xl);
          transition: all var(--transition-fast);
        }
        .tuning-panel:hover {
          border-color: rgba(129, 140, 248, 0.4);
          background: rgba(129, 140, 248, 0.05);
        }
        .tuning-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-xs);
        }
        .tuning-icon {
          color: var(--color-accent-secondary);
          font-size: 1.1rem;
        }
        .tuning-panel .form-label {
          margin-bottom: 0;
        }
        .tuning-helper {
          font-size: 0.8125rem;
          color: var(--color-text-muted);
          margin-bottom: var(--spacing-md);
        }
        .tuning-info-note {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          margin-top: var(--spacing-sm);
          color: var(--color-accent-secondary);
          font-size: 0.75rem;
          font-weight: 500;
          opacity: 0.8;
        }
        .tuning-panel .form-textarea {
          background: var(--color-bg-card);
          border-color: rgba(129, 140, 248, 0.2);
        }
        .tuning-panel .form-textarea:focus {
          border-color: var(--color-accent-secondary);
          box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.1);
        }

        /* Edit Modal Specifics */
        .modal-edit {
          max-width: 600px;
          border-radius: var(--radius-xl);
          background: var(--color-bg-card);
          overflow: hidden;
        }
        .edit-modal-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: var(--spacing-sm) 0;
        }
        .edit-modal-label {
          font-weight: 600;
          font-size: 0.9375rem;
          color: var(--color-text-secondary);
        }
        .edit-reset-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: 1px solid var(--color-border);
          color: var(--color-text-muted);
          font-size: 0.75rem;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .edit-reset-btn:hover {
          color: var(--color-accent-primary);
          border-color: var(--color-accent-primary);
          background: rgba(129, 140, 248, 0.05);
        }
        .edit-modal-body {
          padding-top: 0;
        }
        .edit-compose-area {
          display: flex;
          gap: var(--spacing-md);
        }
        .edit-avatar {
          flex-shrink: 0;
        }
        .edit-avatar img, .avatar-placeholder {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }
        .avatar-placeholder {
          background: var(--color-accent-secondary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }
        .edit-main {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .edit-textarea {
          width: 100%;
          background: transparent;
          border: none;
          color: var(--color-text-primary);
          font-size: 1.125rem;
          line-height: 1.5;
          padding: 0;
          margin-bottom: var(--spacing-lg);
          resize: none;
          outline: none;
          min-height: 120px;
        }
        .edit-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: var(--spacing-md);
          border-top: 1px solid var(--color-border);
        }
        .edit-char-count {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
        .edit-char-count.warning { color: var(--color-warning); }
        .edit-char-count.error { color: var(--color-error); }
        
        .gen-footer { display: flex; justify-content: space-between; align-items: center; margin-top: var(--spacing-lg); }
        .provider-selector { display: flex; align-items: center; gap: var(--spacing-sm); }
        .provider-label { font-size: 0.75rem; color: var(--color-text-muted); font-weight: 500; }
        .provider-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--color-bg-tertiary); 
          border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 0.75rem; color: var(--color-text-secondary); 
          cursor: pointer; transition: all var(--transition-fast); }
        .provider-btn:hover { border-color: var(--color-border-light); color: var(--color-text-primary); }
        .provider-btn.active { background: var(--color-accent-secondary); color: var(--color-bg-primary); border-color: var(--color-accent-secondary); }

        .media-preview-container { position: relative; margin-bottom: var(--spacing-md); border-radius: var(--radius-lg); overflow: hidden; 
          border: 1px solid var(--color-border); aspect-ratio: 16 / 9; background: var(--color-bg-tertiary); }
        .media-preview-img { width: 100%; height: 100%; object-fit: cover; }
        .media-remove-btn { position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.5); color: white; border: none; 
          border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; 
          transition: background 0.2s; }
        .media-remove-btn:hover { background: rgba(239, 68, 68, 0.8); }
        .media-provider-tag { position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.5); color: white; 
          font-size: 0.625rem; padding: 2px 8px; border-radius: var(--radius-sm); text-transform: uppercase; font-weight: 600; }
        
        .thread-media { aspect-ratio: 4 / 3; margin-top: var(--spacing-sm); }
        .thread-actions-group { display: flex; gap: var(--spacing-xs); }

        .media-add-actions { display: flex; gap: var(--spacing-xs); align-items: center; }
        
        .dropdown { position: relative; display: inline-block; }
        .dropdown-menu { display: none; position: absolute; bottom: 100%; right: 0; background: var(--color-bg-card); 
          border: 1px solid var(--color-border); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); 
          z-index: 10; min-width: 120px; margin-bottom: 8px; }
        .dropdown:hover .dropdown-menu { display: block; }
        .dropdown-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; font-size: 0.8125rem; 
          color: var(--color-text-secondary); cursor: pointer; transition: background 0.2s; width: 100%; text-align: left; border: none; background: none; }
        .dropdown-item:hover { background: var(--color-bg-tertiary); color: var(--color-text-primary); }
        .dropdown-toggle { padding: 4px 8px !important; }

        .save-indicator { font-size: 0.6875rem; color: var(--color-text-muted); margin-left: 10px; font-weight: 400; font-style: italic; }
        .save-indicator.success { color: #10b981; }

        .border-none { border: none !important; }
      `}</style>
    </div>
  );
};

export default AIGenerator;
