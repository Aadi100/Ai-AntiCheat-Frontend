import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Icon } from './Icon';
import { SecureImage } from './SecureImage';
import { ALERT_TYPE_META, alertMeta } from '../utils/alertTypes';

export const AppLayout = ({ children }) => {
  const {
    theme,
    toggleTheme,
    logout,
    toasts,
    removeToast,
    planBannerVisible,
    dismissPlanBanner,
    billingSummary,
    lightbox,
    closeLightbox,
    stepLightbox,
    cardModal,
    closeCardModal,
    sessionModal,
    closeSessionModal,
    alertsCount,
    openLightbox,
    role,
    switchBranch
  } = useApp();

  const navigate = useNavigate();
  const location = useLocation();

  // Clock
  const [clockTime, setClockTime] = useState(new Date().toLocaleString());
  useEffect(() => {
    const timer = setInterval(() => {
      setClockTime(new Date().toLocaleString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Watermark local timezone conversions
  const formatEpoch = (epoch) => {
    if (!epoch) return '';
    const d = new Date(epoch * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
           pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  };

  // Sidebar links definition
  const navSections = [
    {
      title: 'Overview',
      links: [
        { path: '/dashboard', label: 'Dashboard', icon: 'grid' },
        { path: '/analytics', label: 'Analytics', icon: 'trending-up' },
        { path: '/reports', label: 'Reports', icon: 'list' },
        { path: '/server-usage', label: 'Server Usage', icon: 'trending-up' },
        { path: '/billing', label: 'Billing', icon: 'list' }
      ]
    },
    {
      title: 'Activity',
      links: [
        { path: '/log', label: 'Entry Log', icon: 'list' },
        {
          path: '/alerts',
          label: 'Alerts',
          icon: 'alert-triangle',
          badge: true
        }
      ]
    },
    {
      title: 'Identity',
      links: [
        { path: '/persons', label: 'Persons', icon: 'users' }
      ]
    },
    {
      title: 'Control',
      links: [
        { path: '/dataset', label: 'Dataset', icon: 'layers' },
        { path: '/camera', label: 'Camera', icon: 'grid' },
        { path: '/test-camera', label: 'Test Camera', icon: 'camera' },
        { path: '/web-settings', label: 'Settings', icon: 'trending-up' }
      ]
    },
    {
      title: 'Administration',
      links: [
        { path: '/organization', label: 'Organization', icon: 'shield' }
      ]
    }
  ];

  // Active label helper
  const getPageTitle = () => {
    if (location.pathname === '/dashboard') return 'Dashboard Overview';
    const flatLinks = navSections.flatMap(s => s.links);
    const matched = flatLinks.find(l => location.pathname === l.path);
    if (matched) return matched.label;
    if (location.pathname.startsWith('/person/')) return 'Person Details';
    if (location.pathname.startsWith('/unknown/')) return 'Unknown Person Details';
    if (location.pathname === '/billing/checkout') return 'Checkout';
    return 'FitnessMarvel AntiCheat';
  };

  return (
    <>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div style={{ background: '#7c6cf0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>
              A
            </div>
          </div>
          <div>
            <div className="brand">FitnessMarvel AntiCheat</div>
            <div className="sub">Surveillance</div>
          </div>
        </div>
        <nav>
          {navSections.map((section, idx) => (
            <React.Fragment key={idx}>
              <div className="nav-section" style={idx > 0 ? { marginTop: '10px' } : {}}>
                {section.title}
              </div>
              {section.links.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <span className="icon">
                    <Icon name={link.icon} size={16} />
                  </span>
                  <span>{link.label}</span>
                  {link.badge && alertsCount > 0 && (
                    <span className="nav-badge">{alertsCount > 99 ? '99+' : alertsCount}</span>
                  )}
                </NavLink>
              ))}
            </React.Fragment>
          ))}
          
          {(role === 'super_admin' || role === 'org_admin') && (
            <>
              <div className="nav-section" style={{ marginTop: '20px' }}>Scope</div>
              <button
                onClick={() => { switchBranch(); navigate(role === 'super_admin' ? '/select-organization' : '/select-branch'); }}
                className="nav-link"
                style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
              >
                <span className="icon"><Icon name="refresh-cw" size={16} /></span>
                <span>Switch Branch</span>
              </button>
            </>
          )}

          <div className="nav-section" style={{ marginTop: '20px' }}>Auth</div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="nav-link"
            style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
          >
            <span className="icon"><Icon name="log-out" size={16} /></span>
            <span>Sign Out</span>
          </button>
        </nav>
        <div className="sidebar-foot">
          <span className="dot-live"></span>
          <span>Live</span>
        </div>
      </aside>

      {/* Main Container */}
      <div className="main">
        {/* Topbar */}
        <div className="topbar">
          <span className="topbar-title">{getPageTitle()}</span>
          <div className="topbar-right">
            <span className="status-pill">
              <span className="dot-live"></span> Online
            </span>
            <span className="topbar-clock mono">{clockTime}</span>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              title="Toggle dark / light theme"
              aria-label="Toggle theme"
            >
              <Icon name={theme === 'light' ? 'moon' : 'sun'} size={16} />
            </button>
          </div>
        </div>

        {/* Free Plan Banner */}
        {planBannerVisible && billingSummary && (
          <div className={`plan-banner ${billingSummary.amount_due > 0 ? 'over' : ''}`}>
            <span className="plan-banner-icon">✦</span>
            <span className="plan-banner-text">
              {billingSummary.amount_due > 0 ? (
                `Free plan exceeded this month — $${(billingSummary.amount_due || 0).toFixed(2)} accrued so far (${billingSummary.billable_search || 0} extra searched, ${billingSummary.billable_training || 0} extra trained).`
              ) : (
                `Free Plan — ${billingSummary.search_total || 0} / ${billingSummary.free_search_limit || 0} searched images, ${billingSummary.training_total || 0} / ${billingSummary.free_training_limit || 0} trained images used this month.`
              )}
            </span>
            <Link
              className="plan-banner-btn"
              to={`/billing/checkout?month=${billingSummary.month || ''}`}
            >
              {billingSummary.amount_due > 0 ? 'View Bill' : 'Upgrade'}
            </Link>
            <button
              className="plan-banner-close"
              onClick={dismissPlanBanner}
              aria-label="Dismiss"
              title="Dismiss for this month"
            >
              &times;
            </button>
          </div>
        )}


        {/* Main Content Area */}
        <div className="content">
          {children}
        </div>
      </div>

      {/* Toast Stack */}
      <div className="toast-stack">
        {toasts.map((t) => {
          const isAlert = t.type in ALERT_TYPE_META;
          const alertIcon = { unknown_entry: 'alert-triangle', face_hidden: 'help-circle', expired_membership: 'lock' };
          const icon = isAlert
            ? (alertIcon[t.type] || 'alert-triangle')
            : (t.type === 'success' ? 'check-circle' : 'alert-triangle');
          const title = isAlert
            ? `${alertMeta(t.type).label} detected`
            : (t.title || 'Notification');
          const subtitle = isAlert ? t.triggered_at : t.message;
          const toastVariant = isAlert
            ? (t.type === 'face_hidden' ? 'toast-warn' : t.type === 'expired_membership' ? 'toast-info' : '')
            : (t.type === 'error' ? 'toast-warn' : '');

          return (
            <div
              key={t.id}
              className={`toast ${toastVariant}`}
              onClick={() => {
                removeToast(t.id);
                if (isAlert) navigate('/alerts');
              }}
            >
              <span className="toast-icon">
                <Icon name={icon} size={18} />
              </span>
              <span className="toast-body">
                <div className="toast-title">{title}</div>
                <div className="toast-time">{subtitle}</div>
              </span>
              <button
                className="toast-close"
                aria-label="Dismiss"
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(t.id);
                }}
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>


      {/* Shared Lightbox */}
      {lightbox.open && (
        <div className="lightbox open" onClick={(e) => e.target === e.currentTarget && closeLightbox()}>
          <button className="lightbox-close" onClick={closeLightbox}>✕</button>
          <button className="lightbox-nav lightbox-prev" onClick={() => stepLightbox(-1)}>‹</button>
          <SecureImage className="lightbox-img" src={lightbox.images[lightbox.index]} alt="Lightbox Zoom" />
          <button className="lightbox-nav lightbox-next" onClick={() => stepLightbox(1)}>›</button>
          <div className="lightbox-counter">{lightbox.index + 1} / {lightbox.images.length}</div>
        </div>
      )}

      {/* Card Modal */}
      {cardModal.open && cardModal.data && (
        <div className="lightbox open" onClick={(e) => e.target === e.currentTarget && closeCardModal()}>
          <button className="lightbox-close" onClick={closeCardModal}>✕</button>
          <div className="card-modal-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <span className={`badge ${alertMeta(cardModal.data.type).badgeClass}`}>{alertMeta(cardModal.data.type).label}</span>
              </div>
              <span className="mono js-time" style={{ color: '#9a9db3', fontSize: '12px' }}>
                {cardModal.data.time || formatEpoch(cardModal.data.time_epoch)}
              </span>
            </div>
            
            <div className="card-modal-imgs">
              {cardModal.data.crop && (
                <SecureImage
                  className="card-modal-img"
                  src={cardModal.data.crop}
                  alt="crop"
                  onClick={() => openLightbox([cardModal.data.crop, cardModal.data.image].filter(Boolean), 0)}
                />
              )}
              {cardModal.data.image && (
                <SecureImage
                  className="card-modal-img"
                  src={cardModal.data.image}
                  alt="scene"
                  onClick={() => openLightbox([cardModal.data.crop, cardModal.data.image].filter(Boolean), cardModal.data.crop ? 1 : 0)}
                />
              )}
            </div>

            {cardModal.data.seen_with && cardModal.data.seen_with.length > 0 && (
              <div className="seen-with">
                Entered with: <span>{cardModal.data.seen_with.join(', ')}</span>
              </div>
            )}

            {cardModal.data.detection_id && (
              <div className="alert-meta">Detection ID: {cardModal.data.detection_id}</div>
            )}
          </div>
        </div>
      )}

      {/* Session Modal */}
      {sessionModal.open && sessionModal.data && (
        <div className="lightbox open" onClick={(e) => e.target === e.currentTarget && closeSessionModal()}>
          <button className="lightbox-close" onClick={closeSessionModal}>✕</button>
          <div className="card-modal-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: '700' }}>
                {sessionModal.data.time} 
                {sessionModal.data.end_time && sessionModal.data.end_time !== sessionModal.data.time && (
                  ` → ${sessionModal.data.end_time}`
                )}
              </span>
              <span className={`badge ${
                sessionModal.data.trigger === 'ping' ? 'badge-blue' :
                sessionModal.data.trigger === 'grab' ? 'badge-ok' :
                sessionModal.data.trigger === 'burst' ? 'badge-blue' : 'badge-muted'
              }`}>
                {sessionModal.data.trigger}
              </span>
            </div>

            <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {sessionModal.data.known_count > 0 && (
                <span className="badge badge-ok">{sessionModal.data.known_count} known</span>
              )}
              {sessionModal.data.unknown_count > 0 && (
                <span className="badge badge-err">{sessionModal.data.unknown_count} unknown</span>
              )}
              <span className="badge badge-muted">
                {sessionModal.data.frame_count} image{sessionModal.data.frame_count !== 1 ? 's' : ''}
              </span>
            </div>

            <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {sessionModal.data.location && (
                <span className="loc-badge">{sessionModal.data.location}</span>
              )}
              {sessionModal.data.action && (
                <span className="action-badge">{sessionModal.data.action}</span>
              )}
            </div>

            <div className="card-modal-imgs" style={{ marginTop: '14px' }}>
              {sessionModal.data.images.map((img, i) => (
                <SecureImage
                  key={i}
                  className="card-modal-img"
                  src={img}
                  alt={`session frame ${i}`}
                  onClick={() => openLightbox(sessionModal.data.images, i)}
                />
              ))}
            </div>

            {sessionModal.data.known_names && sessionModal.data.known_names.length > 0 && (
              <div className="seen-with" style={{ marginTop: '14px' }}>
                Known: <span>{sessionModal.data.known_names.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
