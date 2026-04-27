import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiAlertCircle, FiArrowLeft } from 'react-icons/fi';

const AuthError = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const errorMessage = searchParams.get('message') || 'An error occurred during authentication';

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-icon error">
          <FiAlertCircle size={64} />
        </div>
        <h1>Authentication Failed</h1>
        <p className="error-message">{errorMessage}</p>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/')}
        >
          <FiArrowLeft size={18} />
          Back to Home
        </button>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-bg-primary);
          padding: var(--spacing-lg);
        }

        .auth-card {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: var(--spacing-2xl);
          text-align: center;
          max-width: 400px;
          width: 100%;
          animation: slideUp 0.3s ease-out;
        }

        .auth-icon {
          margin-bottom: var(--spacing-lg);
        }

        .auth-icon.error {
          color: var(--color-error);
        }

        h1 {
          font-size: 1.5rem;
          margin-bottom: var(--spacing-sm);
        }

        .error-message {
          color: var(--color-text-muted);
          margin-bottom: var(--spacing-lg);
          padding: var(--spacing-md);
          background: rgba(239, 68, 68, 0.1);
          border-radius: var(--radius-md);
        }
      `}</style>
    </div>
  );
};

export default AuthError;






