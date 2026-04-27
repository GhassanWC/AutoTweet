import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { 
  FiZap, 
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiX,
  FiPause,
  FiPlay,
  FiRepeat,
  FiHeart,
  FiMessageCircle,
  FiHash,
  FiAtSign,
  FiKey,
  FiAlertTriangle,
  FiInfo,
  FiCheckCircle
} from 'react-icons/fi';
import { ruleAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

// Twitter API limits
const MAX_KEYWORDS = 15;
const MAX_HASHTAGS = 15;
const MAX_USERS = 15;
const TWITTER_QUERY_LIMIT = 512; // Twitter API character limit

const RuleManager = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    keywords: '',
    hashtags: '',
    users: '',
    engagement: {
      like: true,
      retweet: false,
      reply: false,
    },
    limits: {
      maxPerDay: 50,
      maxPerHour: 10,
    },
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await ruleAPI.getAll();
      if (response.data.success) {
        setRules(response.data.rules);
      }
    } catch (error) {
      toast.error('Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  // Calculate counts for validation
  const formCounts = useMemo(() => {
    const keywordsList = formData.keywords.split(',').filter(k => k.trim());
    const hashtagsList = formData.hashtags.split(',').filter(h => h.trim());
    const usersList = formData.users.split(',').filter(u => u.trim());
    
    // Calculate approximate query length (similar to server-side calculation)
    const keywordsChars = keywordsList.map(k => `"${k.trim()}"`).join(' OR ').length;
    const hashtagsChars = hashtagsList.map(h => h.trim().startsWith('#') ? h.trim() : `#${h.trim()}`).join(' OR ').length;
    const usersChars = usersList.map(u => `from:${u.trim().replace('@', '')}`).join(' OR ').length;
    const totalChars = keywordsChars + hashtagsChars + usersChars + (keywordsList.length > 0 && hashtagsList.length > 0 ? 4 : 0) + (hashtagsList.length > 0 && usersList.length > 0 ? 4 : 0) + 15; // extra for -is:retweet etc
    
    return { 
      keywords: keywordsList.length, 
      hashtags: hashtagsList.length, 
      users: usersList.length, 
      total: keywordsList.length + hashtagsList.length + usersList.length,
      totalChars 
    };
  }, [formData.keywords, formData.hashtags, formData.users]);

  const hasLimitWarning = formCounts.keywords > MAX_KEYWORDS || 
                          formCounts.hashtags > MAX_HASHTAGS || 
                          formCounts.users > MAX_USERS;
  
  const hasCharWarning = formCounts.totalChars > TWITTER_QUERY_LIMIT;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Rule name is required');
      return;
    }

    // Parse comma-separated values
    const ruleData = {
      ...formData,
      keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
      hashtags: formData.hashtags.split(',').map(h => h.trim()).filter(Boolean),
      users: formData.users.split(',').map(u => u.trim()).filter(Boolean),
    };

    if (ruleData.keywords.length === 0 && ruleData.hashtags.length === 0 && ruleData.users.length === 0) {
      toast.error('At least one keyword, hashtag, or user is required');
      return;
    }

    // Warn about limits but still allow
    if (hasLimitWarning) {
      toast.warn('Large rules will be split into multiple queries. Consider creating separate rules for better performance.', { autoClose: 6000 });
    }

    setSubmitting(true);
    try {
      if (editingRule) {
        await ruleAPI.update(editingRule.id, ruleData);
        toast.success('Rule updated successfully');
      } else {
        await ruleAPI.create(ruleData);
        toast.success('Rule created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchRules();
    } catch (error) {
      toast.error(error.message || 'Failed to save rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await ruleAPI.toggle(id);
      toast.success('Rule status updated');
      fetchRules();
    } catch (error) {
      toast.error('Failed to toggle rule');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    
    try {
      await ruleAPI.delete(id);
      toast.success('Rule deleted');
      fetchRules();
    } catch (error) {
      toast.error('Failed to delete rule');
    }
  };

  const openEditModal = (rule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      keywords: rule.keywords?.join(', ') || '',
      hashtags: rule.hashtags?.join(', ') || '',
      users: rule.users?.join(', ') || '',
      engagement: rule.engagement || { like: true, retweet: false, reply: false },
      limits: rule.limits || { maxPerDay: 50, maxPerHour: 10 },
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      description: '',
      keywords: '',
      hashtags: '',
      users: '',
      engagement: { like: true, retweet: false, reply: false },
      limits: { maxPerDay: 50, maxPerHour: 10 },
    });
  };

  return (
    <div className="rule-manager animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Content Strategy</h1>
          <p>Define topics and themes to guide your content</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <FiPlus size={18} />
          Add Topic
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : rules.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <FiZap />
          </div>
          <h3 className="empty-state-title">No topics defined yet</h3>
          <p className="empty-state-description">
            Add content topics to organize your strategy and define what you post about
          </p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Add Your First Topic
          </button>
        </div>
      ) : (
        <div className="rules-grid">
          {rules.map((rule) => (
            <div key={rule.id} className={`rule-card ${!rule.isActive ? 'inactive' : ''}`}>
              <div className="rule-header">
                <h3 className="rule-name">{rule.name}</h3>
                <div className="rule-actions">
                  <button 
                    className={`btn btn-sm ${rule.isActive ? 'btn-ghost' : 'btn-secondary'}`}
                    onClick={() => handleToggle(rule.id)}
                    title={rule.isActive ? 'Pause' : 'Activate'}
                  >
                    {rule.isActive ? <FiPause size={16} /> : <FiPlay size={16} />}
                  </button>
                  <button 
                    className="btn btn-sm btn-ghost"
                    onClick={() => openEditModal(rule)}
                    title="Edit"
                  >
                    <FiEdit2 size={16} />
                  </button>
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(rule.id)}
                    title="Delete"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>

              {rule.description && (
                <p className="rule-description">{rule.description}</p>
              )}

              <div className="rule-targets">
                {rule.keywords?.length > 0 && (
                  <div className="target-group">
                    <FiKey size={14} />
                    <div className="target-tags">
                      {rule.keywords.slice(0, 3).map(k => (
                        <span key={k} className="tag tag-primary">{k}</span>
                      ))}
                      {rule.keywords.length > 3 && (
                        <span className="tag">+{rule.keywords.length - 3}</span>
                      )}
                    </div>
                  </div>
                )}
                
                {rule.hashtags?.length > 0 && (
                  <div className="target-group">
                    <FiHash size={14} />
                    <div className="target-tags">
                      {rule.hashtags.slice(0, 3).map(h => (
                        <span key={h} className="tag">{h}</span>
                      ))}
                      {rule.hashtags.length > 3 && (
                        <span className="tag">+{rule.hashtags.length - 3}</span>
                      )}
                    </div>
                  </div>
                )}
                
                {rule.users?.length > 0 && (
                  <div className="target-group">
                    <FiAtSign size={14} />
                    <div className="target-tags">
                      {rule.users.slice(0, 3).map(u => (
                        <span key={u} className="tag">@{u}</span>
                      ))}
                      {rule.users.length > 3 && (
                        <span className="tag">+{rule.users.length - 3}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="rule-engagement">
                <span className={`engagement-badge ${rule.engagement?.like ? 'active' : ''}`}>
                  <FiHeart size={14} /> Like
                </span>
                <span className={`engagement-badge ${rule.engagement?.retweet ? 'active' : ''}`}>
                  <FiRepeat size={14} /> Retweet
                </span>
                <span className={`engagement-badge ${rule.engagement?.reply ? 'active' : ''}`}>
                  <FiMessageCircle size={14} /> Reply
                </span>
              </div>

              <div className="rule-footer">
                <span className={`status-badge ${rule.isActive ? 'active' : ''}`}>
                  {rule.isActive ? 'Active' : 'Paused'}
                </span>
                <span className="rule-stats">
                  {rule.executionCount || 0} posts
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rule Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingRule ? 'Edit Topic' : 'Add Topic'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <FiX />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Instructions Box */}
                <div className="instructions-box">
                    <div className="instructions-header">
                      <FiInfo size={18} />
                      <h4>How Content Topics Work</h4>
                    </div>
                  <div className="instructions-content">
                      <p className="instructions-intro">
                        Topics help you organize your content strategy around specific themes. 
                        Posts related to <strong>ANY</strong> keyword, hashtag, or creator you define will be part of this topic.
                      </p>
                    
                    <div className="limits-grid">
                      <div className="limit-item">
                        <div className="limit-icon keywords">
                          <FiKey size={16} />
                        </div>
                        <div className="limit-info">
                          <span className="limit-value">{MAX_KEYWORDS}</span>
                          <span className="limit-label">Keywords max</span>
                        </div>
                      </div>
                      <div className="limit-item">
                        <div className="limit-icon hashtags">
                          <FiHash size={16} />
                        </div>
                        <div className="limit-info">
                          <span className="limit-value">{MAX_HASHTAGS}</span>
                          <span className="limit-label">Hashtags max</span>
                        </div>
                      </div>
                      <div className="limit-item">
                        <div className="limit-icon users">
                          <FiAtSign size={16} />
                        </div>
                        <div className="limit-info">
                          <span className="limit-value">{MAX_USERS}</span>
                          <span className="limit-label">Users max</span>
                        </div>
                      </div>
                      <div className="limit-item">
                        <div className="limit-icon chars">
                          <FiCheckCircle size={16} />
                        </div>
                        <div className="limit-info">
                          <span className="limit-value">{TWITTER_QUERY_LIMIT}</span>
                          <span className="limit-label">Chars total</span>
                        </div>
                      </div>
                    </div>

                    <div className="tips-section">
                      <span className="tip"><FiCheckCircle size={12} /> Keep topics focused for content clarity</span>
                      <span className="tip"><FiCheckCircle size={12} /> Create separate topics for different content pillars</span>
                      <span className="tip"><FiCheckCircle size={12} /> Use specific keywords to stay on-brand</span>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Topic Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Startup Growth, AI Tools, Design Tips"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description (optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What this topic covers and why it matters to your audience"
                  />
                </div>

                {/* Targeting Rules Section */}
                <div className="form-section">
                  <div className="section-header">
                    <h4>Topic Keywords & References</h4>
                    <p className="section-hint">Add keywords, hashtags, or creators relevant to this topic. These help organize your content and track related conversations.</p>
                  </div>

                  {/* Live Query Stats */}
                  <div className="query-stats">
                    <div className="stat-row">
                      <span className="stat-label">Query Size:</span>
                      <span className={`stat-value ${hasCharWarning ? 'danger' : formCounts.totalChars > TWITTER_QUERY_LIMIT * 0.8 ? 'warning' : 'ok'}`}>
                        {formCounts.totalChars} / {TWITTER_QUERY_LIMIT} chars
                      </span>
                    </div>
                    <div className="stat-bar">
                      <div 
                        className={`stat-fill ${hasCharWarning ? 'danger' : formCounts.totalChars > TWITTER_QUERY_LIMIT * 0.8 ? 'warning' : 'ok'}`}
                        style={{ width: `${Math.min((formCounts.totalChars / TWITTER_QUERY_LIMIT) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {(hasLimitWarning || hasCharWarning) && (
                    <div className={`limit-warning ${hasCharWarning ? 'danger' : ''}`}>
                      <FiAlertTriangle size={16} />
                      <div>
                        {hasCharWarning ? (
                          <>
                            <strong>Query Too Large:</strong> Your rule exceeds Twitter's {TWITTER_QUERY_LIMIT} character limit. 
                            The system will split this into multiple queries, but for best results, create separate smaller rules.
                          </>
                        ) : (
                          <>
                            <strong>Performance Notice:</strong> You've exceeded recommended item counts. 
                            Consider creating multiple smaller rules for better targeting.
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <div className="label-with-count">
                      <label className="form-label">
                        <FiKey size={14} /> Keywords
                      </label>
                      <span className={`item-count ${formCounts.keywords > MAX_KEYWORDS ? 'warning' : ''}`}>
                        {formCounts.keywords}/{MAX_KEYWORDS} recommended
                      </span>
                    </div>
                    <textarea
                      className="form-textarea"
                      value={formData.keywords}
                      onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                      placeholder="Enter keywords separated by commas&#10;Example: node.js, javascript, react, web development"
                      rows={3}
                    />
                    <div className="input-rules">
                      <span className="rule-item">• Separate with commas</span>
                      <span className="rule-item">• Case-insensitive matching</span>
                      <span className="rule-item">• Use specific terms for better targeting</span>
                    </div>
                    {formData.keywords && (
                      <div className="preview-tags">
                        {formData.keywords.split(',').filter(k => k.trim()).slice(0, 10).map((k, i) => (
                          <span key={i} className="tag tag-primary">{k.trim()}</span>
                        ))}
                        {formData.keywords.split(',').filter(k => k.trim()).length > 10 && (
                          <span className="tag tag-more">+{formData.keywords.split(',').filter(k => k.trim()).length - 10} more</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <div className="label-with-count">
                      <label className="form-label">
                        <FiHash size={14} /> Hashtags
                      </label>
                      <span className={`item-count ${formCounts.hashtags > MAX_HASHTAGS ? 'warning' : ''}`}>
                        {formCounts.hashtags}/{MAX_HASHTAGS} recommended
                      </span>
                    </div>
                    <textarea
                      className="form-textarea"
                      value={formData.hashtags}
                      onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
                      placeholder="Enter hashtags separated by commas&#10;Example: #nodejs, #javascript, #webdev, #coding"
                      rows={3}
                    />
                    <div className="input-rules">
                      <span className="rule-item">• Include # symbol or not (both work)</span>
                      <span className="rule-item">• No spaces in hashtags</span>
                      <span className="rule-item">• Popular hashtags get more matches</span>
                    </div>
                    {formData.hashtags && (
                      <div className="preview-tags">
                        {formData.hashtags.split(',').filter(h => h.trim()).slice(0, 10).map((h, i) => (
                          <span key={i} className="tag">{h.trim().startsWith('#') ? h.trim() : `#${h.trim()}`}</span>
                        ))}
                        {formData.hashtags.split(',').filter(h => h.trim()).length > 10 && (
                          <span className="tag tag-more">+{formData.hashtags.split(',').filter(h => h.trim()).length - 10} more</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <div className="label-with-count">
                      <label className="form-label">
                        <FiAtSign size={14} /> Creators to Follow
                      </label>
                      <span className={`item-count ${formCounts.users > MAX_USERS ? 'warning' : ''}`}>
                        {formCounts.users}/{MAX_USERS} recommended
                      </span>
                    </div>
                    <textarea
                      className="form-textarea"
                      value={formData.users}
                      onChange={(e) => setFormData({ ...formData, users: e.target.value })}
                      placeholder="Enter creator handles separated by commas&#10;Example: naval, sahaborke, levelsio, marc_louvion"
                      rows={3}
                    />
                    <div className="input-rules">
                      <span className="rule-item">• Username only (no @ needed)</span>
                      <span className="rule-item">• Tracks content from these creators</span>
                      <span className="rule-item">• Great for inspiration and benchmarking</span>
                    </div>
                    {formData.users && (
                      <div className="preview-tags">
                        {formData.users.split(',').filter(u => u.trim()).slice(0, 10).map((u, i) => (
                          <span key={i} className="tag tag-user">@{u.trim().replace('@', '')}</span>
                        ))}
                        {formData.users.split(',').filter(u => u.trim()).length > 10 && (
                          <span className="tag tag-more">+{formData.users.split(',').filter(u => u.trim()).length - 10} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Discovery Actions</label>
                  <div className="toggle-group">
                    <label className="toggle">
                      <input
                        type="checkbox"
                        className="toggle-input"
                        checked={formData.engagement.like}
                        onChange={(e) => setFormData({
                          ...formData,
                          engagement: { ...formData.engagement, like: e.target.checked }
                        })}
                      />
                      <span className="toggle-slider"></span>
                      <span className="toggle-label">
                        <FiHeart size={14} /> Like Relevant Posts
                      </span>
                    </label>

                    <label className="toggle">
                      <input
                        type="checkbox"
                        className="toggle-input"
                        checked={formData.engagement.retweet}
                        onChange={(e) => setFormData({
                          ...formData,
                          engagement: { ...formData.engagement, retweet: e.target.checked }
                        })}
                      />
                      <span className="toggle-slider"></span>
                      <span className="toggle-label">
                        <FiRepeat size={14} /> Repost Relevant Content
                      </span>
                    </label>

                    <label className="toggle">
                      <input
                        type="checkbox"
                        className="toggle-input"
                        checked={formData.engagement.reply}
                        onChange={(e) => setFormData({
                          ...formData,
                          engagement: { ...formData.engagement, reply: e.target.checked }
                        })}
                      />
                      <span className="toggle-slider"></span>
                      <span className="toggle-label">
                        <FiMessageCircle size={14} /> Join Conversations
                      </span>
                    </label>
                  </div>
                </div>

                {/* Rate Limits Section */}
                <div className="form-section rate-limits-section">
                  <div className="section-header">
                    <h4>Activity Limits</h4>
                    <p className="section-hint">
                      Set safe daily limits to keep your account in good standing. Lower values are recommended.
                    </p>
                  </div>

                  <div className="rate-tips">
                    <div className="rate-tip safe">
                      <span className="rate-badge">Safe</span>
                      <span>10-20/day, 2-5/hour</span>
                    </div>
                    <div className="rate-tip moderate">
                      <span className="rate-badge">Moderate</span>
                      <span>50-100/day, 10-15/hour</span>
                    </div>
                    <div className="rate-tip aggressive">
                      <span className="rate-badge">Risky</span>
                      <span>100+/day, 20+/hour</span>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Max Actions per Day</label>
                      <input
                        type="number"
                        className="form-input"
                        value={formData.limits.maxPerDay}
                        onChange={(e) => setFormData({
                          ...formData,
                          limits: { ...formData.limits, maxPerDay: parseInt(e.target.value) || 50 }
                        })}
                        min="1"
                        max="1000"
                      />
                      <span className="input-hint">Recommended: 50 or less</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Max Actions per Hour</label>
                      <input
                        type="number"
                        className="form-input"
                        value={formData.limits.maxPerHour}
                        onChange={(e) => setFormData({
                          ...formData,
                          limits: { ...formData.limits, maxPerHour: parseInt(e.target.value) || 10 }
                        })}
                        min="1"
                        max="100"
                      />
                      <span className="input-hint">Recommended: 10 or less</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-ghost"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : editingRule ? 'Update Topic' : 'Save Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--spacing-xl);
        }

        .page-header h1 {
          margin-bottom: var(--spacing-xs);
        }

        .page-header p {
          color: var(--color-text-muted);
        }

        .rules-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-lg);
        }

        .rule-card {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          transition: all var(--transition-normal);
        }

        .rule-card:hover {
          border-color: var(--color-border-light);
        }

        .rule-card.inactive {
          opacity: 0.7;
        }

        .rule-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--spacing-md);
        }

        .rule-name {
          font-size: 1.125rem;
          font-weight: 600;
        }

        .rule-actions {
          display: flex;
          gap: var(--spacing-xs);
        }

        .rule-description {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin-bottom: var(--spacing-md);
        }

        .rule-targets {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-md);
        }

        .target-group {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          color: var(--color-text-muted);
        }

        .target-tags {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-xs);
        }

        .rule-engagement {
          display: flex;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-md);
          flex-wrap: wrap;
        }

        .engagement-badge {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .engagement-badge.active {
          background: rgba(34, 211, 238, 0.15);
          color: var(--color-accent-primary);
        }

        .rule-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: var(--spacing-md);
          border-top: 1px solid var(--color-border);
        }

        .status-badge {
          font-size: 0.75rem;
          padding: var(--spacing-xs) var(--spacing-sm);
          background: rgba(239, 68, 68, 0.15);
          color: var(--color-error);
          border-radius: var(--radius-full);
        }

        .status-badge.active {
          background: rgba(16, 185, 129, 0.15);
          color: var(--color-success);
        }

        .rule-stats {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .modal-lg {
          max-width: 700px;
        }

        .instructions-box {
          background: linear-gradient(135deg, rgba(34, 211, 238, 0.08) 0%, rgba(129, 140, 248, 0.08) 100%);
          border: 1px solid rgba(34, 211, 238, 0.2);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          margin-bottom: var(--spacing-xl);
        }

        .instructions-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-md);
          color: var(--color-accent-primary);
        }

        .instructions-header h4 {
          font-size: 0.9375rem;
          font-weight: 600;
          margin: 0;
        }

        .instructions-content {
          font-size: 0.8125rem;
        }

        .instructions-intro {
          color: var(--color-text-secondary);
          margin-bottom: var(--spacing-md);
          line-height: 1.6;
        }

        .instructions-intro strong {
          color: var(--color-accent-primary);
        }

        .limits-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-md);
        }

        .limit-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          background: var(--color-bg-card);
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
        }

        .limit-icon {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .limit-icon.keywords {
          background: rgba(34, 211, 238, 0.15);
          color: var(--color-accent-primary);
        }

        .limit-icon.hashtags {
          background: rgba(16, 185, 129, 0.15);
          color: var(--color-success);
        }

        .limit-icon.users {
          background: rgba(129, 140, 248, 0.15);
          color: var(--color-accent-secondary);
        }

        .limit-icon.chars {
          background: rgba(245, 158, 11, 0.15);
          color: var(--color-warning);
        }

        .limit-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .limit-value {
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-text-primary);
          line-height: 1.2;
        }

        .limit-label {
          font-size: 0.6875rem;
          color: var(--color-text-muted);
          white-space: nowrap;
        }

        .tips-section {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-xs) var(--spacing-md);
        }

        .tip {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          color: var(--color-success);
        }

        @media (max-width: 600px) {
          .limits-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .form-section {
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-md);
          padding: var(--spacing-lg);
          margin-bottom: var(--spacing-lg);
        }

        .section-header {
          margin-bottom: var(--spacing-lg);
        }

        .section-header h4 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: var(--spacing-xs);
          color: var(--color-text-primary);
        }

        .section-hint {
          font-size: 0.8125rem;
          color: var(--color-text-muted);
          line-height: 1.5;
        }

        .label-with-count {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-xs);
        }

        .item-count {
          font-size: 0.75rem;
          color: var(--color-accent-primary);
          font-weight: 500;
          background: rgba(34, 211, 238, 0.1);
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }

        .item-count.warning {
          color: var(--color-warning);
          background: rgba(245, 158, 11, 0.15);
        }

        .query-stats {
          background: var(--color-bg-secondary);
          border-radius: var(--radius-md);
          padding: var(--spacing-md);
          margin-bottom: var(--spacing-md);
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-xs);
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          font-weight: 500;
        }

        .stat-value {
          font-size: 0.8125rem;
          font-weight: 600;
        }

        .stat-value.ok {
          color: var(--color-success);
        }

        .stat-value.warning {
          color: var(--color-warning);
        }

        .stat-value.danger {
          color: var(--color-error);
        }

        .stat-bar {
          height: 4px;
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .stat-fill {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 0.3s ease, background 0.3s ease;
        }

        .stat-fill.ok {
          background: var(--color-success);
        }

        .stat-fill.warning {
          background: var(--color-warning);
        }

        .stat-fill.danger {
          background: var(--color-error);
        }

        .limit-warning {
          display: flex;
          align-items: flex-start;
          gap: var(--spacing-sm);
          padding: var(--spacing-md);
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-lg);
          font-size: 0.8125rem;
          color: var(--color-warning);
        }

        .limit-warning.danger {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.3);
          color: var(--color-error);
        }

        .limit-warning svg {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .form-textarea {
          width: 100%;
          padding: var(--spacing-md);
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-primary);
          font-family: inherit;
          font-size: 0.875rem;
          line-height: 1.5;
          resize: vertical;
          transition: border-color var(--transition-fast);
        }

        .form-textarea:focus {
          outline: none;
          border-color: var(--color-accent-primary);
        }

        .form-textarea::placeholder {
          color: var(--color-text-muted);
          opacity: 0.7;
        }

        .input-rules {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-sm);
          margin-top: var(--spacing-xs);
          padding: var(--spacing-xs) 0;
        }

        .rule-item {
          font-size: 0.6875rem;
          color: var(--color-text-muted);
          background: var(--color-bg-secondary);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
        }

        .preview-tags {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-xs);
          margin-top: var(--spacing-sm);
          padding: var(--spacing-sm);
          background: var(--color-bg-secondary);
          border-radius: var(--radius-md);
          border: 1px dashed var(--color-border);
        }

        .tag-user {
          background: rgba(129, 140, 248, 0.15);
          color: var(--color-accent-secondary);
        }

        .tag-more {
          background: var(--color-bg-tertiary);
          color: var(--color-text-muted);
          font-style: italic;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-md);
        }

        .rate-limits-section {
          background: var(--color-bg-tertiary);
          margin-top: var(--spacing-lg);
        }

        .rate-tips {
          display: flex;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
          flex-wrap: wrap;
        }

        .rate-tip {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .rate-badge {
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-weight: 600;
          font-size: 0.6875rem;
          text-transform: uppercase;
        }

        .rate-tip.safe .rate-badge {
          background: rgba(16, 185, 129, 0.15);
          color: var(--color-success);
        }

        .rate-tip.moderate .rate-badge {
          background: rgba(245, 158, 11, 0.15);
          color: var(--color-warning);
        }

        .rate-tip.aggressive .rate-badge {
          background: rgba(239, 68, 68, 0.15);
          color: var(--color-error);
        }

        .input-hint {
          display: block;
          font-size: 0.6875rem;
          color: var(--color-text-muted);
          margin-top: var(--spacing-xs);
        }

        .toggle-group {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
        }

        @media (max-width: 1024px) {
          .rules-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            gap: var(--spacing-md);
          }

          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default RuleManager;



