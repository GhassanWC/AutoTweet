import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FiUser, 
  FiSettings,
  FiShield,
  FiTrash2,
  FiCalendar,
  FiEdit3,
  FiBarChart2,
  FiAlertTriangle
} from 'react-icons/fi';
import { userAPI } from '../services/api';
import { useAuth } from '../App';
import LoadingSpinner from '../components/LoadingSpinner';

const Settings = () => {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      if (response.data.success) {
        setSettings(response.data.profile.settings);
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await userAPI.updateSettings(settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== user?.twitterUsername) {
      toast.error('Please type your username to confirm');
      return;
    }

    try {
      await userAPI.deleteAccount();
      toast.success('Account deleted successfully');
      logout();
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="settings animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your account and content preferences</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* Profile Section */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <FiUser size={20} />
              Profile
            </h3>
          </div>
          <div className="card-content">
            <div className="profile-info">
              <img 
                src={user?.profileImageUrl || '/default-avatar.png'}
                alt={user?.displayName}
                className="profile-avatar"
                onError={(e) => {
                  e.target.src = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png';
                }}
              />
              <div className="profile-details">
                <h4>{user?.displayName}</h4>
                <span className="text-muted">@{user?.twitterUsername}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Publishing Settings */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <FiSettings size={20} />
              Publishing Preferences
            </h3>
          </div>
          <div className="card-content">
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">
                  <FiEdit3 size={16} /> Content Discovery
                </span>
                <span className="setting-description">
                  Surface relevant posts in your niche to inspire content ideas
                </span>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  className="toggle-input"
                  checked={settings?.retweet || false}
                  onChange={(e) => setSettings({ ...settings, retweet: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">
                  <FiBarChart2 size={16} /> Performance Tracking
                </span>
                <span className="setting-description">
                  Track engagement metrics on published posts to improve your strategy
                </span>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  className="toggle-input"
                  checked={settings?.like || false}
                  onChange={(e) => setSettings({ ...settings, like: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">
                  <FiCalendar size={16} /> Smart Scheduling
                </span>
                <span className="setting-description">
                  Get publish time suggestions based on when your audience is most active
                </span>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  className="toggle-input"
                  checked={settings?.reply || false}
                  onChange={(e) => setSettings({ ...settings, reply: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="divider" style={{ margin: 'var(--spacing-md) 0', borderTop: '1px solid var(--color-border)' }}></div>

            <div className="form-group">
              <label className="form-label">Default AI Image Provider</label>
              <select 
                className="form-input"
                value={settings?.defaultImageProvider || 'openai'}
                onChange={(e) => setSettings({ ...settings, defaultImageProvider: e.target.value })}
              >
                <option value="openai">OpenAI (DALL-E 3)</option>
                <option value="gemini">Google Gemini (Imagen)</option>
              </select>
              <span className="form-hint">Choose which AI model to use for image generation by default.</span>
            </div>
          </div>
        </div>

        {/* Daily Limits */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <FiShield size={20} />
              Daily Limits
            </h3>
          </div>
          <div className="card-content">
            <div className="form-group">
              <label className="form-label">Max Posts per Day</label>
              <input
                type="number"
                className="form-input"
                value={settings?.maxDailyTweets || 50}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  maxDailyTweets: parseInt(e.target.value) || 50 
                })}
                min="1"
                max="1000"
              />
              <span className="form-hint">Maximum posts to publish per day</span>
            </div>

            <div className="form-group">
              <label className="form-label">Max Reposts per Day</label>
              <input
                type="number"
                className="form-input"
                value={settings?.maxDailyRetweets || 100}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  maxDailyRetweets: parseInt(e.target.value) || 100 
                })}
                min="1"
                max="1000"
              />
              <span className="form-hint">Maximum reposts per day to stay within platform guidelines</span>
            </div>

            <div className="form-group">
              <label className="form-label">Max Likes per Day</label>
              <input
                type="number"
                className="form-input"
                value={settings?.maxDailyLikes || 200}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  maxDailyLikes: parseInt(e.target.value) || 200 
                })}
                min="1"
                max="2000"
              />
              <span className="form-hint">Maximum likes per day to stay within platform guidelines</span>
            </div>

            <button 
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card danger-zone">
          <div className="card-header">
            <h3 className="card-title danger">
              <FiAlertTriangle size={20} />
              Danger Zone
            </h3>
          </div>
          <div className="card-content">
            <div className="danger-item">
              <div className="danger-info">
                <h4>Delete Account</h4>
                <p>
                  Permanently delete your account, content, and all associated data. 
                  This action cannot be undone.
                </p>
              </div>
              <button 
                className="btn btn-danger"
                onClick={() => setShowDeleteModal(true)}
              >
                <FiTrash2 size={16} />
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title danger">Delete Account</h3>
              <button 
                className="modal-close"
                onClick={() => setShowDeleteModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="delete-warning">
                <FiAlertTriangle size={48} />
                <p>
                  This will permanently delete your account, all your content topics, 
                  scheduled posts, and performance data.
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">
                  Type <strong>@{user?.twitterUsername}</strong> to confirm
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder={`@${user?.twitterUsername}`}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-ghost"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== user?.twitterUsername}
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-header {
          margin-bottom: var(--spacing-xl);
        }

        .page-header h1 {
          margin-bottom: var(--spacing-xs);
        }

        .page-header p {
          color: var(--color-text-muted);
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-lg);
        }

        .card-title {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .card-title.danger {
          color: var(--color-error);
        }

        .profile-info {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
        }

        .profile-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 3px solid var(--color-border);
        }

        .profile-details h4 {
          font-size: 1.25rem;
          margin-bottom: var(--spacing-xs);
        }

        .setting-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-md) 0;
          border-bottom: 1px solid var(--color-border);
        }

        .setting-item:last-child {
          border-bottom: none;
        }

        .setting-label {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-weight: 500;
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-xs);
        }

        .setting-description {
          display: block;
          font-size: 0.8125rem;
          color: var(--color-text-muted);
        }

        .form-hint {
          display: block;
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-top: var(--spacing-xs);
        }

        .danger-zone {
          grid-column: span 2;
          border-color: rgba(239, 68, 68, 0.3);
        }

        .danger-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-lg);
        }

        .danger-info h4 {
          margin-bottom: var(--spacing-xs);
        }

        .danger-info p {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .delete-warning {
          text-align: center;
          padding: var(--spacing-lg);
          color: var(--color-error);
        }

        .delete-warning svg {
          margin-bottom: var(--spacing-md);
        }

        .delete-warning p {
          color: var(--color-text-secondary);
        }

        .modal-title.danger {
          color: var(--color-error);
        }

        @media (max-width: 1024px) {
          .settings-grid {
            grid-template-columns: 1fr;
          }

          .danger-zone {
            grid-column: span 1;
          }
        }

        @media (max-width: 768px) {
          .danger-item {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default Settings;
