import React from 'react';

export const Icon = ({ name, size = 18, className = '' }) => {
  switch (name) {
    case 'shield':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M12 2 4 5v6c0 5.2 3.4 9.4 8 11 4.6-1.6 8-5.8 8-11V5l-8-3z"/>
          <path d="M9 12.2l2 2 4-4.4"/>
        </svg>
      );
    case 'grid':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/>
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/>
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/>
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>
        </svg>
      );
    case 'trending-up':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M3 17l6-6 4 4 8-8"/>
          <path d="M15 7h6v6"/>
        </svg>
      );
    case 'list':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M8 6h13M8 12h13M8 18h13"/>
          <circle cx="3.5" cy="6" r="1.1" fill="currentColor" stroke="none"/>
          <circle cx="3.5" cy="12" r="1.1" fill="currentColor" stroke="none"/>
          <circle cx="3.5" cy="18" r="1.1" fill="currentColor" stroke="none"/>
        </svg>
      );
    case 'alert-triangle':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M10.6 3.9 2 19h20L13.4 3.9a1.6 1.6 0 0 0-2.8 0z"/>
          <path d="M12 9.5v4.2"/>
          <circle cx="12" cy="16.8" r="0.9" fill="currentColor" stroke="none"/>
        </svg>
      );
    case 'image':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect x="3" y="4" width="18" height="16" rx="2.2"/>
          <circle cx="8.5" cy="9.5" r="1.6"/>
          <path d="M21 16l-5.5-5.5a1.6 1.6 0 0 0-2.3 0L5 19"/>
        </svg>
      );
    case 'users':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="9" cy="8" r="3.4"/>
          <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/>
          <path d="M16.5 5.2a3.4 3.4 0 0 1 0 6.6"/>
          <path d="M21.5 20c0-3-1.9-5.2-4.7-5.9"/>
        </svg>
      );
    case 'user':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7"/>
        </svg>
      );
    case 'check-circle':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="12" r="9"/>
          <path d="M8 12.3l2.6 2.6L16.5 9"/>
        </svg>
      );
    case 'help-circle':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="12" r="9"/>
          <path d="M9.5 9.2a2.5 2.5 0 0 1 4.8.9c0 1.7-2.3 2-2.3 3.5"/>
          <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none"/>
        </svg>
      );
    case 'arrow-left':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M19 12H5M11 6l-6 6 6 6"/>
        </svg>
      );
    case 'inbox':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M3 12.5V6.5a1.6 1.6 0 0 1 1.6-1.6h14.8A1.6 1.6 0 0 1 21 6.5v6"/>
          <path d="M3 12.5h5l1.5 3h5l1.5-3h5"/>
          <path d="M3 12.5v5A1.6 1.6 0 0 0 4.6 19h14.8a1.6 1.6 0 0 0 1.6-1.6v-5"/>
        </svg>
      );
    case 'film':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <rect x="3" y="4.5" width="18" height="15" rx="1.6"/>
          <path d="M8 4.5v15M16 4.5v15M3 9.5h5M16 9.5h5M3 14.5h5M16 14.5h5"/>
        </svg>
      );
    case 'sun':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
        </svg>
      );
    case 'moon':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
        </svg>
      );
    default:
      return null;
  }
};
