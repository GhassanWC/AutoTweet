import React from 'react';
import { useAuth } from '../App';
import { useTheme } from '../context/ThemeContext';
import { FiLogOut, FiSettings, FiBell, FiSun, FiMoon } from 'react-icons/fi';
import { FaXTwitter } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-search">
          {/* Search could go here */}
        </div>
        
        <div className="navbar-actions">
          <button 
            className="btn btn-icon btn-ghost" 
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <FiSun size={20} /> : <FiMoon size={20} />}
          </button>

          <a 
            href={`https://x.com/${user?.twitterUsername}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-icon btn-ghost"
            title="View profile on X"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <FaXTwitter size={18} />
          </a>

          <button className="btn btn-icon btn-ghost" title="Notifications">
            <FiBell size={20} />
          </button>
          <a 
            href={`https://x.com/${user?.twitterUsername}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="navbar-user"
          >
            <img 
              src={user?.profileImageUrl || '/default-avatar.png'} 
              alt={user?.displayName}
              className="navbar-avatar"
              onError={(e) => {
                e.target.src = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png';
              }}
            />
            <div className="navbar-user-info">
              <span className="navbar-user-name">{user?.displayName}</span>
              <span className="navbar-user-handle">@{user?.twitterUsername}</span>
            </div>
          </a>

          <button 
            className="btn btn-icon btn-ghost" 
            title="Settings"
            onClick={() => navigate('/settings')}
          >
            <FiSettings size={20} />
          </button>

          <button 
            className="btn btn-icon btn-ghost" 
            title="Logout"
            onClick={logout}
          >
            <FiLogOut size={20} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .navbar {
          position: fixed;
          top: 0;
          right: 0;
          left: var(--sidebar-width);
          height: var(--navbar-height);
          background: var(--color-bg-primary);
          opacity: 0.95;
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--color-border);
          z-index: 100;
          transition: left var(--transition-normal);
        }

        .sidebar-collapsed ~ .navbar {
          left: var(--sidebar-collapsed-width);
        }

        .navbar-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 100%;
          padding: 0 var(--spacing-xl);
        }

        .navbar-actions {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .navbar-user {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-xs) var(--spacing-md);
          border-radius: var(--radius-full);
          background: var(--color-bg-tertiary);
          cursor: pointer;
          text-decoration: none;
          transition: all var(--transition-fast);
        }

        .navbar-user:hover {
          background: var(--color-bg-hover);
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
        }

        .navbar-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--color-border);
        }

        .navbar-user-info {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }

        .navbar-user-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .navbar-user-handle {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        @media (max-width: 768px) {
          .navbar {
            left: 0;
          }

          .navbar-user-info {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;



