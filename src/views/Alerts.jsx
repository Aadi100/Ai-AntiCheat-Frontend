import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { SecureImage } from '../components/SecureImage';
import { fetchAlerts } from '../utils/api';
import { alertMeta } from '../utils/alertTypes';

export const Alerts = () => {
  const { openCardModal } = useApp();
  const [alertList, setAlertList] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetchAlerts(page, 20);
      if (res.ok) {
        if (res.data && (res.data.response_code === 'SUCCESS' || res.data.response_code === 200)) {
          const respData = res.data.response_data || {};
          setAlertList(respData.data || []);
          setTotalRecords(respData.total || 0);
          setTotalPages(Math.ceil((respData.total || 0) / (respData.per_page || 20)) || 1);
        } else {
          setError(res.data?.response_message || 'Unexpected response format from server');
        }
      } else {
        if (res.status === 404) {
          setError('Alerts endpoint not found (404). Please verify your backend server routes.');
        } else if (res.status === 401) {
          setError('Unauthorized (401). Please check credentials or log in again.');
        } else if (res.status === 0) {
          setError('Connection refused. Please verify the Flask backend is running on http://127.0.0.1:5050.');
        } else {
          setError(`Server error ${res.status}: ${res.data?.response_message || 'Unknown error'}`);
        }
      }
    } catch (err) {
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [page]);

  const filteredAlerts = filterType === 'all'
    ? alertList
    : alertList.filter(a => a && a.type === filterType);

  return (
    <div>
      <PageHeader
        title="Security Alerts"
        description="Unknown-entry, face-hidden, and expired-membership violations flagged by the surveillance pipeline."
        badge={`${totalRecords} total`}
      />

      {/* Alert Type Filters */}
      <div className="filter-bar">
        <button
          className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => setFilterType('all')}
        >
          All Violations
        </button>
        <button
          className={`filter-btn ${filterType === 'unknown_entry' ? 'active' : ''}`}
          onClick={() => setFilterType('unknown_entry')}
        >
          🚨 Unknown Entries
        </button>
        <button
          className={`filter-btn ${filterType === 'face_hidden' ? 'active' : ''}`}
          onClick={() => setFilterType('face_hidden')}
        >
          🫣 Hidden Faces
        </button>
        <button
          className={`filter-btn ${filterType === 'expired_membership' ? 'active' : ''}`}
          onClick={() => setFilterType('expired_membership')}
        >
          ⏳ Expired Memberships
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', gap: '12px' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,.15)', borderTopColor: 'var(--accent)' }}></div>
          <span className="text-muted">Loading alerts...</span>
        </div>
      ) : error ? (
        <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
          <div className="banner-err" style={{ width: '100%', maxWidth: '600px', margin: 0 }}>
            ⚠️ {error}
          </div>
          <button className="btn btn-primary" onClick={loadAlerts}>
            🔄 Retry Loading Alerts
          </button>
        </div>
      ) : filteredAlerts.length > 0 ? (
        <div>
          <div className="alert-grid">
            {filteredAlerts.map((a, idx) => {
              if (!a) return null;
              const seenWithNames = Array.isArray(a.seen_with) ? a.seen_with.map(s => s.name || s) : [];
              const meta = alertMeta(a.type);
              const cardData = {
                type: a.type,
                crop: a.crop_path,
                image: a.image_path,
                time: a.triggered_at,
                time_epoch: a.triggered_at_epoch,
                seen_with: seenWithNames,
                detection_id: a.detection_id || a.id || a._id
              };

              return (
                <div
                  key={a.id || a._id || idx}
                  className={`alert-card ${meta.cardClass}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => openCardModal(cardData)}
                >
                  <div className="alert-card-body">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div>
                        <span className={`badge ${meta.badgeClass}`}>{meta.label}</span>
                        {a.alert_code && <span className="badge badge-muted" style={{ marginLeft: '4px' }}>{a.alert_code}</span>}
                      </div>
                      <span className="mono text-muted" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {a.triggered_at}
                      </span>
                    </div>

                    <div className="alert-card-img">
                      {a.crop_path ? (
                        <SecureImage src={a.crop_path} width="70" height="80" alt="face crop" />
                      ) : (
                        <div style={{ width: '70px', height: '80px', background: 'var(--bg3)', borderRadius: '6px', border: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg3)' }}>
                          <Icon name="help-circle" size={22} />
                        </div>
                      )}
                      {a.image_path && (
                        <SecureImage src={a.image_path} height="80" style={{ maxWidth: '160px', flex: 1 }} alt="scene" />
                      )}
                    </div>

                    {seenWithNames.length > 0 && (
                      <div className="seen-with">
                        Entered with: <span>{seenWithNames.join(', ')}</span>
                      </div>
                    )}

                    {a.location && (
                      <div className="alert-meta" style={{ marginTop: '8px' }}>
                        Location: 📍 {a.location} {a.action ? `(${a.action})` : ''}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '14px', marginTop: '20px' }}>
              <button 
                className="btn btn-sm" 
                disabled={page === 1} 
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
              >
                ◀ Previous
              </button>
              <span style={{ fontSize: '13px', color: 'var(--fg3)' }}>
                Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalRecords} total alerts)
              </span>
              <button 
                className="btn btn-sm" 
                disabled={page === totalPages} 
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              >
                Next ▶
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="check-circle" size={30} /></div>
          No alerts recorded for filter: {filterType === 'all' ? 'All' : alertMeta(filterType).label}.
        </div>
      )}
    </div>
  );
};

export default Alerts;
