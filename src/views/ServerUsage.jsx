import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/PageHeader';
import { fetchServerUsage } from '../utils/api';
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

export const ServerUsage = () => {
  const { defaultBranchId } = useApp();
  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(30);

  const getUsageData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchServerUsage(days, defaultBranchId);
      if (res.ok) {
        if (res.data && (res.data.response_code === 'SUCCESS' || res.data.response_code === 200)) {
          setUsageData(res.data.response_data);
        } else {
          setError(res.data?.response_message || 'Unexpected response format from server');
        }
      } else {
        if (res.status === 404) {
          setError('Server usage endpoint not found (404). Please verify your backend server routes.');
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
    getUsageData();
  }, [days, defaultBranchId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', gap: '12px' }}>
        <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,.15)', borderTopColor: 'var(--accent)' }}></div>
        <span className="text-muted">Loading server usage...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
        <div className="banner-err" style={{ width: '100%', maxWidth: '600px', margin: 0 }}>
          ⚠️ {error}
        </div>
        <button className="btn btn-primary" onClick={getUsageData}>
          🔄 Retry Loading Server Usage
        </button>
      </div>
    );
  }

  // Safe destructuring of live server usage response
  const totals = usageData?.totals || {
    known_indexed: 0, known_searched: 0,
    unknown_indexed: 0, unknown_searched: 0,
    known_total: 0, unknown_total: 0,
    indexed_total: 0, searched_total: 0,
    grand_total: 0
  };
  const trendData = usageData?.daily || [];

  const chartData = {
    labels: trendData.map(d => d.date),
    datasets: [
      {
        label: 'Known indexed',
        data: trendData.map(d => d.known_indexed),
        backgroundColor: '#22c55e99',
        borderColor: '#22c55e',
        borderWidth: 1.5,
        borderRadius: 4
      },
      {
        label: 'Known searched',
        data: trendData.map(d => d.known_searched),
        backgroundColor: '#3b82f699',
        borderColor: '#3b82f6',
        borderWidth: 1.5,
        borderRadius: 4
      },
      {
        label: 'Unknown indexed',
        data: trendData.map(d => d.unknown_indexed),
        backgroundColor: '#f59e0b99',
        borderColor: '#f59e0b',
        borderWidth: 1.5,
        borderRadius: 4
      },
      {
        label: 'Unknown searched',
        data: trendData.map(d => d.unknown_searched),
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
        labels: { boxWidth: 10, usePointStyle: true, color: '#8a8da3' }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#8a8da3' } },
      y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,.06)' }, ticks: { precision: 0, color: '#8a8da3' } }
    }
  };

  return (
    <div>
      <PageHeader
        title="Server Usage"
        description="API usage breakdown on Server Rekognition. Switch ranges to observe monthly trends."
      >
        <button className={`btn btn-sm ${days === 7 ? 'btn-primary' : ''}`} onClick={() => setDays(7)}>7 Days</button>
        <button className={`btn btn-sm ${days === 30 ? 'btn-primary' : ''}`} onClick={() => setDays(30)}>30 Days</button>
        <button className={`btn btn-sm ${days === 90 ? 'btn-primary' : ''}`} onClick={() => setDays(90)}>90 Days</button>
      </PageHeader>

      <div className="section-title">Lifetime Totals</div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Grand Total Sent</div>
          <div className="stat-val">{totals.grand_total}</div>
        </div>
        <div className="stat-card ok">
          <div className="stat-label">Known Dataset — Total</div>
          <div className="stat-val">{totals.known_total}</div>
        </div>
        <div className="stat-card err">
          <div className="stat-label">Unknown Faces — Total</div>
          <div className="stat-val">{totals.unknown_total}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Indexed (Training)</div>
          <div className="stat-val">{totals.indexed_total}</div>
        </div>
        <div className="stat-card warn">
          <div className="stat-label">Searched (Recognition)</div>
          <div className="stat-val">{totals.searched_total}</div>
        </div>
      </div>

      <div className="grid-2-wide" style={{ marginBottom: '22px' }}>
        <div className="card" style={{ padding: '18px', height: '280px' }}>
          <div className="section-title">{days}-Day Usage Trend</div>
          {trendData.length > 0 ? (
            <div style={{ position: 'relative', height: '200px' }}>
              <Bar data={chartData} options={chartOptions} />
            </div>
          ) : (
            <div className="empty-state" style={{ border: 'none', padding: '32px' }}>
              No Server usage recorded in this period.
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <div className="section-title">Breakdown</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Lifetime</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Known — indexed</td><td>{totals.known_indexed}</td></tr>
                <tr><td>Known — searched</td><td>{totals.known_searched}</td></tr>
                <tr><td>Unknown — indexed</td><td>{totals.unknown_indexed}</td></tr>
                <tr><td>Unknown — searched</td><td>{totals.unknown_searched}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="section-title">Daily Breakdown ({days} days)</div>
      {trendData.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Known Indexed</th>
                <th>Known Searched</th>
                <th>Unknown Indexed</th>
                <th>Unknown Searched</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {[...trendData].reverse().map((d, idx) => (
                <tr key={idx}>
                  <td>{d.date}</td>
                  <td>{d.known_indexed}</td>
                  <td>{d.known_searched}</td>
                  <td>{d.unknown_indexed}</td>
                  <td>{d.unknown_searched}</td>
                  <td><strong>{d.grand_total}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          No daily records recorded in this range.
        </div>
      )}
    </div>
  );
};

export default ServerUsage;
