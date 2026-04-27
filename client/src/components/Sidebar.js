import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FiHome, 
  FiCalendar, 
  FiEdit3,
  FiSettings, 
  FiChevronLeft,
  FiSliders,
  FiZap,
  FiUser,
  FiBriefcase,
  FiBookOpen,
  FiKey
} from 'react-icons/fi';
import { useAuth } from '../App';

const Sidebar = ({ isOpen, onToggle }) => {
  const { setupComplete } = useAuth();
  const navItems = [
    { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/workspace', icon: FiBriefcase, label: 'Workspace' },
    { path: '/schedule', icon: FiCalendar, label: 'Content' },
    { path: '/rules', icon: FiSliders, label: 'Strategy' },
    { path: '/setup', icon: FiKey, label: 'API Keys', badge: !setupComplete },
    { path: '/guide', icon: FiBookOpen, label: 'Guide' },
    { path: '/settings', icon: FiSettings, label: 'Settings' },
  ];

  return (
    <aside className={`sidebar ${isOpen ? '' : 'collapsed'}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <FiEdit3 size={22} />
          </div>
          {isOpen && <span className="logo-text">AutoTweet</span>}
        </div>
        <button className="sidebar-toggle" onClick={onToggle}>
          <FiChevronLeft size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `sidebar-link ${isActive ? 'active' : ''}`
            }
            title={item.label}
          >
            <span style={{ position: 'relative' }}>
              <item.icon size={22} />
              {item.badge && <span style={{
                position: 'absolute', top: -3, right: -3,
                width: 8, height: 8, borderRadius: '50%',
                background: '#ef4444', display: 'block'
              }} />}
            </span>
            {isOpen && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {isOpen && (
          <div className="sidebar-version">
            <span>v1.0.0</span>
          </div>
        )}
      </div>

      <style jsx>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: var(--sidebar-width);
          height: 100vh;
          background: var(--color-bg-secondary);
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          transition: width var(--transition-normal);
          z-index: 200;
        }

        .sidebar.collapsed {
          width: var(--sidebar-collapsed-width);
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-lg);
          border-bottom: 1px solid var(--color-border);
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .logo-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-accent-gradient);
          border-radius: var(--radius-lg);
          color: var(--color-bg-primary);
        }

        .logo-text {
          font-size: 1.25rem;
          font-weight: 700;
          background: var(--color-accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .sidebar-toggle {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-bg-tertiary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .sidebar-toggle:hover {
          background: var(--color-bg-hover);
          color: var(--color-text-primary);
        }

        .sidebar.collapsed .sidebar-toggle svg {
          transform: rotate(180deg);
        }

        .sidebar-nav {
          flex: 1;
          padding: var(--spacing-md);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          color: var(--color-text-secondary);
          text-decoration: none;
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
          font-weight: 500;
        }

        .sidebar-link:hover {
          background: var(--color-bg-hover);
          color: var(--color-text-primary);
        }

        .sidebar-link.active {
          background: rgba(129, 140, 248, 0.1);
          color: var(--color-accent-secondary);
        }

        .sidebar-link.active::before {
          content: '';
          position: absolute;
          left: 0;
          width: 3px;
          height: 24px;
          background: var(--color-accent-secondary);
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
        }

        .sidebar.collapsed .sidebar-link {
          justify-content: center;
          padding: var(--spacing-md);
        }

        .sidebar-footer {
          padding: var(--spacing-md);
          border-top: 1px solid var(--color-border);
        }

        .sidebar-version {
          text-align: center;
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
          }

          .sidebar.open {
            transform: translateX(0);
          }
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
