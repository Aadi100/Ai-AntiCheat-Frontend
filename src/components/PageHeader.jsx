import React from 'react';

/**
 * Standardized page header used at the top of every view's content area:
 * title + one-line description on the left, primary actions on the right.
 */
export const PageHeader = ({ title, description, badge, actions, children }) => (
  <div className="page-header">
    <div className="page-header-text">
      <div className="page-header-title">
        {title}
        {badge && <span className="page-header-badge">{badge}</span>}
      </div>
      {description && <p className="page-header-desc">{description}</p>}
    </div>
    {(actions || children) && (
      <div className="page-header-actions">
        {actions}
        {children}
      </div>
    )}
  </div>
);

export default PageHeader;
