import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { fetchDashboard } from '../utils/api';
import { alertMeta } from '../utils/alertTypes';
import { SecureImage } from '../components/SecureImage';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export const DashboardOverview = () => {
  const {
    openCardModal,
    openLightbox,
    runBackgroundCameraDiagnostic
  } = useApp();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Quick access key: Shift+P runs a camera scan → stream → capture & recognize
  // in the background (no navigation) and reports the result via toast.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.shiftKey && e.key.toUpperCase() === 'P') {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
        e.preventDefault();
        runBackgroundCameraDiagnostic();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [runBackgroundCameraDiagnostic]);

  // Camera preview toggle — discovers a camera directly via the browser
  // (no backend USB-scan call) and opens a live preview of it.
  const [previewOn, setPreviewOn] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [previewLabel, setPreviewLabel] = useState(null);
  const previewVideoRef = useRef(null);
  const previewStreamRef = useRef(null);

  useEffect(() => {
    if (!previewOn) {
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach(track => track.stop());
        previewStreamRef.current = null;
      }
      setPreviewLabel(null);
      return;
    }

    let cancelled = false;
    setPreviewError(null);

    const openTopCamera = async () => {
      if (!navigator.mediaDevices?.enumerateDevices) {
        setPreviewError('This browser does not support camera enumeration.');
        setPreviewOn(false);
        return;
      }
      let devices = await navigator.mediaDevices.enumerateDevices();
      let cams = devices.filter(d => d.kind === 'videoinput');
      if (cancelled) return;
      if (cams.length === 0) {
        setPreviewError('No cameras were detected on this device.');
        setPreviewOn(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: cams[0].deviceId ? { deviceId: { exact: cams[0].deviceId } } : true
        });
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        previewStreamRef.current = stream;
        if (previewVideoRef.current) previewVideoRef.current.srcObject = stream;

        devices = await navigator.mediaDevices.enumerateDevices();
        cams = devices.filter(d => d.kind === 'videoinput');
        setPreviewLabel(cams[0]?.label || 'Default camera');
      } catch (err) {
        if (!cancelled) {
          setPreviewError(`Could not access webcam: ${err.message}`);
          setPreviewOn(false);
        }
      }
    };

    openTopCamera();

    return () => {
      cancelled = true;
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach(track => track.stop());
        previewStreamRef.current = null;
      }
    };
  }, [previewOn]);

  const getDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchDashboard(10, 6, 5);
      if (res.ok) {
        if (res.data && (res.data.response_code === 'SUCCESS' || res.data.response_code === 200)) {
          setDashboardData(res.data.response_data);
        } else {
          setError(res.data?.response_message || 'Unexpected response format from server');
        }
      } else {
        if (res.status === 404) {
          setError('Endpoint "/api/v1/dashboard" not found (404). Please verify your Flask routes.');
        } else if (res.status === 401) {
          setError('Unauthorized (401). Please check your credentials or log in again.');
        } else if (res.status === 0) {
          setError(`Connection refused. Please verify the Flask backend is running on http://127.0.0.1:5050 (${res.data?.response_message || 'Failed to fetch'})`);
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
    getDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', gap: '12px' }}>
        <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,.15)', borderTopColor: 'var(--accent)' }}></div>
        <span className="text-muted">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
        <div className="banner-err" style={{ width: '100%', maxWidth: '600px', margin: 0 }}>
          ⚠️ {error}. Please verify the backend service is running on port 5050.
        </div>
        <button className="btn btn-primary" onClick={getDashboardData}>
          🔄 Retry Connection
        </button>
      </div>
    );
  }

  // Safe destructuring of backend response data with fallback structures
  const stats = dashboardData?.stats || { total: 0, known: 0, unknown: 0, alerts: 0 };
  const alertBreakdown = dashboardData?.alert_breakdown || { unknown_entry: 0, face_hidden: 0, expired_membership: 0 };
  const people = dashboardData?.people || { member: 0, staff: 0 };
  const peopleTotal = (people.member || 0) + (people.staff || 0);
  const analytics = dashboardData?.analytics || { daily: [], total_known: 0, total_unknown: 0 };
  const topLocations = dashboardData?.top_locations || [];
  const violations = dashboardData?.violations || [];
  const recentDetections = dashboardData?.recent || [];

  // Chart configuration
  const chartData = {
    labels: (analytics.daily || []).map(d => d.label),
    datasets: [
      {
        label: 'Known',
        data: (analytics.daily || []).map(d => d.known),
        backgroundColor: '#22c55e99',
        borderColor: '#22c55e',
        borderWidth: 1.5,
        borderRadius: 4
      },
      {
        label: 'Unknown',
        data: (analytics.daily || []).map(d => d.unknown),
        backgroundColor: '#f0475a99',
        borderColor: '#f0475a',
        borderWidth: 1.5,
        borderRadius: 4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          pointStyle: 'circle',
          color: '#8a8da3'
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#8a8da3' }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255,255,255,.06)' },
        ticks: { precision: 0, color: '#8a8da3' }
      }
    }
  };

  return (
    <div>
      <PageHeader
        title="Dashboard Overview"
        description="Real-time surveillance summary across every connected camera zone."
        badge="⌘ Shift+P — quick camera test"
      >
        <div className={`mini-toggle ${previewOn ? 'on' : ''}`} onClick={() => setPreviewOn(prev => !prev)}>
          <span className="mini-toggle-track"><span className="mini-toggle-thumb"></span></span>
          Camera Preview
        </div>
      </PageHeader>

      {previewOn && (
        <div className="camera-preview-panel">
          <div className="camera-preview-head">
            <div className="camera-preview-title">
              <Icon name="film" size={15} />
              Live Preview
              {previewLabel && <span className="badge badge-muted" style={{ fontSize: '9px' }}>{previewLabel}</span>}
            </div>
            <button className="btn btn-sm" onClick={() => setPreviewOn(false)}>Close</button>
          </div>
          {previewError ? (
            <div className="banner-err" style={{ margin: 0 }}>⚠️ {previewError}</div>
          ) : (
            <video ref={previewVideoRef} className="camera-preview-video" autoPlay playsInline muted />
          )}
        </div>
      )}

      {/* Statistics Grid */}
      <div className="stat-grid">
        <div className="stat-card blue">
          <div className="stat-label">Total Faces Today</div>
          <div className="stat-val">{stats.total}</div>
        </div>
        <div className="stat-card ok">
          <div className="stat-label">Known Today</div>
          <div className="stat-val">{stats.known}</div>
        </div>
        <div className="stat-card err">
          <div className="stat-label">Unknown Today</div>
          <div className="stat-val">{stats.unknown}</div>
        </div>
        <div className="stat-card warn">
          <div className="stat-label">Total Alerts</div>
          <div className="stat-val">{stats.alerts}</div>
          <div className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>
            {alertBreakdown.unknown_entry || 0} unknown &middot; {alertBreakdown.face_hidden || 0} hidden &middot; {alertBreakdown.expired_membership || 0} expired
          </div>
        </div>
        <div className="stat-card ok">
          <div className="stat-label">People Enrolled</div>
          <div className="stat-val">{peopleTotal}</div>
          <div className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>
            {people.member || 0} members &middot; {people.staff || 0} staff
          </div>
        </div>
        <div className="stat-card ok">
          <div className="stat-label">All-time Verified</div>
          <div className="stat-val">{analytics.total_known || 0}</div>
          <div className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>
            {analytics.total_unknown || 0} unknown all-time
          </div>
        </div>
      </div>

      {/* Violations Section */}
      <div className="section-title" style={{ marginTop: '22px' }}>Recent Violations</div>
      <p className="text-muted" style={{ margin: '-8px 0 14px', fontSize: '12.5px' }}>
        Most recent unknown/hidden-face entries — "Entered with" shows co-present registered people.
      </p>

      {violations.length > 0 ? (
        <>
          <div className="alert-grid">
            {violations.slice(0, 4).map((a, idx) => {
              const meta = alertMeta(a.type);
              const cardData = {
                type: a.type,
                crop: a.crop_path,
                image: a.image_path,
                time: a.triggered_at,
                time_epoch: a.triggered_at_epoch,
                seen_with: a.seen_with ? a.seen_with.map(s => typeof s === 'string' ? s : s.name).filter(Boolean) : [],
                detection_id: a.detection_id || a.id
              };

              return (
                <div
                  key={idx}
                  className={`alert-card ${meta.cardClass}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => openCardModal(cardData)}
                >
                  <div className="alert-card-body">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div>
                        <span className={`badge ${meta.badgeClass}`}>{meta.label}</span>
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

                    {a.seen_with && a.seen_with.length > 0 && (
                      <div className="seen-with">
                        Entered with: <span>{a.seen_with.map(s => typeof s === 'string' ? s : s.name).join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '10px' }}>
            <Link to="/alerts" className="link-accent">View all alerts →</Link>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="check-circle" size={30} /></div>
          No open violations. All clear.
        </div>
      )}

      {/* Grid of Chart + Locations */}
      <div className="grid-2-wide" style={{ marginTop: '22px' }}>
        <div className="card" style={{ padding: '18px', height: '280px' }}>
          <div className="section-title">7-Day Known vs Unknown</div>
          <div style={{ position: 'relative', height: '200px' }}>
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <div className="section-title">Top Violation Locations</div>
          {topLocations.length > 0 ? (
            <div className="row-list">
              {topLocations.map((loc, idx) => (
                <div className="row-item" key={idx}>
                  <span>📍 {loc.location}{loc.action ? `/${loc.action}` : ''}</span>
                  <span className="badge badge-err">{loc.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ border: 'none', padding: '32px' }}>
              No located violations yet.
            </div>
          )}
        </div>
      </div>

      {/* Recent Detections */}
      <div className="section-title" style={{ marginTop: '22px' }}>Recent Detections</div>

      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">Last Detections</span>
          <Link to="/log" className="link-accent">View all →</Link>
        </div>
        {recentDetections.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>Time</th>
                <th>Known</th>
                <th>Unknown</th>
                <th>Trigger</th>
              </tr>
            </thead>
            <tbody>
              {recentDetections.slice(0, 5).map((d, idx) => (
                <tr key={idx}>
                  <td>
                    {d.image_path ? (
                      <SecureImage
                        src={d.image_path}
                        className="thumb"
                        alt="Detection Thumb"
                        style={{ cursor: 'pointer' }}
                        onClick={() => openLightbox([d.image_path], 0)}
                      />
                    ) : '—'}
                  </td>
                  <td className="mono" style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                    {d.timestamp || d.triggered_at || d.time || '—'}
                  </td>
                  <td>
                    {d.known_count !== undefined ? (
                      <span className="badge badge-ok">{d.known_count}</span>
                    ) : d.total_faces !== undefined ? (
                      <span className="badge badge-ok">{d.total_faces}</span>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td>
                    {d.unknown_count !== undefined ? (
                      <span className="badge badge-err">{d.unknown_count}</span>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td>
                    <span className={`badge ${
                      d.trigger === 'ping' ? 'badge-blue' :
                      d.trigger === 'grab' ? 'badge-ok' :
                      d.trigger === 'burst' ? 'badge-blue' : 'badge-muted'
                    }`}>
                      {d.trigger}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state" style={{ border: 'none', borderRadius: '0' }}>
            <div className="empty-icon"><Icon name="list" size={24} /></div>
            No detections recorded yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardOverview;
