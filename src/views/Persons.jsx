import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { SecureImage } from '../components/SecureImage';
import { fetchPersons, fetchUnknowns } from '../utils/api';

export const Persons = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') === 'unknown' ? 'unknown' : 'enrolled';
  const [activeTab, setActiveTab] = useState(tabParam);

  // Enrolled Directory States
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [personsList, setPersonsList] = useState([]);
  const [enrolledLoading, setEnrolledLoading] = useState(true);
  const [enrolledError, setEnrolledError] = useState(null);

  // Unknown Directory States
  const [unknownList, setUnknownList] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [unknownLoading, setUnknownLoading] = useState(true);
  const [unknownError, setUnknownError] = useState(null);

  // Sync activeTab with URL parameter changes
  useEffect(() => {
    const currentTab = searchParams.get('tab') === 'unknown' ? 'unknown' : 'enrolled';
    if (currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
  }, [searchParams]);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setSearchParams({ tab: tabName });
  };

  // Load Enrolled Directory data
  const loadPersons = async () => {
    try {
      setEnrolledLoading(true);
      setEnrolledError(null);
      
      const filters = {};
      if (search) filters.name = search;
      if (roleFilter !== 'all') filters.role = roleFilter;

      const res = await fetchPersons(filters);
      if (res.ok) {
        setPersonsList(res.data.response_data || []);
      } else {
        setEnrolledError(res.data?.response_message || 'Failed to load persons database');
      }
    } catch (err) {
      setEnrolledError(`Could not connect to the backend: ${err.message}`);
    } finally {
      setEnrolledLoading(false);
    }
  };

  // Load Unknown Directory data
  const loadUnknowns = async () => {
    try {
      setUnknownLoading(true);
      setUnknownError(null);
      const res = await fetchUnknowns(page, 24);
      if (res.ok) {
        if (res.data && (res.data.response_code === 'SUCCESS' || res.data.response_code === 200)) {
          const respData = res.data.response_data || {};
          setUnknownList(respData.data || []);
          setTotalRecords(respData.total || 0);
          setTotalPages(Math.ceil((respData.total || 0) / (respData.per_page || 24)) || 1);
        } else {
          setUnknownError(res.data?.response_message || 'Unexpected response format from server');
        }
      } else {
        if (res.status === 404) {
          setUnknownError('Unknowns endpoint not found (404). Please verify your backend server routes.');
        } else if (res.status === 401) {
          setUnknownError('Unauthorized (401). Please check credentials or log in again.');
        } else if (res.status === 0) {
          setUnknownError('Connection refused. Please verify the Flask backend is running on http://127.0.0.1:5050.');
        } else {
          setUnknownError(`Server error ${res.status}: ${res.data?.response_message || 'Unknown error'}`);
        }
      }
    } catch (err) {
      setUnknownError(`Unexpected error: ${err.message}`);
    } finally {
      setUnknownLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'enrolled') {
      loadPersons();
    }
  }, [search, roleFilter, activeTab]);

  useEffect(() => {
    if (activeTab === 'unknown') {
      loadUnknowns();
    }
  }, [page, activeTab]);

  const calculateDaysLeft = (expiryDateStr) => {
    if (!expiryDateStr) return 999;
    try {
      const expiry = new Date(expiryDateStr);
      const today = new Date();
      if (isNaN(expiry.getTime())) return 999;
      const diffTime = expiry - today;
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (e) {
      return 999;
    }
  };

  return (
    <div>
      <PageHeader
        title="Persons Directory"
        description="Browse enrolled members and staff, or review unresolved unknown captures."
      />

      {/* Premium Tab Bar Container */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '20px' }}>
        <button
          className={`filter-btn ${activeTab === 'enrolled' ? 'active' : ''}`}
          onClick={() => handleTabChange('enrolled')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 20px', borderRadius: '30px' }}
        >
          <Icon name="users" size={15} />
          Enrolled Directory
        </button>
        <button
          className={`filter-btn ${activeTab === 'unknown' ? 'active' : ''}`}
          onClick={() => handleTabChange('unknown')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 20px', borderRadius: '30px' }}
        >
          <Icon name="help-circle" size={15} />
          Unknown Directory
        </button>
      </div>

      {activeTab === 'enrolled' ? (
        /* ENROLLED TAB */
        <div>
          {/* Filtering and Search Controls */}
          <div className="panel" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className={`filter-btn ${roleFilter === 'all' ? 'active' : ''}`}
                onClick={() => setRoleFilter('all')}
              >
                All Roles
              </button>
              <button
                className={`filter-btn ${roleFilter === 'member' ? 'active' : ''}`}
                onClick={() => setRoleFilter('member')}
              >
                Members
              </button>
              <button
                className={`filter-btn ${roleFilter === 'staff' ? 'active' : ''}`}
                onClick={() => setRoleFilter('staff')}
              >
                Staff
              </button>
            </div>
            <div className="form-group" style={{ marginBottom: 0, minWidth: '220px' }}>
              <input
                className="form-input"
                type="text"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {enrolledLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', gap: '12px' }}>
              <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,.15)', borderTopColor: 'var(--accent)' }}></div>
              <span className="text-muted">Loading directory...</span>
            </div>
          ) : enrolledError ? (
            <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
              <div className="banner-err" style={{ width: '100%', maxWidth: '600px', margin: 0 }}>
                ⚠️ {enrolledError}
              </div>
              <button className="btn btn-primary" onClick={loadPersons}>
                🔄 Retry Loading Directory
              </button>
            </div>
          ) : personsList.length > 0 ? (
            <div className="person-grid">
              {personsList.map((p) => {
                const personId = p.id || p._id;
                const daysLeft = calculateDaysLeft(p.package_expiry);
                return (
                  <Link key={personId} to={`/person/${personId}`} className="person-card">
                    <SecureImage src={p.photo_path} alt={p.name} />
                    <div className="person-card-body">
                      <div className="person-card-name">{p.name}</div>
                      <div className="person-card-meta">
                        <span className={`badge badge-sm ${p.role === 'staff' ? 'badge-role-staff' : 'badge-role-member'}`} style={{ marginTop: '4px' }}>
                          {p.role}
                        </span>
                        {p.person_code && <span className="badge badge-muted" style={{ marginTop: '4px', marginLeft: '4px' }}>{p.person_code}</span>}
                      </div>
                      <div className="person-card-meta" style={{ marginTop: '6px', fontSize: '10.5px' }}>
                        Seen {p.total_appearances || 0} times
                      </div>
                      {daysLeft >= 0 && daysLeft <= 14 && (
                        <span className="risk-badge">Expiry: {daysLeft}d</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="users" size={30} /></div>
              No enrolled persons found matching the filter.
            </div>
          )}
        </div>
      ) : (
        /* UNKNOWN TAB */
        <div>
          <p className="text-muted" style={{ marginBottom: '20px' }}>
            List of automatically grouped unknown faces. These represent entries that matched nothing in the registered dataset but have multiple sightings.
          </p>

          {unknownLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', gap: '12px' }}>
              <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,.15)', borderTopColor: 'var(--accent)' }}></div>
              <span className="text-muted">Loading unknowns...</span>
            </div>
          ) : unknownError ? (
            <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
              <div className="banner-err" style={{ width: '100%', maxWidth: '600px', margin: 0 }}>
                ⚠️ {unknownError}
              </div>
              <button className="btn btn-primary" onClick={loadUnknowns}>
                🔄 Retry Loading Unknowns
              </button>
            </div>
          ) : unknownList.length > 0 ? (
            <div>
              <div className="person-grid">
                {unknownList.map((u) => (
                  <Link key={u.seq} to={`/unknown/${u.seq}`} className="person-card">
                    <SecureImage src={u.photo_path} alt={u.name} />
                    <div className="person-card-body">
                      <div className="person-card-name">{u.name}</div>
                      <div className="person-card-meta" style={{ marginTop: '6px' }}>
                        <span className="badge badge-sm badge-warn">
                          {u.seen_count || 0} sightings
                        </span>
                      </div>
                      <div className="person-card-meta" style={{ marginTop: '6px', fontSize: '10.5px' }}>
                        {u.last_seen ? `Last: ${u.last_seen.split(' ')[0]}` : 'Active File'}
                      </div>
                    </div>
                  </Link>
                ))}
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
                    Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalRecords} unknowns)
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
              <div className="empty-icon"><Icon name="help-circle" size={30} /></div>
              All quiet. No unknown person files recorded.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Persons;
