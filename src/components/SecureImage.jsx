import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { ORIGIN_BASE } from '../utils/api';

export const useSecureImage = (imagePath) => {
  const [src, setSrc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!imagePath || typeof imagePath !== 'string') {
      setSrc('');
      return;
    }

    // If it's already an external HTTP/HTTPS URL, don't download it through proxy
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      setSrc(imagePath);
      return;
    }

    let active = true;
    let objectUrl = '';

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);
        
        // Convert backslashes to forward slashes
        const normalizedPath = imagePath.replace(/\\/g, '/');
        
        const token = localStorage.getItem('token') || '';
        const url = `${ORIGIN_BASE}/media?path=${encodeURIComponent(normalizedPath)}`;
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to load image: ${response.status}`);
        }
        
        const blob = await response.blob();
        if (active) {
          objectUrl = URL.createObjectURL(blob);
          setSrc(objectUrl);
        }
      } catch (err) {
        if (active) {
          setError(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imagePath]);

  return { src, loading, error };
};

export const SecureImage = ({ src: imagePath, alt, className, style, fallbackIcon = 'help-circle', ...props }) => {
  const { src, loading, error } = useSecureImage(imagePath);

  if (loading) {
    return (
      <div 
        className={`secure-image-loader ${className || ''}`}
        style={{ 
          ...style, 
          display: 'flex', 
          alignItems: 'center', 
          justify: 'center', 
          background: 'var(--bg3)', 
          borderRadius: '6px',
          border: '1px solid var(--border-soft)'
        }} 
      >
        <div className="spinner" style={{ width: '14px', height: '14px' }}></div>
      </div>
    );
  }

  if (error || !src) {
    return (
      <div 
        className={`secure-image-error ${className || ''}`}
        style={{ 
          ...style, 
          display: 'flex', 
          alignItems: 'center', 
          justify: 'center', 
          background: 'var(--bg3)', 
          borderRadius: '6px',
          border: '1px solid var(--border-soft)',
          color: 'var(--fg3)'
        }} 
      >
        <Icon name={fallbackIcon} size={20} />
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} style={style} {...props} />;
};

export default SecureImage;
