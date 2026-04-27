import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FiCalendar, 
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiX,
  FiClock,
  FiSend,
  FiCheckCircle,
  FiAlertCircle,
  FiXCircle
} from 'react-icons/fi';
import { tweetAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const TweetScheduler = () => {
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingTweet, setEditingTweet] = useState(null);
  const [filter, setFilter] = useState('all');
  const [formData, setFormData] = useState({
    content: '',
    scheduledTime: '',
  });

  useEffect(() => {
    fetchTweets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchTweets = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await tweetAPI.getAll(params);
      if (response.data.success) {
        setTweets(response.data.tweets);
      }
    } catch (error) {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.content.trim()) {
      toast.error('Post content is required');
      return;
    }

    if (formData.content.length > 280) {
      toast.error('Post must be 280 characters or less');
      return;
    }

    if (!formData.scheduledTime) {
      toast.error('Publish time is required');
      return;
    }

    const scheduledDate = new Date(formData.scheduledTime);
    if (scheduledDate <= new Date()) {
      toast.error('Publish time must be in the future');
      return;
    }

    setSubmitting(true);
    try {
      if (editingTweet) {
        await tweetAPI.update(editingTweet.id, {
          content: formData.content,
          media: formData.media,
          scheduledTime: scheduledDate.toISOString(),
        });
        toast.success('Post updated successfully');
      } else {
        await tweetAPI.schedule({
          content: formData.content,
          media: formData.media,
          scheduledTime: scheduledDate.toISOString(),
        });
        toast.success('Post scheduled successfully');
      }
      setShowModal(false);
      resetForm();
      fetchTweets();
    } catch (error) {
      toast.error(error.message || 'Failed to save post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await tweetAPI.delete(id);
      toast.success('Post deleted');
      fetchTweets();
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled post?')) return;
    
    try {
      await tweetAPI.cancel(id);
      toast.success('Post cancelled');
      fetchTweets();
    } catch (error) {
      toast.error('Failed to cancel post');
    }
  };

  const handleSendNow = async (id) => {
    if (!window.confirm('Publish this post now?')) return;
    
    try {
      await tweetAPI.sendNow(id);
      toast.success('Post published successfully!');
      fetchTweets();
    } catch (error) {
      toast.error(error.message || 'Failed to publish post');
    }
  };

  const openEditModal = (tweet) => {
    setEditingTweet(tweet);
    const scheduledDate = new Date(tweet.scheduledTime);
    setFormData({
      content: tweet.content,
      scheduledTime: scheduledDate.toISOString().slice(0, 16),
      media: tweet.media,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingTweet(null);
    setFormData({
      content: '',
      scheduledTime: '',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <FiClock className="status-icon pending" />;
      case 'sent':
        return <FiCheckCircle className="status-icon sent" />;
      case 'failed':
        return <FiAlertCircle className="status-icon failed" />;
      case 'cancelled':
        return <FiXCircle className="status-icon cancelled" />;
      default:
        return <FiClock className="status-icon" />;
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="tweet-scheduler animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Content</h1>
          <p>Create, review, and schedule your posts</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <FiPlus size={18} />
          Create Post
        </button>
      </div>

      {/* Filters */}
      <div className="filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button 
          className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          <FiClock size={14} /> Queued
        </button>
        <button 
          className={`filter-btn ${filter === 'sent' ? 'active' : ''}`}
          onClick={() => setFilter('sent')}
        >
          <FiCheckCircle size={14} /> Published
        </button>
        <button 
          className={`filter-btn ${filter === 'failed' ? 'active' : ''}`}
          onClick={() => setFilter('failed')}
        >
          <FiAlertCircle size={14} /> Failed
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : tweets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <FiCalendar />
          </div>
          <h3 className="empty-state-title">
            {filter === 'all' ? 'No posts yet' : `No ${filter} posts`}
          </h3>
          <p className="empty-state-description">
            {filter === 'all' 
              ? 'Start by creating your first post'
              : `You don't have any ${filter} posts yet`
            }
          </p>
          {filter === 'all' && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              Create Your First Post
            </button>
          )}
        </div>
      ) : (
        <div className="tweets-list">
          {tweets.map((tweet) => (
            <div key={tweet.id} className={`tweet-card ${tweet.status}`}>
              <div className="tweet-status">
                {getStatusIcon(tweet.status)}
                <span className={`status-text ${tweet.status}`}>
                  {tweet.status.charAt(0).toUpperCase() + tweet.status.slice(1)}
                </span>
              </div>

              {tweet.media && (
                <div className="tweet-media-preview">
                  <img src={tweet.media.url} alt="Post media" />
                </div>
              )}
              <p className="tweet-content">{tweet.content}</p>

              <div className="tweet-footer">
                <div className="tweet-time">
                  <FiCalendar size={14} />
                  <span>{formatTime(tweet.scheduledTime)}</span>
                </div>

                <div className="tweet-actions">
                  {tweet.status === 'pending' && (
                    <>
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleSendNow(tweet.id)}
                        title="Publish Now"
                      >
                        <FiSend size={14} />
                      </button>
                      <button 
                        className="btn btn-sm btn-ghost"
                        onClick={() => openEditModal(tweet)}
                        title="Edit"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button 
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleCancel(tweet.id)}
                        title="Cancel"
                      >
                        <FiXCircle size={14} />
                      </button>
                    </>
                  )}
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(tweet.id)}
                    title="Delete"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>

              {tweet.error && (
                <div className="tweet-error">
                  <FiAlertCircle size={14} />
                  <span>{tweet.error}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Post Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingTweet ? 'Edit Post' : 'Create Post'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <FiX />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Post Content</label>
                  <textarea
                    className="form-textarea"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Write your post..."
                    rows={4}
                    maxLength={280}
                  />
                  <div className="char-count">
                    <span className={formData.content.length > 260 ? 'warning' : ''}>
                      {formData.content.length}/280
                    </span>
                  </div>
                </div>

                {formData.media && (
                  <div className="form-group">
                    <label className="form-label">Attached Media</label>
                    <div className="modal-media-preview">
                      <img src={formData.media.url} alt="Media preview" />
                      <button 
                        type="button" 
                        className="media-remove-btn" 
                        onClick={() => setFormData({ ...formData, media: null })}
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">
                    <FiClock size={14} /> Publish Time
                  </label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                    min={getMinDateTime()}
                  />
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
                  {submitting ? 'Saving...' : editingTweet ? 'Update Post' : 'Schedule Post'}
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

        .filters {
          display: flex;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-xl);
          flex-wrap: wrap;
        }

        .filter-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-full);
          color: var(--color-text-secondary);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .filter-btn:hover {
          border-color: var(--color-border-light);
        }

        .filter-btn.active {
          background: var(--color-accent-primary);
          border-color: var(--color-accent-primary);
          color: var(--color-bg-primary);
        }

        .tweets-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .tweet-card {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          transition: all var(--transition-normal);
        }

        .tweet-card:hover {
          border-color: var(--color-border-light);
        }

        .tweet-card.cancelled,
        .tweet-card.failed {
          opacity: 0.7;
        }

        .tweet-status {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          margin-bottom: var(--spacing-sm);
        }

        :global(.status-icon) {
          width: 16px;
          height: 16px;
        }

        :global(.status-icon.pending) {
          color: var(--color-warning);
        }

        :global(.status-icon.sent) {
          color: var(--color-success);
        }

        :global(.status-icon.failed) {
          color: var(--color-error);
        }

        :global(.status-icon.cancelled) {
          color: var(--color-text-muted);
        }

        .status-text {
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-text.pending {
          color: var(--color-warning);
        }

        .status-text.sent {
          color: var(--color-success);
        }

        .status-text.failed {
          color: var(--color-error);
        }

        .status-text.cancelled {
          color: var(--color-text-muted);
        }

        .tweet-content {
          font-size: 1rem;
          line-height: 1.5;
          margin-bottom: var(--spacing-md);
        }

        .tweet-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .tweet-time {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .tweet-actions {
          display: flex;
          gap: var(--spacing-xs);
        }

        .tweet-error {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          margin-top: var(--spacing-md);
          padding: var(--spacing-sm);
          background: rgba(239, 68, 68, 0.1);
          border-radius: var(--radius-md);
          font-size: 0.8125rem;
          color: var(--color-error);
        }

        .form-textarea {
          width: 100%;
          padding: var(--spacing-md);
          background: var(--color-bg-tertiary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-primary);
          font-family: inherit;
          font-size: 1rem;
          line-height: 1.5;
          resize: vertical;
          transition: border-color var(--transition-fast);
        }

        .form-textarea:focus {
          outline: none;
          border-color: var(--color-accent-primary);
        }

        .char-count {
          text-align: right;
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-top: var(--spacing-xs);
        }

        .char-count .warning {
          color: var(--color-warning);
        }

        .tweet-media-preview {
          margin-bottom: var(--spacing-md);
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--color-border);
          max-height: 300px;
        }
        .tweet-media-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .modal-media-preview {
          position: relative;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--color-border);
          max-height: 200px;
        }
        .modal-media-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .media-remove-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.5);
          color: white;
          border: none;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .media-remove-btn:hover {
          background: rgba(239, 68, 68, 0.8);
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            gap: var(--spacing-md);
          }

          .tweet-footer {
            flex-direction: column;
            gap: var(--spacing-md);
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default TweetScheduler;
