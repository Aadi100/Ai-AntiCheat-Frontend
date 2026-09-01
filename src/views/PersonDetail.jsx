import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { SecureImage } from '../components/SecureImage';
import { fetchPerson, updatePerson, suspendPerson, fetchDetectionsPaginated, fetchAlerts } from '../utils/api';

export const PersonDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openLightbox, defaultBranchId } = useApp();

  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('member');
  const [expiry, setExpiry] = useState('');

  const [accompaniedUnknowns, setAccompaniedUnknowns] = useState([]);

  const loadPerson = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchPerson(defaultBranchId);
      if (res.ok) {
        // Find person inside returned array
        const personData = Array.isArray(res.data.response_data)
          ? res.data.response_data.find(p => p && (p.id === id || p._id === id))
          : res.data.response_data;

        if (personData) {
          setPerson(personData);
          setName(personData.name || '');
          setRole(personData.role || 'member');
          if (personData.package_expiry) {
            setExpiry(personData.package_expiry.substring(0, 10));
          } else {
            setExpiry('');
          }

          // Fetch Accountability (Alerts)
          const alertsRes = await fetchAlerts(defaultBranchId, 1, 100);
          if (alertsRes.ok && alertsRes.data?.response_data?.data) {
            const allAlerts = alertsRes.data.response_data.data || [];
            const matchedAlerts = allAlerts.filter(a => 
              Array.isArray(a.seen_with) && a.seen_with.some(sw => sw.person_id === id || sw.name === personData.name)
            );
            setAccompaniedUnknowns(matchedAlerts);
          }
        } else {
          setError('Person not found in database.');
        }
      } else {
        setError(res.data?.response_message || 'Failed to fetch person details.');
      }
    } catch (err) {
      setError(`Could not connect to the backend: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerson();
  }, [id, defaultBranchId]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        id,
        name,
        role,
        package_expiry: expiry ? `${expiry}T00:00:00+00:00` : null
      };
      const res = await updatePerson(payload);
      if (res.ok) {
        setEditMode(false);
        await loadPerson();
      } else {
        alert(res.data?.response_message || 'Failed to update person profile.');
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    }
  };

  const handleDeletePerson = async () => {
    if (window.confirm(`Delete ${person.name} and ALL their training data?`)) {
      try {
        const res = await suspendPerson(id);
        if (res.ok) {
          navigate('/persons');
        } else {
          alert(res.data?.response_message || 'Failed to suspend person.');
        }
      } catch (err) {
        alert(`Network error: ${err.message}`);
      }
    }
  };

  const formatTime = (epoch) => {
    if (!epoch) return 'Never';
    try {
      const num = Number(epoch);
      if (isNaN(num) || num <= 0) return 'Never';
      const date = new Date(num * 1000);
      return date.toISOString().replace('T', ' ').substring(0, 19);
    } catch (e) {
      return 'Never';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', gap: '12px' }}>
        <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,.15)', borderTopColor: 'var(--accent)' }}></div>
        <span className="text-muted">Loading profile details...</span>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><Icon name="help-circle" size={30} /></div>
        {error || 'Person not found.'}
        <div style={{ marginTop: '14px' }}>
          <Link to="/persons" className="btn">Back to Persons</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '14px' }}>
        <Link to="/persons" className="link-accent">← Back to Persons list</Link>
      </div>

      <div className="grid-2-wide">
        {/* Left pane: profile details */}
        <div className="panel" style={{ margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <SecureImage 
              src={person.photo_path || person.picture_url} 
              className="thumb" 
              style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} 
              alt={person.name} 
            />
            <div>
              <div style={{ fontWeight: '800', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {person.name}
              </div>
              <div className="text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                {person.person_code && <span className="badge badge-muted" style={{ marginRight: '6px' }}>{person.person_code}</span>}
                Database reference: <span className="mono">{person.id || person._id}</span>
              </div>
            </div>
          </div>

          {editMode ? (
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-input" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="member">Member</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Package Expiry Date</label>
                <input type="date" className="form-input mono" value={expiry} onChange={e => setExpiry(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button type="button" className="btn btn-sm" onClick={() => setEditMode(false)}>Cancel</button>
                <button type="submit" className="btn btn-sm btn-primary">Save Profile</button>
              </div>
            </form>
          ) : (
            <div className="row-list">
              <div className="row-item">
                <span>Verification Role</span>
                <span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>{person.role}</span>
              </div>
              <div className="row-item">
                <span>Package Expiry</span>
                <span className="mono">
                  {person.package_expiry ? person.package_expiry.substring(0, 10) : 'No active limit'}
                </span>
              </div>
              <div className="row-item">
                <span>Account Status</span>
                <span className={`badge ${person.status === 'active' ? 'badge-ok' : 'badge-err'}`}>
                  {person.status}
                </span>
              </div>
              <div className="row-item">
                <span>Total Matches Today</span>
                <span className="mono font-bold">{person.total_appearances || 0} times</span>
              </div>
              <div className="row-item">
                <span>Last Entrance Sighting</span>
                <span className="mono" style={{ fontSize: '11.5px' }}>{formatTime(person.last_seen)}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                <button className="btn btn-sm btn-primary" onClick={() => setEditMode(true)}>Edit Profile</button>
                <button className="btn btn-sm btn-danger" onClick={handleDeletePerson}>Delete Dataset Profile</button>
              </div>
            </div>
          )}
        </div>

        {/* Right pane: enrolled profile photo details */}
        <div className="panel" style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontWeight: '700', fontSize: '13.5px', width: '100%', marginBottom: '14px' }}>
            Enrolled Database Photo
          </div>
          <div className="alert-card-img" style={{ position: 'relative', width: '220px', height: '240px', overflow: 'hidden', borderRadius: '8px' }}>
            <SecureImage
              src={person.photo_path || person.picture_url}
              style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
              alt={person.name}
              onClick={() => openLightbox([person.photo_path || person.picture_url], 0)}
            />
          </div>
          <div className="text-muted" style={{ fontSize: '11.5px', marginTop: '12px', textAlign: 'center', maxWidth: '240px', lineHeight: 1.4 }}>
            This photo is cataloged on Server Rekognition to check security entries. Click the photo to enlarge.
          </div>
        </div>
      </div>

      {/* Accountability Section */}
      <div className="section-title" style={{ marginTop: '30px' }}>Accountability</div>
      <div className="banner" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px 16px', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--err)', marginTop: '10px' }}>
        <Icon name="alert-triangle" size={16} />
        <span><strong>{accompaniedUnknowns.length} unknown intruder(s)</strong> entered alongside this person.</span>
      </div>

      {accompaniedUnknowns.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ fontWeight: '700', fontSize: '13.5px', marginBottom: '12px' }}>
            Unknown Faces Accompanied with {person.name}
          </div>
          <div className="alert-grid">
            {accompaniedUnknowns.map((a, idx) => (
              <div key={a.id || a._id || idx} className="alert-card hidden" style={{ cursor: 'pointer' }} onClick={() => openLightbox([a.image_path, a.crop_path].filter(Boolean), 0)}>
                <div className="alert-card-body">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="badge badge-err">Unknown Entry</span>
                    <span className="mono text-muted" style={{ fontSize: '11px' }}>{a.triggered_at}</span>
                  </div>
                  <div className="alert-card-img" style={{ marginTop: '8px' }}>
                    {a.crop_path && <SecureImage src={a.crop_path} width="70" height="80" alt="intruder crop" />}
                    {a.image_path && <SecureImage src={a.image_path} height="80" style={{ maxWidth: '160px', flex: 1 }} alt="scene" />}
                  </div>
                  <div className="seen-with" style={{ marginTop: '8px' }}>
                    Entered with: <span>{person.name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonDetail;
