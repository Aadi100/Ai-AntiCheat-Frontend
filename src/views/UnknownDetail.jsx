import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { SecureImage } from '../components/SecureImage';
import { fetchUnknown, fetchUnknownPhotos, deleteUnknown, createPerson } from '../utils/api';

export const UnknownDetail = () => {
  const { seq } = useParams();
  const navigate = useNavigate();
  const { openLightbox } = useApp();

  const [unknown, setUnknown] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [registerName, setRegisterName] = useState('');
  const [registerRole, setRegisterRole] = useState('member');

  const loadUnknownDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const detailRes = await fetchUnknown(seq);
      const photosRes = await fetchUnknownPhotos(seq);
      
      if (detailRes.ok) {
        const detailData = detailRes.data.response_data || {};
        setUnknown(detailData);
        
        let localPhotos = [];
        if (Array.isArray(detailData.sightings)) {
          localPhotos = detailData.sightings.map(s => s && s.photo_path).filter(Boolean);
        }
        
        if (localPhotos.length > 0) {
          setPhotos(localPhotos);
        } else if (photosRes.ok) {
          setPhotos(photosRes.data.response_data || []);
        }
      } else {
        setError(detailRes.data?.response_message || 'Failed to load unknown profile.');
      }
    } catch (err) {
      setError(`Could not connect to the backend: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnknownDetail();
  }, [seq]);

  const handleDeleteIdentity = async () => {
    if (window.confirm(`Delete unknown file ${unknown.name} and ALL its sightings?`)) {
      try {
        const res = await deleteUnknown(seq);
        if (res.ok) {
          navigate('/unknowns');
        } else {
          alert(res.data?.response_message || 'Failed to delete identity.');
        }
      } catch (err) {
        alert(`Network error: ${err.message}`);
      }
    }
  };

  const handleRegisterAsPerson = async (e) => {
    e.preventDefault();
    if (!registerName.trim()) return;

    try {
      // 1. Create a new authorized member profile
      const createRes = await createPerson({
        name: registerName,
        role: registerRole,
        photo_path: unknown.photo_path
      });

      if (!createRes.ok) {
        alert(createRes.data?.response_message || 'Failed to register person.');
        return;
      }

      // 2. Clear out the temporary unknown profile
      const deleteRes = await deleteUnknown(seq);
      if (deleteRes.ok) {
        alert(`Successfully registered "${registerName}" into the verification dataset!`);
        navigate('/persons');
      } else {
        alert('Registered, but failed to clean up the temporary unknown profile.');
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', gap: '12px' }}>
        <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,.15)', borderTopColor: 'var(--accent)' }}></div>
        <span className="text-muted">Loading unknown details...</span>
      </div>
    );
  }

  if (error || !unknown) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><Icon name="help-circle" size={30} /></div>
        {error || 'Unknown profile not found.'}
        <div style={{ marginTop: '14px' }}>
          <Link to="/unknowns" className="btn">Back to Unknowns</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '14px' }}>
        <Link to="/unknowns" className="link-accent">← Back to Unknown list</Link>
      </div>

      <div className="grid-2-wide">
        {/* Left pane: details and register form */}
        <div className="panel" style={{ margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <SecureImage 
              src={unknown.photo_path} 
              className="thumb" 
              style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} 
              alt={unknown.name} 
            />
            <div>
              <div style={{ fontWeight: '800', fontSize: '18px' }}>
                {unknown.name}
              </div>
              <div className="text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                Temporary profile index: <span className="mono">{unknown.seq}</span>
              </div>
            </div>
          </div>

          <div className="row-list" style={{ marginBottom: '20px' }}>
            <div className="row-item">
              <span>First Sighted Sighting</span>
              <span className="mono" style={{ fontSize: '11.5px' }}>{unknown.created_at || unknown.first_seen || 'Active Session'}</span>
            </div>
            <div className="row-item">
              <span>Last Sighted Sighting</span>
              <span className="mono" style={{ fontSize: '11.5px' }}>{unknown.last_seen || 'Active Session'}</span>
            </div>
            <div className="row-item">
              <span>Total Sightings</span>
              <span className="mono font-bold">{unknown.seen_count || photos.length || 0} times</span>
            </div>
          </div>

          {/* Registration form */}
          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '16px' }}>
            <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '10px' }}>Register this Profile</div>
            <p className="text-muted" style={{ marginBottom: '14px', fontSize: '12px' }}>
              Assign a name and role to this unrecognized face to move it into your authorized dataset.
            </p>
            
            <form onSubmit={handleRegisterAsPerson}>
              <div className="form-group">
                <label className="form-label">Assign Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  className="form-input"
                  value={registerName}
                  onChange={e => setRegisterName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Database Role</label>
                <select className="form-input" value={registerRole} onChange={e => setRegisterRole(e.target.value)}>
                  <option value="member">Member</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button type="button" className="btn btn-sm btn-danger" onClick={handleDeleteIdentity}>
                  Delete Sighting Profile
                </button>
                <button type="submit" className="btn btn-sm btn-primary">
                  Verify & Register
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right pane: list of sighting captures */}
        <div className="panel" style={{ margin: 0 }}>
          <div style={{ fontWeight: '700', fontSize: '13.5px', marginBottom: '14px' }}>
            Recorded Sightings ({photos.length} images)
          </div>

          {photos.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
              {photos.map((img, idx) => (
                <div key={idx} className="alert-card-img" style={{ position: 'relative', width: '100%', height: '110px', overflow: 'hidden', margin: 0 }}>
                  <SecureImage
                    src={img}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                    alt={`sighting captured ${idx}`}
                    onClick={() => openLightbox(photos, idx)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ border: 'none', padding: '24px' }}>
              No sighting photos recorded.
            </div>
          )}
        </div>
      </div>

      {/* Sighting History Section */}
      <div className="section-title" style={{ marginTop: '30px' }}>Sighting History ({unknown.sightings?.length || 0})</div>
      {unknown.sightings && unknown.sightings.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          {unknown.sightings.map((s, idx) => {
            const accompanied = Array.isArray(s.seen_with) ? s.seen_with.map(sw => sw.name || sw) : [];
            return (
              <div key={idx} className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <SecureImage
                    src={s.photo_path}
                    className="thumb"
                    style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }}
                    alt="sighting crop"
                  />
                  <div>
                    <span className="mono" style={{ fontSize: '13.5px', fontWeight: 'bold' }}>{s.timestamp}</span>
                    <div style={{ fontSize: '11px', color: 'var(--fg3)', marginTop: '2px' }}>
                      Detection ID: <span className="mono">{s.detection_id || 'unassigned'}</span>
                    </div>
                  </div>
                </div>
                {accompanied.length > 0 && (
                  <span style={{ fontSize: '11.5px', color: 'var(--fg3)' }}>
                    With: <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{accompanied.join(', ')}</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state" style={{ marginTop: '12px' }}>
          No detailed sighting logs recorded.
        </div>
      )}
    </div>
  );
};

export default UnknownDetail;
