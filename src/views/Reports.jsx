import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { fetchReport, API_BASE } from '../utils/api';

export const Reports = () => {
  const { defaultBranchId } = useApp();
  const [range, setRange] = useState('30d');
  const [startDate, setStartDate] = useState('2026-07-14');
  const [endDate, setEndDate] = useState('2026-07-21');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = { range };
      if (range === 'custom') {
        params.start = startDate;
        params.end = endDate;
      }
      
      const res = await fetchReport(defaultBranchId, params);
      if (res.ok) {
        if (res.data && (res.data.response_code === 'SUCCESS' || res.data.response_code === 200)) {
          setReportData(res.data.response_data);
        } else {
          setError(res.data?.response_message || 'Unexpected response format from server');
        }
      } else {
        if (res.status === 404) {
          setError('Reports endpoint not found (404). Please verify your backend server routes.');
        } else if (res.status === 401) {
          setError('Unauthorized (401). Please check credentials or log in again.');
        } else if (res.status === 0) {
          setError('Connection refused. Please verify the Flask backend is running on http://127.0.0.1:5050.');
        } else if (res.status >= 500) {
          setError(`Backend server error (${res.status}). The server encountered an internal error. Please check the Flask/backend logs and try again.`);
        } else {
          setError(`Request failed (${res.status}). Please try again or contact support.`);
        }
      }
    } catch (err) {
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [range, startDate, endDate, defaultBranchId]);

  const handleDownloadPDF = async () => {
    try {
      setPdfLoading(true);
      if (!defaultBranchId) {
        throw new Error('No branch selected.');
      }
      const params = { range, branch_id: defaultBranchId };
      if (range === 'custom') {
        params.start = startDate;
        params.end = endDate;
      }
      const q = new URLSearchParams(params).toString();
      const token = localStorage.getItem('token') || '';

      const response = await fetch(`${API_BASE}/reports/pdf?${q}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`PDF generation failed with status ${response.status}`);
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `surveillance-report_${range === 'custom' ? `${startDate}_to_${endDate}` : range}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert(`Could not download report PDF: ${err.message}`);
    } finally {
      setPdfLoading(false);
    }
  };

  // Safe destructuring of report data
  const detections = reportData?.detections || { total_detections: 0, total_faces: 0, known_count: 0, unknown_count: 0, daily: [] };
  const alerts = reportData?.alerts || { total: 0, by_type: { unknown_entry: 0, face_hidden: 0, expired_membership: 0 } };
  const persons = reportData?.persons || { total: 0, directory: [], expiring_soon: [] };
  const serverUsage = reportData?.server_usage || {
    range: { known_indexed: 0, known_searched: 0, unknown_indexed: 0, unknown_searched: 0, known_total: 0, unknown_total: 0, grand_total: 0 },
    lifetime: { known_indexed: 0, known_searched: 0, unknown_indexed: 0, unknown_searched: 0, known_total: 0, unknown_total: 0, grand_total: 0 }
  };
  const rangeStart = reportData?.range_start || (range === 'custom' ? startDate : '—');
  const rangeEnd = reportData?.range_end || (range === 'custom' ? endDate : '—');
  const generatedAt = reportData?.generated_at || '—';
  
  const rangeLabel = 
    range === '7d' ? 'Last 7 days' :
    range === '30d' ? 'Last 30 days' :
    range === '90d' ? 'Last 90 days' :
    range === 'all' ? 'All time' : 'Custom range';

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Generate exportable security summaries across any date range."
      />

      <div className="panel" style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '18px' }}>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label className="form-label">Predefined Ranges</label>
          <select className="form-input" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>

        {range === 'custom' && (
          <>
            <div style={{ width: '130px' }}>
              <label className="form-label">Start Date</label>
              <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div style={{ width: '130px' }}>
              <label className="form-label">End Date</label>
              <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </>
        )}

        <div>
          <button 
            className="btn btn-primary" 
            onClick={handleDownloadPDF} 
            disabled={pdfLoading || loading || error}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {pdfLoading ? (
              <div className="spinner" style={{ width: '14px', height: '14px' }}></div>
            ) : (
              <Icon name="download" size={15} />
            )}
            {pdfLoading ? 'Generating PDF...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', gap: '12px' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,.15)', borderTopColor: 'var(--accent)' }}></div>
          <span className="text-muted">Loading report data...</span>
        </div>
      ) : error ? (
        <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
          <div className="banner-err" style={{ width: '100%', maxWidth: '600px', margin: 0 }}>
            ⚠️ {error}
          </div>
          <button className="btn btn-primary" onClick={loadReport}>
            🔄 Retry Loading Report
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: '24px', position: 'relative' }}>
          {/* PDF layout watermark / header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-soft)', paddingBottom: '14px', marginBottom: '20px' }}>
            <div>
              <div style={{ fontWeight: '800', fontSize: '15px' }}>FITNESSMARVEL AI ANTICHEAT REPORT</div>
              <div className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>
                Surveillance Period: <span className="mono">{rangeStart}</span> to <span className="mono">{rangeEnd}</span> ({rangeLabel})
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono text-muted" style={{ fontSize: '11px' }}>Generated: {generatedAt}</div>
              <div className="mono text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>Format: Digital Preview (PDF structure)</div>
            </div>
          </div>

          {/* Stats summary block */}
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: '20px' }}>
            <div className="stat-card">
              <div className="n">{detections.total_detections}</div>
              <div className="l">Detections in range</div>
            </div>
            <div className="stat-card">
              <div className="n">{detections.total_faces}</div>
              <div className="l">Faces detected</div>
            </div>
            <div className="stat-card ok">
              <div className="n">{detections.known_count}</div>
              <div className="l">Verified matches</div>
            </div>
            <div className="stat-card err">
              <div className="n">{detections.unknown_count}</div>
              <div className="l">Violations triggered</div>
            </div>
          </div>

          {/* Section 1: Alert Breakdown */}
          <div className="section-title">1. Violations & Security Breakdown</div>
          <p className="text-muted" style={{ fontSize: '12.5px', marginTop: '-6px', marginBottom: '14px' }}>
            A summary of camera entries flagged for security review. Unknown entries represent unrecognized face matches.
          </p>

          <div className="grid-2-wide" style={{ marginBottom: '20px' }}>
            <div className="table-wrap" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Violation Type</th>
                    <th>Sightings</th>
                    <th>Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>🚨 Unknown Entries</td>
                    <td>{alerts.by_type.unknown_entry}</td>
                    <td>{Math.round((alerts.by_type.unknown_entry / alerts.total) * 100 || 0)}%</td>
                  </tr>
                  <tr>
                    <td>🫣 Hidden Faces</td>
                    <td>{alerts.by_type.face_hidden}</td>
                    <td>{Math.round((alerts.by_type.face_hidden / alerts.total) * 100 || 0)}%</td>
                  </tr>
                  <tr>
                    <td>⏳ Expired Membership</td>
                    <td>{alerts.by_type.expired_membership || 0}</td>
                    <td>{Math.round(((alerts.by_type.expired_membership || 0) / alerts.total) * 100 || 0)}%</td>
                  </tr>
                  <tr style={{ background: 'var(--bg2)' }}>
                    <td><strong>Total</strong></td>
                    <td><strong>{alerts.total}</strong></td>
                    <td><strong>100%</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ background: 'var(--bg2)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '6px' }}>Threat Summary</div>
              <div style={{ fontSize: '12.5px', color: 'var(--fg3)', lineHeight: 1.5 }}>
                Security checks recorded {alerts.total} total anomalies during this time block. {alerts.by_type.unknown_entry} attempts were completely unmatched profiles, triggering immediate notification triggers. No permanent breaches were logged.
              </div>
            </div>
          </div>

          {/* Section 2: Daily detection timeline */}
          <div className="section-title">2. Daily Detection Timeline</div>
          {detections.daily && detections.daily.length > 0 ? (
            <div className="table-wrap" style={{ marginBottom: '20px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Known Matches</th>
                    <th>Unknown Violations</th>
                    <th>Total Faces</th>
                  </tr>
                </thead>
                <tbody>
                  {detections.daily.map((row, idx) => (
                    <tr key={idx}>
                      <td className="mono">{row.label}</td>
                      <td>{row.known}</td>
                      <td>{row.unknown}</td>
                      <td><strong>{row.known + row.unknown}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ marginBottom: '20px' }}>
              No timeline statistics recorded for this period.
            </div>
          )}

          {/* Section 3: Registered people database */}
          <div className="section-title">3. Registered Database Directory</div>
          {persons.directory && persons.directory.length > 0 ? (
            <div className="table-wrap" style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Total Appearances</th>
                  </tr>
                </thead>
                <tbody>
                  {persons.directory.map((p, idx) => (
                    <tr key={idx}>
                      <td><strong>{p.name}</strong></td>
                      <td>{p.role}</td>
                      <td>
                        <span className="badge badge-ok">Active</span>
                      </td>
                      <td>{p.total_appearances}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ marginBottom: '20px' }}>
              No registered persons recorded in the range.
            </div>
          )}

          {/* Section 4: Server usage */}
          <div className="section-title">4. Server Usage & Metered Counters</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rekognition Metric</th>
                  <th>Period Usage</th>
                  <th>Lifetime Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Known — Indexed faces</td>
                  <td>{serverUsage.range.known_indexed}</td>
                  <td>{serverUsage.lifetime.known_indexed}</td>
                </tr>
                <tr>
                  <td>Known — Searched images</td>
                  <td>{serverUsage.range.known_searched}</td>
                  <td>{serverUsage.lifetime.known_searched}</td>
                </tr>
                <tr>
                  <td>Unknown — Indexed faces</td>
                  <td>{serverUsage.range.unknown_indexed}</td>
                  <td>{serverUsage.lifetime.unknown_indexed}</td>
                </tr>
                <tr>
                  <td>Unknown — Searched images</td>
                  <td>{serverUsage.range.unknown_searched}</td>
                  <td>{serverUsage.lifetime.unknown_searched}</td>
                </tr>
                <tr style={{ background: 'var(--bg2)' }}>
                  <td><strong>Grand Total (API Hits)</strong></td>
                  <td><strong>{serverUsage.range.grand_total}</strong></td>
                  <td><strong>{serverUsage.lifetime.grand_total}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
