import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../App';
import { setToken, apiKeysAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

const AuthSuccess = () => {
  const { checkAuth, checkSetup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleAuthSuccess = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setError('No authentication token received');
        setTimeout(() => navigate('/'), 3000);
        return;
      }

      setToken(token);
      
      try {
        await checkAuth();
        // Check if this user has already set up their API keys
        let setupDone = false;
        try {
          const res = await apiKeysAPI.get();
          setupDone = res.data?.status?.setupComplete || false;
          if (checkSetup) await checkSetup();
        } catch {}
        setTimeout(() => {
          navigate(setupDone ? '/dashboard' : '/setup');
        }, 800);
      } catch (err) {
        setError('Failed to verify authentication');
        setTimeout(() => navigate('/'), 3000);
      }
    };

    handleAuthSuccess();
  }, [searchParams, checkAuth, navigate]);

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-icon error">
            <FiAlertCircle size={64} />
          </div>
          <h1>Authentication Error</h1>
          <p>{error}</p>
          <p className="redirect-text">Redirecting to home...</p>
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

          p {
            color: var(--color-text-muted);
            margin-bottom: var(--spacing-md);
          }

          .redirect-text {
            font-size: 0.875rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-icon success">
          <FiCheckCircle size={64} />
        </div>
        <h1>Authentication Successful</h1>
        <p>Redirecting to your dashboard...</p>
        <LoadingSpinner size="small" />
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

        .auth-icon.success {
          color: var(--color-success);
        }

        h1 {
          font-size: 1.5rem;
          margin-bottom: var(--spacing-sm);
        }

        p {
          color: var(--color-text-muted);
          margin-bottom: var(--spacing-lg);
        }
      `}</style>
    </div>
  );
};

export default AuthSuccess;
