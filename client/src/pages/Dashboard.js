import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// toast is available if needed for future error handling
// import { toast } from 'react-toastify';
import { 
  FiCalendar, 
  FiSend, 
  FiRepeat, 
  FiHeart,
  FiTrendingUp,
  FiClock,
  FiZap,
  FiPlus,
  FiAlertCircle,
  FiCheckCircle
} from 'react-icons/fi';
import { useAuth } from '../App';
import { userAPI, tweetAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    sent: 0,
    failed: 0,
    total: 0,
  });
  const [pendingTweets, setPendingTweets] = useState([]);
  const [engagement, setEngagement] = useState({
    today: { likes: 0, retweets: 0, replies: 0 },
    total: { likes: 0, retweets: 0, replies: 0 },
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, pendingRes, dashboardRes] = await Promise.all([
        tweetAPI.getStats(),
        tweetAPI.getPending(),
        userAPI.getDashboard(),
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }
      if (pendingRes.data.success) {
        setPendingTweets(pendingRes.data.tweets.slice(0, 5));
      }
      if (dashboardRes.data.success) {
        const engagementData = dashboardRes.data.dashboard?.engagement || dashboardRes.data.engagement;
        setEngagement(engagementData || {
          today: { likes: 0, retweets: 0, replies: 0 },
          total: { likes: 0, retweets: 0, replies: 0 },
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Don't show error toast - data might just not exist yet
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="dashboard animate-fade-in">
      <div className="dashboard-header">
        <div className="welcome">
          <h1>Welcome back, {user?.displayName?.split(' ')[0] || 'there'}!</h1>
          <p>Here's an overview of your content workspace</p>
        </div>
        <Link to="/schedule" className="btn btn-primary">
          <FiPlus size={18} />
          Create Post
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon pending">
            <FiClock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">Drafts Queued</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon sent">
            <FiCheckCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.sent}</span>
            <span className="stat-label">Published</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon failed">
            <FiAlertCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.failed}</span>
            <span className="stat-label">Failed</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon total">
            <FiTrendingUp size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Posts</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Upcoming Posts */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <FiCalendar size={20} />
              Upcoming Posts
            </h3>
            <Link to="/schedule" className="card-link">View All</Link>
          </div>
          <div className="card-content">
            {pendingTweets.length === 0 ? (
              <div className="empty-card">
                <FiCalendar size={32} />
                <p>No upcoming posts</p>
                <Link to="/schedule" className="btn btn-sm btn-secondary">
                  Create One
                </Link>
              </div>
            ) : (
              <div className="tweet-list">
                {pendingTweets.map((tweet) => (
                  <div key={tweet.id} className="tweet-item">
                    <p className="tweet-content">{tweet.content}</p>
                    <div className="tweet-meta">
                      <FiClock size={14} />
                      <span>{formatTime(tweet.scheduledTime)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Engagement Stats */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <FiTrendingUp size={20} />
              Performance
            </h3>
          </div>
          <div className="card-content">
            <div className="engagement-section">
              <h4 className="engagement-section-title">Today</h4>
              <div className="engagement-stats">
                <div className="engagement-item">
                  <div className="engagement-icon likes">
                    <FiHeart size={20} />
                  </div>
                  <div className="engagement-info">
                    <span className="engagement-value">{engagement.today?.likes || 0}</span>
                    <span className="engagement-label">Likes</span>
                  </div>
                </div>

                <div className="engagement-item">
                  <div className="engagement-icon retweets">
                    <FiRepeat size={20} />
                  </div>
                  <div className="engagement-info">
                    <span className="engagement-value">{engagement.today?.retweets || 0}</span>
                    <span className="engagement-label">Reposts</span>
                  </div>
                </div>

                <div className="engagement-item">
                  <div className="engagement-icon replies">
                    <FiSend size={20} />
                  </div>
                  <div className="engagement-info">
                    <span className="engagement-value">{engagement.today?.replies || 0}</span>
                    <span className="engagement-label">Replies</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="engagement-section">
              <h4 className="engagement-section-title">All Time</h4>
              <div className="engagement-stats horizontal">
                <div className="engagement-item-compact">
                  <FiHeart size={16} className="icon-likes" />
                  <span className="engagement-value-sm">{engagement.total?.likes || 0}</span>
                </div>
                <div className="engagement-item-compact">
                  <FiRepeat size={16} className="icon-retweets" />
                  <span className="engagement-value-sm">{engagement.total?.retweets || 0}</span>
                </div>
                <div className="engagement-item-compact">
                  <FiSend size={16} className="icon-replies" />
                  <span className="engagement-value-sm">{engagement.total?.replies || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <FiZap size={20} />
              Quick Actions
            </h3>
          </div>
          <div className="card-content">
            <div className="quick-actions">
              <Link to="/workspace?tab=generate" className="action-btn">
                <FiZap size={24} />
                <span>Generate with AI</span>
              </Link>
              <Link to="/workspace?tab=identity" className="action-btn">
                <FiSend size={24} />
                <span>Account Identity</span>
              </Link>
              <Link to="/workspace?tab=pillars" className="action-btn">
                <FiTrendingUp size={24} />
                <span>Content Pillars</span>
              </Link>
              <Link to="/schedule" className="action-btn">
                <FiCalendar size={24} />
                <span>Schedule Post</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--spacing-xl);
        }

        .welcome h1 {
          margin-bottom: var(--spacing-xs);
        }

        .welcome p {
          color: var(--color-text-muted);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--spacing-lg);
          margin-bottom: var(--spacing-xl);
        }

        .stat-card {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          transition: all var(--transition-normal);
        }

        .stat-card:hover {
          border-color: var(--color-border-light);
          transform: translateY(-2px);
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
        }

        .stat-icon.pending {
          background: rgba(245, 158, 11, 0.15);
          color: var(--color-warning);
        }

        .stat-icon.sent {
          background: rgba(16, 185, 129, 0.15);
          color: var(--color-success);
        }

        .stat-icon.failed {
          background: rgba(239, 68, 68, 0.15);
          color: var(--color-error);
        }

        .stat-icon.total {
          background: rgba(34, 211, 238, 0.15);
          color: var(--color-accent-primary);
        }

        .stat-value {
          display: block;
          font-size: 1.75rem;
          font-weight: 700;
          font-family: var(--font-mono);
          line-height: 1;
          margin-bottom: var(--spacing-xs);
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: var(--spacing-lg);
        }

        .card-title {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .card-link {
          font-size: 0.875rem;
          color: var(--color-accent-primary);
          text-decoration: none;
        }

        .card-link:hover {
          text-decoration: underline;
        }

        .empty-card {
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--color-text-muted);
        }

        .empty-card svg {
          margin-bottom: var(--spacing-md);
          opacity: 0.5;
        }

        .empty-card p {
          margin-bottom: var(--spacing-md);
        }

        .tweet-list {
          display: flex;
          flex-direction: column;
        }

        .tweet-item {
          padding: var(--spacing-md);
          border-bottom: 1px solid var(--color-border);
        }

        .tweet-item:last-child {
          border-bottom: none;
        }

        .tweet-content {
          font-size: 0.9375rem;
          margin-bottom: var(--spacing-sm);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .tweet-meta {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .engagement-stats {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .engagement-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-sm) 0;
        }

        .engagement-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
        }

        .engagement-icon.likes {
          background: rgba(239, 68, 68, 0.15);
          color: var(--color-error);
        }

        .engagement-icon.retweets {
          background: rgba(16, 185, 129, 0.15);
          color: var(--color-success);
        }

        .engagement-icon.replies {
          background: rgba(34, 211, 238, 0.15);
          color: var(--color-accent-primary);
        }

        .engagement-value {
          display: block;
          font-size: 1.25rem;
          font-weight: 700;
          font-family: var(--font-mono);
        }

        .engagement-label {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .engagement-section {
          margin-bottom: var(--spacing-lg);
        }

        .engagement-section:last-child {
          margin-bottom: 0;
        }

        .engagement-section-title {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: var(--spacing-sm);
          padding-bottom: var(--spacing-xs);
          border-bottom: 1px solid var(--color-border);
        }

        .engagement-stats.horizontal {
          flex-direction: row;
          justify-content: space-around;
        }

        .engagement-item-compact {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
        }

        .engagement-value-sm {
          font-size: 1rem;
          font-weight: 600;
          font-family: var(--font-mono);
        }

        .icon-likes {
          color: var(--color-error);
        }

        .icon-retweets {
          color: var(--color-success);
        }

        .icon-replies {
          color: var(--color-accent-primary);
        }

        .quick-actions {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--color-bg-tertiary);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          text-decoration: none;
          transition: all var(--transition-fast);
        }

        .action-btn:hover {
          background: var(--color-bg-hover);
          color: var(--color-accent-primary);
        }

        @media (max-width: 1200px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .dashboard-header {
            flex-direction: column;
            gap: var(--spacing-md);
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
