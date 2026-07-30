import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { SecureImage } from '../components/SecureImage';
import { fetchDetectionsPaginated } from '../utils/api';

export const EntryLog = () => {
  const { openLightbox, openSessionModal } = useApp();
  const [sessionLogs, setSessionLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filter, setFilter] = useState('all'); // 'all', 'known', 'unknown'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEntryLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filterParam = filter === 'all' ? null : filter;
      const res = await fetchDetectionsPaginated(page, 20, filterParam);
      
      if (res.ok) {
        if (res.data && (res.data.response_code === 'SUCCESS' || res.data.response_code === 200)) {
          const respData = res.data.response_data || {};
          setSessionLogs(respData.data || []);
          setTotalRecords(respData.total || 0);
          setTotalPages(Math.ceil((respData.total || 0) / (respData.per_page || 20)) || 1);
        } else {
          setError(res.data?.response_message || 'Unexpected response format from server');
        }
      } else {
        if (res.status === 404) {
          setError('Entry logs endpoint not found (404). Please verify your backend server routes.');
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
    loadEntryLogs();
  }, [page, filter]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1);
  };

  const formatTime = (value) => {
    if (!value) return '—';
    if (typeof value === 'string') {
      return value.replace('T', ' ').substring(0, 19);
    }
    try {
      const num = Number(value);
      if (isNaN(num) || num <= 0) return '—';
      const date = new Date(num * 1000);
      return date.toISOString().replace('T', ' ').substring(0, 19);
    } catch (e) {
      return '—';
    }
  };

  return (
    <div>
      <PageHeader
        title="Entry Log"
        description="Chronological record of every detection session across all camera zones."
        badge={`${totalRecords} total`}
      />

      {/* Filter Bar */}
      <div className="filter-bar" style={{ marginBottom: '14px' }}>
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => handleFilterChange('all')}
        >
          All Detections
        </button>
        <button
          className={`filter-btn ${filter === 'known' ? 'active' : ''}`}
          onClick={() => handleFilterChange('known')}
        >
          🟢 Known Matches
        </button>
        <button
          className={`filter-btn ${filter === 'unknown' ? 'active' : ''}`}
          onClick={() => handleFilterChange('unknown')}
        >
          🔴 Unknown Violations
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', gap: '12px' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,.15)', borderTopColor: 'var(--accent)' }}></div>
          <span className="text-muted">Loading entry logs...</span>
        </div>
      ) : error ? (
        <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
          <div className="banner-err" style={{ width: '100%', maxWidth: '600px', margin: 0 }}>
            ⚠️ {error}
          </div>
          <button className="btn btn-primary" onClick={loadEntryLogs}>
            🔄 Retry Loading Logs
          </button>
        </div>
      ) : Array.isArray(sessionLogs) && sessionLogs.length > 0 ? (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sessionLogs.map((log) => {
              if (!log) return null;
              const sessionTime = formatTime(log.started_at);
              const sessionEndTime = formatTime(log.ended_at);
              
              const knownNames = Array.isArray(log.known_names) ? log.known_names : [];
              const images = Array.isArray(log.images) ? log.images : [];

              const cardData = {
                time: sessionTime,
                time_epoch: log.started_at_epoch || 0,
                end_time: sessionEndTime,
                end_time_epoch: log.ended_at_epoch || 0,
                trigger: log.trigger || '',
                location: log.location || '',
                action: log.action || '',
                known_count: typeof log.known_count === 'number' ? log.known_count : 0,
                unknown_count: typeof log.unknown_count === 'number' ? log.unknown_count : 0,
                frame_count: log.frame_count || images.length,
                known_names: knownNames,
                images: images
              };

              return (
                <div key={log.grab_id || log.session_id} className="session-card">
                  <div className="session-head">
                    <div className="session-head-left">
                      <span className="session-time">{sessionTime}</span>
                      <span className="session-meta">
                        {sessionEndTime && sessionEndTime !== sessionTime && `→ ${sessionEndTime}`}
                      </span>
                      <span className={`badge ${
                        log.trigger === 'ping' ? 'badge-blue' :
                        log.trigger === 'grab' ? 'badge-ok' :
                        log.trigger === 'burst' ? 'badge-blue' : 'badge-muted'
                      }`}>
                        {log.trigger}
                      </span>
                      {log.location && <span className="loc-badge">📍 {log.location}</span>}
                      {log.action && <span className="action-badge">{log.action}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div className="session-counts">
                        {log.known_count > 0 && <span className="badge badge-ok">{log.known_count} known</span>}
                        {log.unknown_count > 0 && <span className="badge badge-err">{log.unknown_count} unknown</span>}
                        <span className="badge badge-muted">{images.length} frames</span>
                      </div>
                      <button
                        className="btn btn-sm"
                        onClick={() => openSessionModal(cardData)}
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                      >
                        Details
                      </button>
                    </div>
                  </div>

                  {/* Sighting images strip */}
                  {images.length > 0 && (
                    <div className="session-strip">
                      {images.map((img, index) => (
                        <SecureImage
                          key={index}
                          src={img}
                          alt={`sighting-${index}`}
                          onClick={() => openLightbox(images, index)}
                        />
                      ))}
                    </div>
                  )}

                  {knownNames.length > 0 && (
                    <div className="session-names">
                      Known: <span>{knownNames.join(', ')}</span>
                    </div>
                  )}
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
                Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalRecords} sessions)
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
          <div className="empty-icon"><Icon name="list" size={30} /></div>
          No entry logs found matching this filter.
        </div>
      )}
    </div>
  );
};

export default EntryLog;
