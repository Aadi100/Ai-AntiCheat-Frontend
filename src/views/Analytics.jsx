import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { fetchAnalytics } from '../utils/api';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

export const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAnalytics();
      if (res.ok) {
        if (res.data && (res.data.response_code === 'SUCCESS' || res.data.response_code === 200)) {
          setAnalyticsData(res.data.response_data);
        } else {
          setError(res.data?.response_message || 'Unexpected response format from server');
        }
      } else {
        if (res.status === 404) {
          setError('Analytics endpoint not found (404). Please verify your backend server routes.');
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
    getAnalyticsData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', gap: '12px' }}>
        <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,.15)', borderTopColor: 'var(--accent)' }}></div>
        <span className="text-muted">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
        <div className="banner-err" style={{ width: '100%', maxWidth: '600px', margin: 0 }}>
          ⚠️ {error}
        </div>
        <button className="btn btn-primary" onClick={getAnalyticsData}>
          🔄 Retry Loading Analytics
        </button>
      </div>
    );
  }

  // Safe destructuring of live analytics response
  const daily = analyticsData?.daily || [];
  const hours = analyticsData?.hours || [];
  const totalKnown = analyticsData?.total_known || 0;
  const totalUnknown = analyticsData?.total_unknown || 0;
  const thisWeekTotal = daily.reduce((sum, day) => sum + (day.known || 0) + (day.unknown || 0), 0);

  // Daily Chart Setup (Bar)
  const dailyData = {
    labels: daily.map(d => d.label),
    datasets: [
      {
        label: 'Known',
        data: daily.map(d => d.known),
        backgroundColor: '#22c55e99',
        borderColor: '#22c55e',
        borderWidth: 1.5,
        borderRadius: 4
      },
      {
        label: 'Unknown',
        data: daily.map(d => d.unknown),
        backgroundColor: '#f0475a99',
        borderColor: '#f0475a',
        borderWidth: 1.5,
        borderRadius: 4
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          usePointStyle: true,
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

  // Hourly Chart Setup (Line)
  const sortedHours = [...hours].sort((a, b) => a._id - b._id);
  const hourlyLabels = sortedHours.map(h => `${String(h._id).padStart(2, '0')}:00`);
  const hourlyDataset = sortedHours.map(h => h.count);

  const hourlyData = {
    labels: hourlyLabels,
    datasets: [
      {
        label: 'Detections by Hour',
        data: hourlyDataset,
        fill: true,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.12)',
        pointBackgroundColor: '#8b5cf6',
        pointRadius: 3,
        tension: 0.4
      }
    ]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          color: '#8a8da3'
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#8a8da3', maxRotation: 0 }
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
        title="Analytics"
        description="Long-range trends across known vs. unknown detections and peak activity hours."
      />

      {/* Stats summary row */}
      <div className="stat-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card ok">
          <div className="stat-label">All-time Verified</div>
          <div className="stat-val">{totalKnown}</div>
        </div>
        <div className="stat-card err">
          <div className="stat-label">All-time Unknown</div>
          <div className="stat-val">{totalUnknown}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">This Week Total</div>
          <div className="stat-val">{thisWeekTotal}</div>
        </div>
      </div>

      <div className="grid-2-wide">
        <div className="card" style={{ padding: '18px', height: '300px' }}>
          <div className="section-title">7-Day Known vs Unknown</div>
          <div style={{ position: 'relative', height: '220px' }}>
            <Bar data={dailyData} options={barOptions} />
          </div>
        </div>

        <div className="card" style={{ padding: '18px', height: '300px' }}>
          <div className="section-title">Detections by Hour (All-time)</div>
          <div style={{ position: 'relative', height: '220px' }}>
            <Line data={hourlyData} options={lineOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
