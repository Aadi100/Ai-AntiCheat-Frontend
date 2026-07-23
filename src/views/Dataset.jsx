import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { SecureImage } from '../components/SecureImage';
import * as api from '../utils/api';

// Backend returns a flat list of file paths whose filename is the person's
// name (e.g. "dataset\\Aamir Rafiq.jpg"); group them by that name.
const groupImagesByName = (paths) => {
  const grouped = {};
  paths.forEach((p) => {
    const path = typeof p === 'string' ? p : p?.path || '';
    if (!path) return;
    const fileName = path.split(/[\\/]/).pop() || path;
    const name = fileName.replace(/\.[^./\\]+$/, '');
    (grouped[name] ||= []).push(path);
  });
  return grouped;
};

/* ─────────────────────────────────────────────────────────────
   Merged Dataset Page  (Known Persons  ·  Unknown Captures)
───────────────────────────────────────────────────────────── */
export const Dataset = () => {
  const { setConsoleLogs } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const mainTab = searchParams.get('tab') || 'known'; // 'known' | 'unknown'
  const setMainTab = (t) => setSearchParams({ tab: t });

  /* ══════════════════════════════════════════════════
     KNOWN DATASET
  ══════════════════════════════════════════════════ */
  const [folder, setFolder] = useState('');
  const [images, setImages] = useState({});
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [serverFaces, setServerFaces] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [dupCount, setDupCount] = useState(0);
  const [knownSubTab, setKnownSubTab] = useState('images'); // 'images' | 'server' | 'duplicates'
  const [knownLoading, setKnownLoading] = useState(false);
  const [knownError, setKnownError] = useState('');
  const [actionStatus, setActionStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadKnownImages = useCallback(async () => {
    setKnownLoading(true);
    setKnownError('');
    try {
      const [imgRes, countRes] = await Promise.all([
        api.fetchDatasetImages(folder),
        api.fetchDuplicatesPendingCount(folder),
      ]);
      if (imgRes.ok) {
        const raw = imgRes.data?.response_data;
        const list = raw?.images || raw || {};
        setImages(Array.isArray(list) ? groupImagesByName(list) : list);
      } else {
        setKnownError(imgRes.data?.response_message || 'Failed to load images.');
      }
      if (countRes.ok) setDupCount(countRes.data?.response_data?.count ?? 0);
    } catch (e) {
      setKnownError(`Network error: ${e.message}`);
    } finally {
      setKnownLoading(false);
    }
  }, [folder]);

  const loadCollections = useCallback(async () => {
    setKnownLoading(true);
    try {
      const res = await api.fetchDatasetServerCollections();
      if (res.ok) {
        const cols = res.data?.response_data?.collections || res.data?.response_data || [];
        setCollections(cols);
        // Use functional updater to avoid stale closure loop
        setSelectedCollection(prev => prev || cols[0]?.collection_id || cols[0] || '');
      }
    } catch (e) { /* silent */ } finally { setKnownLoading(false); }
  }, []);

  const loadServerFaces = useCallback(async () => {
    setKnownLoading(true);
    try {
      const res = await api.fetchDatasetServerFaces(selectedCollection);
      if (res.ok) setServerFaces(res.data?.response_data?.faces || res.data?.response_data || []);
    } catch (e) { /* silent */ } finally { setKnownLoading(false); }
  }, [selectedCollection]);

  const loadDuplicates = useCallback(async () => {
    setKnownLoading(true);
    try {
      const res = await api.fetchDuplicatesPending(folder);
      if (res.ok) setDuplicates(res.data?.response_data?.reviews || res.data?.response_data || []);
    } catch (e) { /* silent */ } finally { setKnownLoading(false); }
  }, [folder]);

  useEffect(() => {
    if (mainTab !== 'known') return;
    if (knownSubTab === 'images') loadKnownImages();
    else if (knownSubTab === 'server') loadCollections();
    else if (knownSubTab === 'duplicates') loadDuplicates();
  }, [mainTab, knownSubTab, folder]);

  useEffect(() => {
    if (mainTab === 'known' && knownSubTab === 'server' && selectedCollection) loadServerFaces();
  }, [selectedCollection]);

  const doKnownAction = async (label, fn, reload = true) => {
    setActionLoading(true);
    setActionStatus('');
    try {
      const res = await fn();
      if (res.ok) {
        setActionStatus(`✓ ${label} completed successfully.`);
        setConsoleLogs(prev => [...prev, `[Dataset] ${label}`]);
        if (reload) await loadKnownImages();
      } else {
        setActionStatus(`✗ ${res.data?.response_message || label + ' failed.'}`);
      }
    } catch (e) {
      setActionStatus(`✗ Network error: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  /* ══════════════════════════════════════════════════
     UNKNOWN DATASET
  ══════════════════════════════════════════════════ */
  const [unkSubTab, setUnkSubTab] = useState('identities'); // 'identities' | 'local' | 'server'

  /* — Identity list (paginated API) — */
  const [unknownList, setUnknownList] = useState([]);
  const [unknownPersons, setUnknownPersons] = useState([]);
  const [unknownLoading, setUnknownLoading] = useState(false);
  const [unknownError, setUnknownError] = useState('');
  const [trainTarget, setTrainTarget] = useState(null);
  const [convertType, setConvertType] = useState('new');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('member');
  const [existingPersonId, setExistingPersonId] = useState('');

  /* — Local raw images — */
  const [unkImages, setUnkImages] = useState([]);  // flat list of image paths
  const [unkImgLoading, setUnkImgLoading] = useState(false);
  const [unkImgError, setUnkImgError] = useState('');
  const [unkActionStatus, setUnkActionStatus] = useState('');
  const [unkActionLoading, setUnkActionLoading] = useState(false);

  /* — Server faces — */
  const [unkServerFaces, setUnkServerFaces] = useState([]);
  const [unkServerLoading, setUnkServerLoading] = useState(false);
  const [unkServerError, setUnkServerError] = useState('');
  const [selectedServerFaceIds, setSelectedServerFaceIds] = useState(new Set());

  /* ── Loaders ── */
  const loadUnknownIdentities = useCallback(async () => {
    setUnknownLoading(true);
    setUnknownError('');
    try {
      const [unkRes, perRes] = await Promise.all([api.fetchUnknowns(1, 100), api.fetchPersons()]);
      if (unkRes.ok) setUnknownList(unkRes.data?.response_data?.data || []);
      else setUnknownError(unkRes.data?.response_message || 'Failed to load unknowns.');
      if (perRes.ok) {
        const p = perRes.data?.response_data || [];
        setUnknownPersons(p);
        // Only set default once — use functional updater to avoid stale closure
        setExistingPersonId(prev => prev || p[0]?._id || '');
      }
    } catch (e) {
      setUnknownError(`Network error: ${e.message}`);
    } finally {
      setUnknownLoading(false);
    }
  }, []);

  const loadUnknownImages = useCallback(async () => {
    setUnkImgLoading(true);
    setUnkImgError('');
    try {
      const res = await api.fetchUnknownDatasetImages();
      if (res.ok) {
        const raw = res.data?.response_data;
        // response may be { images: [...] } or directly an array
        setUnkImages(raw?.images || (Array.isArray(raw) ? raw : []));
      } else {
        setUnkImgError(res.data?.response_message || 'Failed to load images.');
      }
    } catch (e) {
      setUnkImgError(`Network error: ${e.message}`);
    } finally {
      setUnkImgLoading(false);
    }
  }, []);

  const loadUnknownServerFaces = useCallback(async () => {
    setUnkServerLoading(true);
    setUnkServerError('');
    try {
      const res = await api.fetchUnknownServerFaces();
      if (res.ok) {
        setUnkServerFaces(res.data?.response_data?.faces || res.data?.response_data || []);
      } else {
        setUnkServerError(res.data?.response_message || 'Failed to load server faces.');
      }
    } catch (e) {
      setUnkServerError(`Network error: ${e.message}`);
    } finally {
      setUnkServerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mainTab !== 'unknown') return;
    if (unkSubTab === 'identities') loadUnknownIdentities();
    else if (unkSubTab === 'local') loadUnknownImages();
    else if (unkSubTab === 'server') loadUnknownServerFaces();
  }, [mainTab, unkSubTab]);

  /* ── Unknown actions ── */
  const doUnkAction = async (label, fn, reloadFn) => {
    setUnkActionLoading(true);
    setUnkActionStatus('');
    try {
      const res = await fn();
      if (res.ok) {
        setUnkActionStatus(`✓ ${label} completed.`);
        setConsoleLogs(prev => [...prev, `[Unknown Dataset] ${label}`]);
        if (reloadFn) await reloadFn();
      } else {
        setUnkActionStatus(`✗ ${res.data?.response_message || label + ' failed.'}`);
      }
    } catch (e) {
      setUnkActionStatus(`✗ Network error: ${e.message}`);
    } finally {
      setUnkActionLoading(false);
    }
  };

  const handleDeleteUnknownIdentity = async (seq) => {
    if (!window.confirm('Delete this unknown identity?')) return;
    const res = await api.deleteUnknown(seq);
    if (res.ok) { setConsoleLogs(p => [...p, `[Unknown] Deleted seq ${seq}`]); await loadUnknownIdentities(); }
    else alert(res.data?.response_message || 'Delete failed.');
  };

  const handleTrainSubmit = async (e) => {
    e.preventDefault();
    if (!trainTarget) return;
    try {
      let success = false;
      if (convertType === 'new') {
        if (!newName.trim()) return;
        const r = await api.createPerson({ name: newName, role: newRole, photo_path: trainTarget.photo_path });
        success = r.ok;
        if (!r.ok) { alert(r.data?.response_message || 'Failed to enroll.'); return; }
      } else {
        if (!existingPersonId) return;
        const person = unknownPersons.find(p => p._id === existingPersonId);
        if (!person) return;
        const r = await api.updatePerson({ ...person, photo_path: trainTarget.photo_path });
        success = r.ok;
        if (!r.ok) { alert(r.data?.response_message || 'Failed to update.'); return; }
      }
      if (success) {
        const del = await api.deleteUnknown(trainTarget.seq);
        if (del.ok) {
          setConsoleLogs(p => [...p, `[Unknown] Converted ${trainTarget.name} to enrolled person.`]);
          setTrainTarget(null); setNewName('');
          await loadUnknownIdentities();
        }
      }
    } catch (e) { alert(`Network error: ${e.message}`); }
  };

  const toggleServerFaceSelect = (faceId) => {
    setSelectedServerFaceIds(prev => {
      const next = new Set(prev);
      next.has(faceId) ? next.delete(faceId) : next.add(faceId);
      return next;
    });
  };

  /* ══════════════════════════════════════════════════
     SHARED STYLES
  ══════════════════════════════════════════════════ */
  const mainTabBtn = (active) => ({
    padding: '9px 22px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: active ? '700' : '500',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'rgba(139,92,246,0.15)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--fg3)',
    transition: 'all .15s ease',
  });

  const subTabBtn = (active) => ({
    padding: '6px 15px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px',
    fontWeight: active ? '600' : '400',
    background: active ? 'var(--bg3)' : 'transparent',
    color: active ? 'var(--fg-strong)' : 'var(--fg3)',
  });

  const statusBar = (msg) => msg ? (
    <div style={{ marginBottom: '16px', fontSize: '12.5px', padding: '8px 14px', borderRadius: '8px',
      background: msg.startsWith('✓') ? 'rgba(16,185,129,.1)' : 'rgba(240,71,90,.1)',
      color: msg.startsWith('✓') ? 'var(--ok)' : 'var(--err)',
      border: '1px solid ' + (msg.startsWith('✓') ? 'rgba(16,185,129,.25)' : 'rgba(240,71,90,.25)') }}>
      {msg}
    </div>
  ) : null;

  const spinner = (msg = 'Loading…') => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '260px', flexDirection: 'column', gap: '12px' }}>
      <div className="spinner" style={{ width: '28px', height: '28px' }}></div>
      <span className="text-muted">{msg}</span>
    </div>
  );

  const personNames = Object.keys(images);

  /* ══════════════════════════════════════════════════
     RENDER: Convert Unknown sub-view
  ══════════════════════════════════════════════════ */
  if (mainTab === 'unknown' && trainTarget) {
    return (
      <div>
        <button onClick={() => setTrainTarget(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '18px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '13px' }}>
          ‹ Back to Unknown Dataset
        </button>
        <div className="panel" style={{ maxWidth: '640px', padding: '28px' }}>
          <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '20px' }}>Convert Unknown Face</div>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
            <SecureImage src={trainTarget.photo_path} style={{ width: '96px', height: '96px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--border)' }} alt="" />
            <div>
              <div style={{ fontWeight: '700', fontSize: '14px' }}>{trainTarget.name}</div>
              <div className="text-muted" style={{ marginTop: '4px', fontSize: '12px' }}>Sightings: {trainTarget.seen_count || 0}</div>
              <div className="text-muted" style={{ fontSize: '12px' }}>Last seen: {trainTarget.last_seen || '—'}</div>
            </div>
          </div>

          <form onSubmit={handleTrainSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '20px' }}>
              {[['new', 'Create New Profile'], ['existing', 'Add to Existing']].map(([v, lbl]) => (
                <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="radio" name="ct" checked={convertType === v} onChange={() => setConvertType(v)} /> {lbl}
                </label>
              ))}
            </div>
            {convertType === 'new' ? (
              <>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Full Name</label>
                  <input className="form-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. John Doe" required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Role</label>
                  <select className="form-select" value={newRole} onChange={e => setNewRole(e.target.value)}>
                    <option value="member">Member</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Select Person</label>
                {unknownPersons.length > 0
                  ? <select className="form-select" value={existingPersonId} onChange={e => setExistingPersonId(e.target.value)}>
                      {unknownPersons.map(p => <option key={p._id} value={p._id}>{p.name} ({p.role})</option>)}
                    </select>
                  : <p className="text-muted" style={{ fontSize: '12px' }}>No registered persons found.</p>}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button className="btn btn-primary" type="submit">Submit Conversion</button>
              <button className="btn" type="button" onClick={() => setTrainTarget(null)}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════
     MAIN RENDER
  ══════════════════════════════════════════════════ */
  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: '22px' }}>
        <h2 style={{ fontWeight: '800', fontSize: '18px', color: 'var(--fg-strong)' }}>Dataset Management</h2>
        <p className="text-muted" style={{ marginTop: '2px', fontSize: '13px' }}>
          Manage enrolled faces, server collections, unknown captures, and duplicate reviews.
        </p>
      </div>

      {/* Main tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        <button style={mainTabBtn(mainTab === 'known')} onClick={() => setMainTab('known')}>
          <Icon name="users" size={13} style={{ display: 'inline', marginRight: '6px' }} />Known Persons
        </button>
        <button style={mainTabBtn(mainTab === 'unknown')} onClick={() => setMainTab('unknown')}>
          <Icon name="help-circle" size={13} style={{ display: 'inline', marginRight: '6px' }} />Unknown Captures
        </button>
      </div>

      {/* ══════════════════════════════════════════════
          KNOWN TAB
      ══════════════════════════════════════════════ */}
      {mainTab === 'known' && (
        <div>
          {/* Sub-tabs + folder filter */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', background: 'var(--bg2)', borderRadius: '8px', padding: '4px', gap: '2px' }}>
              {[['images', 'Local Images'], ['server', 'Server Collections'], [`duplicates`, `Duplicates${dupCount > 0 ? ` (${dupCount})` : ''}`]].map(([k, lbl]) => (
                <button key={k} style={subTabBtn(knownSubTab === k)} onClick={() => setKnownSubTab(k)}>{lbl}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input className="form-input" style={{ width: '190px', padding: '7px 12px', fontSize: '12px' }} placeholder="Folder (optional)" value={folder} onChange={e => setFolder(e.target.value)} />
              <button className="btn btn-sm" onClick={loadKnownImages} disabled={knownLoading}>Refresh</button>
            </div>
          </div>

          {/* Action toolbar (images sub-tab only) */}
          {knownSubTab === 'images' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
              <button className="btn btn-sm btn-primary" disabled={actionLoading} onClick={() => doKnownAction('Local train', () => api.trainDataset(folder))}>
                ⚡ Train Local
              </button>
              <button className="btn btn-sm" disabled={actionLoading} style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }} onClick={() => doKnownAction('Sync & Train', () => api.syncTrainDataset(folder))}>
                ☁ Sync & Train
              </button>
              <button className="btn btn-sm btn-danger" disabled={actionLoading} onClick={() => { if (window.confirm('Delete ALL local dataset images? This cannot be undone.')) doKnownAction('Delete all local', () => api.deleteDatasetAll(folder)); }}>
                🗑 Delete All Local
              </button>
            </div>
          )}

          {statusBar(actionStatus)}
          {knownError && <div className="banner-err" style={{ marginBottom: '16px' }}>⚠️ {knownError}</div>}

          {knownLoading ? spinner() : (
            <>
              {/* LOCAL IMAGES */}
              {knownSubTab === 'images' && (
                personNames.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {personNames.map(name => {
                      const imgs = Array.isArray(images[name]) ? images[name] : [];
                      return (
                        <div key={name} className="panel" style={{ padding: '12px', width: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          {imgs[0] ? (
                            <SecureImage src={imgs[0]} style={{ width: '88px', height: '88px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }} alt="" />
                          ) : (
                            <div style={{ width: '88px', height: '88px', borderRadius: '8px', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon name="user" size={28} />
                            </div>
                          )}
                          <div style={{ fontSize: '12px', fontWeight: '700', textAlign: 'center', wordBreak: 'break-word' }}>{name}</div>
                          {imgs.length > 1 && <div style={{ fontSize: '10px', color: 'var(--fg3)' }}>{imgs.length} photos</div>}
                          <button className="btn btn-sm btn-danger" style={{ fontSize: '10px', padding: '3px 8px' }}
                            onClick={() => { if (window.confirm(`Delete all images for "${name}"?`)) doKnownAction(`Delete person ${name}`, () => api.deleteDatasetPerson(name, folder)); }}>
                            Delete Person
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon"><Icon name="image" size={28} /></div>
                    No images found in this folder.
                  </div>
                )
              )}

              {/* SERVER COLLECTIONS */}
              {knownSubTab === 'server' && (
                <div>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select className="form-select" style={{ flex: 1, maxWidth: '300px', padding: '8px 12px', fontSize: '12px' }}
                      value={selectedCollection} onChange={e => setSelectedCollection(e.target.value)}>
                      {collections.length > 0
                        ? collections.map(c => { const id = typeof c === 'string' ? c : c.collection_id; return <option key={id} value={id}>{id}</option>; })
                        : <option value="">No collections found</option>}
                    </select>
                    <button className="btn btn-sm" onClick={loadServerFaces}>Load Faces</button>
                    <button className="btn btn-sm btn-danger" disabled={!selectedCollection}
                      onClick={() => { if (window.confirm(`Delete collection "${selectedCollection}"?`)) doKnownAction('Delete collection', () => api.deleteDatasetServerCollection(selectedCollection), false); }}>
                      Delete Collection
                    </button>
                  </div>
                  {serverFaces.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                      {serverFaces.map(f => {
                        const fid = typeof f === 'string' ? f : (f.face_id || f.FaceId || JSON.stringify(f));
                        return (
                          <div key={fid} className="panel" style={{ padding: '12px', width: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon name="user" size={22} />
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--fg2)', wordBreak: 'break-all', textAlign: 'center' }}>{fid}</div>
                            <button className="btn btn-sm btn-danger" style={{ fontSize: '10px', padding: '3px 8px' }}
                              onClick={() => { if (window.confirm('Remove this face?')) doKnownAction('Delete server face', () => api.deleteDatasetServerFace(fid, selectedCollection), false); }}>
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon"><Icon name="cloud" size={28} /></div>
                      No faces in this collection, or no collection selected.
                    </div>
                  )}
                </div>
              )}

              {/* DUPLICATES */}
              {knownSubTab === 'duplicates' && (
                duplicates.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {duplicates.map((pair, i) => (
                      <div key={pair.id || i} className="panel" style={{ padding: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {pair.p1_img && <img src={pair.p1_img} style={{ width: '52px', height: '52px', borderRadius: '6px', objectFit: 'cover' }} alt="" />}
                            {pair.p2_img && <img src={pair.p2_img} style={{ width: '52px', height: '52px', borderRadius: '6px', objectFit: 'cover' }} alt="" />}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '13.5px' }}>{pair.p1_name} · {pair.p2_name}</div>
                            {pair.similarity && <div style={{ fontSize: '11.5px', color: 'var(--err)', marginTop: '2px', fontWeight: '600' }}>{pair.similarity}% similarity</div>}
                          </div>
                        </div>
                        <button className="btn btn-sm" onClick={() => setDuplicates(prev => prev.filter((_, j) => j !== i))}>Ignore</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon"><Icon name="check-circle" size={28} /></div>
                    No duplicate reviews pending.
                  </div>
                )
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          UNKNOWN TAB
      ══════════════════════════════════════════════ */}
      {mainTab === 'unknown' && (
        <div>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', background: 'var(--bg2)', borderRadius: '8px', padding: '4px', gap: '2px' }}>
              {[['identities', 'Identity Records'], ['local', 'Local Images'], ['server', 'Server Faces']].map(([k, lbl]) => (
                <button key={k} style={subTabBtn(unkSubTab === k)} onClick={() => setUnkSubTab(k)}>{lbl}</button>
              ))}
            </div>
            <button className="btn btn-sm" onClick={() => {
              if (unkSubTab === 'identities') loadUnknownIdentities();
              else if (unkSubTab === 'local') loadUnknownImages();
              else loadUnknownServerFaces();
            }}>🔄 Refresh</button>
          </div>

          {/* Destructive action toolbar (local sub-tab) */}
          {unkSubTab === 'local' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
              <button className="btn btn-sm btn-primary" disabled={unkActionLoading} onClick={() => doUnkAction('Rebuild local index', api.trainUnknownDataset, loadUnknownImages)}>
                ⚡ Rebuild Index
              </button>
              <button className="btn btn-sm btn-danger" disabled={unkActionLoading} onClick={() => {
                if (window.confirm('This will delete EVERY Unknown identity (local + server + DB). This cannot be undone. Proceed?'))
                  doUnkAction('Delete all unknowns', api.deleteAllUnknownDataset, loadUnknownImages);
              }}>
                💣 Delete All Unknowns
              </button>
            </div>
          )}

          {/* Batch delete toolbar (server sub-tab) */}
          {unkSubTab === 'server' && selectedServerFaceIds.size > 0 && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
              <span className="text-muted" style={{ fontSize: '12px' }}>{selectedServerFaceIds.size} selected</span>
              <button className="btn btn-sm btn-danger" disabled={unkActionLoading} onClick={() => {
                if (window.confirm(`Delete ${selectedServerFaceIds.size} face(s) from server?`))
                  doUnkAction('Delete selected server faces', () => api.deleteUnknownServerFaces([...selectedServerFaceIds]), async () => { setSelectedServerFaceIds(new Set()); await loadUnknownServerFaces(); });
              }}>
                🗑 Delete Selected
              </button>
            </div>
          )}

          {statusBar(unkActionStatus)}

          {/* ── IDENTITY RECORDS ── */}
          {unkSubTab === 'identities' && (
            unknownLoading ? spinner('Loading identity records…') : (
              <>
                {unknownError && <div className="banner-err" style={{ marginBottom: '16px' }}>⚠️ {unknownError}</div>}
                {unknownList.length > 0 ? (
                  <div className="thumb-grid">
                    {unknownList.map(u => (
                      <div key={u.seq} className="thumb-card" style={{ padding: '10px', minHeight: '190px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <SecureImage src={u.photo_path} alt="" style={{ height: '110px', width: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                          <div style={{ fontWeight: '700', fontSize: '12px', color: 'var(--fg)', marginTop: '8px' }}>{u.name}</div>
                          <div className="text-muted" style={{ fontSize: '10px', marginTop: '2px' }}>{u.seen_count || 0} sightings</div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                          <button className="btn btn-sm btn-primary" style={{ flex: 1, fontSize: '11px', padding: '5px 4px', justifyContent: 'center' }}
                            onClick={() => { setTrainTarget(u); setNewName(''); setConvertType('new'); }}>
                            Convert
                          </button>
                          <button className="btn btn-sm btn-danger" style={{ fontSize: '11px', padding: '5px 8px' }}
                            onClick={() => handleDeleteUnknownIdentity(u.seq)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon"><Icon name="help-circle" size={30} /></div>
                    No unknown identity records on file.
                  </div>
                )}
              </>
            )
          )}

          {/* ── LOCAL RAW IMAGES ── */}
          {unkSubTab === 'local' && (
            unkImgLoading ? spinner('Loading raw images…') : (
              <>
                {unkImgError && <div className="banner-err" style={{ marginBottom: '16px' }}>⚠️ {unkImgError}</div>}
                {unkImages.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {unkImages.map((imgPath, i) => {
                      const fileName = (typeof imgPath === 'string' ? imgPath : imgPath.path || '').split(/[\\/]/).pop();
                      const src = typeof imgPath === 'string' ? imgPath : imgPath.path;
                      return (
                        <div key={i} style={{ position: 'relative', width: '100px' }}>
                          <SecureImage src={src} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }} alt="" />
                          <div style={{ fontSize: '9.5px', color: 'var(--fg3)', marginTop: '4px', wordBreak: 'break-all', lineHeight: '1.2' }}>{fileName}</div>
                          <button onClick={() => { if (window.confirm('Delete this raw image?')) doUnkAction('Delete raw image', () => api.deleteUnknownDatasetImage(src), loadUnknownImages); }}
                            style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,.65)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: '10px' }}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon"><Icon name="image" size={28} /></div>
                    No raw images in the unknown dataset folder.
                  </div>
                )}
              </>
            )
          )}

          {/* ── SERVER FACES ── */}
          {unkSubTab === 'server' && (
            unkServerLoading ? spinner('Loading server faces…') : (
              <>
                {unkServerError && <div className="banner-err" style={{ marginBottom: '16px' }}>⚠️ {unkServerError}</div>}
                {unkServerFaces.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {unkServerFaces.map(f => {
                      const fid = typeof f === 'string' ? f : (f.face_id || f.FaceId || JSON.stringify(f));
                      const selected = selectedServerFaceIds.has(fid);
                      return (
                        <div key={fid} className="panel" style={{ padding: '12px', width: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', border: selected ? '1px solid var(--accent)' : '1px solid var(--border)', cursor: 'pointer', transition: 'border-color .15s' }}
                          onClick={() => toggleServerFaceSelect(fid)}>
                          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: selected ? 'rgba(139,92,246,.2)' : 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}>
                            <Icon name="user" size={22} />
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--fg2)', wordBreak: 'break-all', textAlign: 'center' }}>{fid}</div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button className="btn btn-sm btn-danger" style={{ fontSize: '10px', padding: '3px 8px' }}
                              onClick={(e) => { e.stopPropagation(); if (window.confirm('Remove this face from collection?')) doUnkAction('Delete server face', () => api.deleteUnknownServerFace(fid), loadUnknownServerFaces); }}>
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon"><Icon name="cloud" size={28} /></div>
                    No faces in the unknown-faces server collection.
                  </div>
                )}
              </>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default Dataset;
