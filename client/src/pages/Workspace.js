import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiZap, FiUser, FiLayers, FiBriefcase } from 'react-icons/fi';
import AIGenerator from './AIGenerator';
import BrandVoice from './BrandVoice';
import ContentPillars from './ContentPillars';

const Workspace = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'generate';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tab = queryParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [location.search]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/workspace?tab=${tab}`, { replace: true });
  };

  const tabs = [
    { id: 'generate', label: 'Generate', icon: FiZap, component: AIGenerator },
    { id: 'identity', label: 'Identity', icon: FiUser, component: BrandVoice },
    { id: 'pillars', label: 'Pillars', icon: FiLayers, component: ContentPillars },
  ];

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || AIGenerator;

  return (
    <div className="workspace-page animate-fade-in">
      <div className="workspace-header">
        <div className="workspace-title">
          <FiBriefcase size={24} className="text-accent" />
          <h1>Workspace</h1>
        </div>
        
        <div className="workspace-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`workspace-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
              {activeTab === tab.id && <div className="tab-indicator" />}
            </button>
          ))}
        </div>
      </div>

      <div className="workspace-content">
        <ActiveComponent />
      </div>

      <style jsx>{`
        .workspace-page {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .workspace-header {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: var(--spacing-md) var(--spacing-xl);
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: var(--shadow-sm);
        }

        .workspace-title {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .workspace-title h1 {
          font-size: 1.5rem;
          margin: 0;
        }

        .text-accent {
          color: var(--color-accent-primary);
        }

        .workspace-tabs {
          display: flex;
          gap: var(--spacing-sm);
          background: var(--color-bg-primary);
          padding: 4px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
        }

        .workspace-tab {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-lg);
          background: transparent;
          border: none;
          color: var(--color-text-secondary);
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          border-radius: var(--radius-md);
          position: relative;
        }

        .workspace-tab:hover {
          color: var(--color-text-primary);
          background: var(--color-bg-hover);
        }

        .workspace-tab.active {
          color: var(--color-accent-primary);
          background: var(--color-bg-card);
          box-shadow: var(--shadow-sm);
        }

        .tab-indicator {
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 3px;
          background: var(--color-accent-primary);
          border-radius: 3px 3px 0 0;
          display: none; /* Using background highlight instead */
        }

        .workspace-content {
          animation: slide-up 0.4s ease-out;
        }

        @keyframes slide-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 992px) {
          .workspace-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-md);
          }
          
          .workspace-tabs {
            width: 100%;
            justify-content: space-between;
          }
          
          .workspace-tab {
            flex: 1;
            justify-content: center;
          }
        }

        @media (max-width: 576px) {
          .workspace-tab span {
            display: none;
          }
          .workspace-tab {
            padding: var(--spacing-md);
          }
        }
      `}</style>
    </div>
  );
};

export default Workspace;
