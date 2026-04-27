import React from 'react';

const LoadingSpinner = ({ fullScreen = false, size = 'default' }) => {
  const sizeStyles = {
    small: { width: '24px', height: '24px', borderWidth: '2px' },
    default: { width: '48px', height: '48px', borderWidth: '3px' },
    large: { width: '64px', height: '64px', borderWidth: '4px' },
  };

  return (
    <div className={`spinner-container ${fullScreen ? 'fullscreen' : ''}`}>
      <div 
        className="spinner" 
        style={sizeStyles[size] || sizeStyles.default}
      />
    </div>
  );
};

export default LoadingSpinner;






