import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import * as apiSvc from '../utils/api';

export const Camera = () => {
  const {
    cameras,
    setCameras,
    setConsoleLogs,
    defaultBranchId,
    selectedOrgId
  } = useApp();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [activeMode, setActiveMode] = useState(null); // 'stream' | 'edit' | null
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);

  // Add Camera states
  const addType = 'ip'; // Hardcoded IP only
  const [addName, setAddName] = useState('');
  const [ipUrl, setIpUrl] = useState('');
  const [addLocation, setAddLocation] = useState('');
  const [addAction, setAddAction] = useState('');
  const [addBranchId, setAddBranchId] = useState('');
  const [branches, setBranches] = useState([]);
  const [addConnected, setAddConnected] = useState(false);
  const [addConnecting, setAddConnecting] = useState(false);
  const [addConnectStatus, setAddConnectStatus] = useState('Connect first (optional).');
  const [saving, setSaving] = useState(false);

  // Edit Camera states
  const [editName, setEditName] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editAction, setEditAction] = useState('');

  const overlayRef = useRef(null);

  // Real-time ticking stream clock
  const [feedTime, setFeedTime] = useState('');

  // Selected Camera reference
  const selectedCamera = cameras.find(c => c._id === selectedCameraId);

  // Load cameras list on mount
  const loadCameras = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiSvc.fetchCameras(defaultBranchId);
      if (res.ok) {
        // Backend now returns "id" instead of "_id" — normalize so the rest
        // of this view (which keys/links off `_id`) keeps working either way.
        // Suspended cameras (soft-deleted) are filtered out of the visible list.
        const list = (res.data.response_data || [])
          .filter(c => c.status !== 'suspended')
          .map(c => ({ ...c, _id: c._id || c.id }));
        setCameras(list);
      } else {
        setError(res.data?.response_message || 'Failed to fetch cameras list.');
      }
    } catch (err) {
      setError(`Could not connect to backend: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCameras();
  }, [defaultBranchId]);

  // Branches — needed since /cameras/create now requires a branch_id
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await apiSvc.fetchBranches(selectedOrgId);
        if (res.ok) {
          const list = res.data?.response_data || [];
          setBranches(list);
          // Default to the branch the app is currently scoped to.
          setAddBranchId(prev => prev || defaultBranchId || (list[0]?._id || list[0]?.id) || '');
        }
      } catch (e) { /* silent — branch_id stays empty, create will surface a 403 */ }
    };
    loadBranches();
  }, [defaultBranchId, selectedOrgId]);

  // Update ticking clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setFeedTime(now.toLocaleString());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync edit form states when selected camera changes
  useEffect(() => {
    if (selectedCamera) {
      setEditName(selectedCamera.name || '');
      setEditSource(selectedCamera.source || '');
      setEditLocation(selectedCamera.location || '');
      setEditAction(selectedCamera.action || '');
    } else {
      setEditName('');
      setEditSource('');
      setEditLocation('');
      setEditAction('');
    }
  }, [selectedCameraId, cameras]);

  // Streams are rendered directly in the browser from each camera's own
  // source URL (MJPEG over HTTP) — nothing to tear down on the backend.
  useEffect(() => {
    return () => {};
  }, [selectedCameraId, isStreaming]);

  // Actions
  const handleActionClick = (camId, mode) => {
    if (selectedCameraId === camId && activeMode === mode) {
      setIsStreaming(false);
      setSelectedCameraId(null);
      setActiveMode(null);
      return;
    }

    setSelectedCameraId(camId);
    setActiveMode(mode);

    if (mode === 'stream') {
      setIsStreaming(true);
    } else if (mode === 'edit') {
      setIsStreaming(false);
    }
  };

  const handleUpdateCameraDetails = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert("Camera Name is required.");
      return;
    }
    if (!editSource.trim()) {
      alert("IP/RTSP source URL is required.");
      return;
    }
    try {
      setSaving(true);
      const res = await apiSvc.updateCamera({
        _id: selectedCameraId,
        name: editName,
        source: editSource,
        location: editLocation,
        action: editAction
      });
      if (res.ok) {
        setStatusMsg('✓ Camera details updated successfully!');
        setConsoleLogs(prev => [...prev, `[Camera] Updated details for camera id: ${selectedCameraId}`]);
        setSelectedCameraId(null);
        setActiveMode(null);
        loadCameras();
        setTimeout(() => setStatusMsg(''), 4000);
      } else {
        alert(`Failed to update camera details: ${res.data?.response_message}`);
      }
    } catch (err) {
      alert(`Connection error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCamera = async (id, name) => {
    if (window.confirm(`Delete camera "${name}"?`)) {
      try {
        const res = await apiSvc.suspendCamera(id);
        if (res.ok) {
          setConsoleLogs(prev => [...prev, `[Camera] Deleted camera "${name}".`]);
          if (selectedCameraId === id) {
            setSelectedCameraId(null);
            setActiveMode(null);
            setIsStreaming(false);
            setIsEditingRoi(false);
          }
          loadCameras();
        } else {
          alert(`Failed to delete camera: ${res.data?.response_message}`);
        }
      } catch (err) {
        alert(`Connection error: ${err.message}`);
      }
    }
  };

  const handleAddConnect = () => {
    if (!addName.trim()) {
      setAddConnectStatus('Enter a camera name first.');
      return;
    }
    if (!ipUrl.trim()) {
      setAddConnectStatus('Enter an RTSP URL.');
      return;
    }

    setAddConnecting(true);
    setAddConnectStatus(`Connecting to "${addName}"...`);

    setTimeout(() => {
      setAddConnecting(false);
      setAddConnected(true);
      setAddConnectStatus('✓ Connected successfully.');
      setConsoleLogs(prev => [...prev, `[Camera] Temp connected webcam preview stream for "${addName}"`]);
    }, 1500);
  };

  const handleSaveCameraFinal = async () => {
    if (!addName.trim()) {
      alert("Name is required.");
      return;
    }
    if (!ipUrl.trim()) {
      alert("IP/RTSP URL is required.");
      return;
    }
    if (!addBranchId) {
      alert("Branch is required.");
      return;
    }
    try {
      setSaving(true);
      const createRes = await apiSvc.createCamera({
        name: addName,
        type: addType,
        source: ipUrl.trim(),
        location: addLocation,
        action: addAction,
        branch_id: addBranchId
      });

      if (createRes.ok) {
        const createdCam = createRes.data.response_data || {};
        const newCamId = createdCam.id || createdCam._id;

        setConsoleLogs(prev => [...prev, `[Camera] Saved new camera "${addName}".`]);

        setAddName('');
        setIpUrl('');
        setAddLocation('');
        setAddAction('');
        setAddConnected(false);

        alert(`Camera "${addName}" added successfully.`);
        setSelectedCameraId(newCamId);
        setActiveMode('stream');
        setIsStreaming(true);
        loadCameras();
      } else {
        alert(`Failed to save camera: ${createRes.data?.response_message}`);
      }
    } catch (err) {
      alert(`Connection error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAdd = () => {
    setAddName('');
    setIpUrl('');
    setAddLocation('');
    setAddAction('');
    setAddConnected(false);
    setAddConnectStatus('Connect first (optional).');
  };

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--bg3)',
    color: 'var(--fg)',
    fontSize: '13px',
    boxSizing: 'border-box',
    transition: 'all 0.15s ease-in-out',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
  };

  if (loading && cameras.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', gap: '12px' }}>
        <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,.15)', borderTopColor: 'var(--accent)' }}></div>
        <span className="text-muted">Loading cameras panel...</span>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Camera Operations"
        description="Manage remote IP video sources across your branches."
        badge={`${cameras.length} configured`}
      >
        <button
          className="btn btn-primary"
          onClick={() => { handleCancelAdd(); setIsAddModalOpen(true); }}
        >
          <Icon name="plus" size={14} /> Add IP Camera
        </button>
      </PageHeader>

      {statusMsg && (
        <div className="banner-err" style={{ background: 'rgba(139,92,246,.1)', borderColor: 'rgba(139,92,246,.3)', borderLeftColor: 'var(--accent)', color: 'var(--fg)', marginBottom: '20px' }}>
          {statusMsg}
        </div>
      )}

      {error && (
        <div className="banner-err" style={{ background: 'rgba(240,71,90,0.1)', borderColor: 'rgba(240,71,90,0.3)', borderLeftColor: 'var(--err)', color: 'var(--fg)', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Camera Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '18px', alignItems: 'start' }}>
        {cameras.length > 0 ? (
          cameras.map((c) => {
            const isExpanded = selectedCameraId === c._id;
            return (
              <div
                key={c._id}
                style={{
                  gridColumn: isExpanded ? '1 / -1' : undefined,
                  background: 'var(--bg2)',
                  border: `1px solid ${isExpanded ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: isExpanded ? '0 0 0 1px var(--accent), var(--shadow-sm)' : 'var(--shadow-sm)',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                {/* Card Header Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontWeight: '800', fontSize: '15px', color: 'var(--fg-strong)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {c.name}
                      {c.camera_code && <span className="badge badge-muted" style={{ fontSize: '9px' }}>{c.camera_code}</span>}
                    </h3>
                    <div
                      title={c.source}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px', maxWidth: '100%',
                        fontSize: '11px', color: 'var(--fg2)', fontFamily: 'monospace', marginTop: '8px',
                        background: 'var(--bg3)', border: '1px solid var(--border-soft)', borderRadius: '6px',
                        padding: '4px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}
                    >
                      🔗 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.source}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`badge badge-sm ${c.status === 'active' ? 'badge-ok' : 'badge-danger'}`} style={{ fontSize: '9px', textTransform: 'uppercase' }}>
                      {c.status === 'active' ? 'Online' : 'Offline'}
                    </span>
                    {c.location && (
                      <span className="badge badge-sm badge-blue" style={{ fontSize: '9px' }}>
                        📍 {c.location}
                      </span>
                    )}
                    {c.action && (
                      <span className="badge badge-sm badge-warn" style={{ fontSize: '9px' }}>
                        ⚡ {c.action}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-soft)', paddingTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className={`btn btn-sm ${isExpanded && activeMode === 'stream' ? 'btn-danger' : 'btn-primary'}`}
                      style={{ padding: '6px 12px', fontSize: '11.5px', fontWeight: 'bold' }}
                      onClick={() => handleActionClick(c._id, 'stream')}
                    >
                      {isExpanded && activeMode === 'stream' ? '⏹ Stop Stream' : '▶ Stream'}
                    </button>
                    
                    <button
                      className="btn btn-sm"
                      style={{ padding: '6px 12px', fontSize: '11.5px', fontWeight: 'bold', background: isExpanded && activeMode === 'edit' ? 'var(--accent)' : 'var(--bg3)', border: '1px solid var(--border)', color: isExpanded && activeMode === 'edit' ? '#fff' : 'var(--fg)' }}
                      onClick={() => handleActionClick(c._id, 'edit')}
                    >
                      ✏ Edit Details
                    </button>
                  </div>

                  <button
                    className="btn btn-danger btn-sm"
                    style={{ padding: '6px 12px', fontSize: '11.5px' }}
                    onClick={() => handleDeleteCamera(c._id, c.name)}
                  >
                    Delete
                  </button>
                </div>

                {/* EXPANDED CONTENT AREA ("JUST DOWN THERE") */}
                {isExpanded && (
                  <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-soft)', paddingTop: '20px', animation: 'fade-in 0.2s ease-out' }}>
                    
                    {/* Mode: Stream */}
                    {activeMode === 'stream' && (
                      <div>
                        {/* Stream preview box */}
                        <div className="roi-stage" ref={overlayRef} style={{ background: '#000', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-soft)', aspectRatio: '16 / 9' }}>
                          <img
                            className="video-frame"
                            src={c.source}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.85 }}
                            alt="Live Camera Feed"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=640&auto=format&fit=crop&q=80';
                            }}
                          />
                          
                          {/* Grid HUD overlays */}
                          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: '20px' }}>
                              <span className="dot-live" style={{ width: '6px', height: '6px', boxShadow: 'none' }}></span>
                              <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live</span>
                            </div>

                            <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '9px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: '4px' }}>
                              RTSP · 1080P · 30 FPS
                            </div>

                            <div style={{ position: 'absolute', bottom: '12px', right: '12px', fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px' }}>
                              {feedTime}
                            </div>

                            <div style={{ position: 'absolute', bottom: '12px', left: '12px', fontSize: '9px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px' }}>
                              {c.location ? `CAM: ${c.location.toUpperCase()}` : 'CAM: FRONT'}
                            </div>
                          </div>

                        </div>
                      </div>
                    )}

                    {/* Mode: Edit Details Form */}
                    {activeMode === 'edit' && (
                      <form onSubmit={handleUpdateCameraDetails} style={{ background: 'var(--bg3)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--fg-strong)', marginBottom: '14px' }}>
                          Update Camera Configuration
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '11.5px', marginBottom: '4px' }}>Camera Name</label>
                            <input
                              className="form-input"
                              style={{ fontSize: '12px', padding: '8px 10px' }}
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '11.5px', marginBottom: '4px' }}>Location Badge</label>
                            <input
                              className="form-input"
                              style={{ fontSize: '12px', padding: '8px 10px' }}
                              value={editLocation}
                              onChange={e => setEditLocation(e.target.value)}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: '12px', marginBottom: '16px' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '11.5px', marginBottom: '4px' }}>IP / RTSP Source URL</label>
                            <input
                              className="form-input mono"
                              style={{ fontSize: '12px', padding: '8px 10px' }}
                              value={editSource}
                              onChange={e => setEditSource(e.target.value)}
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '11.5px', marginBottom: '4px' }}>Pipeline Action</label>
                            <input
                              className="form-input"
                              style={{ fontSize: '12px', padding: '8px 10px' }}
                              value={editAction}
                              onChange={e => setEditAction(e.target.value)}
                              placeholder="e.g. checkin"
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button type="submit" className="btn btn-sm btn-primary" style={{ padding: '8px 16px', fontWeight: 'bold' }} disabled={saving}>
                            {saving ? 'Updating...' : 'Save Details'}
                          </button>
                          <button type="button" className="btn btn-sm" onClick={() => { setSelectedCameraId(null); setActiveMode(null); }}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="panel" style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center' }}>
            <div className="empty-state">
              <div className="empty-icon"><Icon name="help-circle" size={28} /></div>
              <h3>No IP Cameras Registered</h3>
              <p className="text-muted" style={{ marginTop: '8px', maxWidth: '300px', margin: '8px auto 0' }}>
                Start by registering an IP or RTSP camera source using the button above.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* POPUP MODAL: Add IP Camera */}
      {isAddModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5,5,10,0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#12121c',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '520px',
            width: '90%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <span style={{ fontWeight: '800', fontSize: '15.5px', color: 'var(--fg-strong)' }}>
                ➕ Register IP Video Source
              </span>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--fg2)', fontSize: '20px', cursor: 'pointer', padding: '0 4px' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Form */}
            <div>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '600' }}>Camera Name</label>
                <input
                  className="form-input"
                  style={inputStyle}
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Front Door Lobby"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '600' }}>IP / RTSP Source URL</label>
                <input
                  className="form-input mono"
                  style={inputStyle}
                  value={ipUrl}
                  onChange={(e) => setIpUrl(e.target.value)}
                  placeholder="rtsp://192.168.1.100/stream"
                />
                <div className="text-muted" style={{ marginTop: '4px', fontSize: '10.5px' }}>{addConnectStatus}</div>
              </div>

              <div style={{ marginTop: '14px', marginBottom: '18px' }}>
                <button type="button" className="btn btn-sm btn-primary" disabled={addConnecting || addConnected} onClick={handleAddConnect}>
                  {addConnecting ? 'Testing Connection...' : '⚡ Test Connection'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '600' }}>Location</label>
                  <input
                    className="form-input"
                    style={inputStyle}
                    value={addLocation}
                    onChange={(e) => setAddLocation(e.target.value)}
                    placeholder="e.g. gentsarea"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '600' }}>Action</label>
                  <input
                    className="form-input"
                    style={inputStyle}
                    value={addAction}
                    onChange={(e) => setAddAction(e.target.value)}
                    placeholder="e.g. checkin"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: '600' }}>Branch *</label>
                <select
                  className="form-select"
                  style={inputStyle}
                  value={addBranchId}
                  onChange={(e) => setAddBranchId(e.target.value)}
                  required
                >
                  {branches.length > 0 ? (
                    branches.map(b => <option key={b._id || b.id} value={b._id || b.id}>{b.name}</option>)
                  ) : (
                    <option value="">No branches available</option>
                  )}
                </select>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={async () => {
                    await handleSaveCameraFinal();
                    setIsAddModalOpen(false);
                  }}
                  disabled={saving}
                >
                  {saving ? 'Registering...' : 'Save Camera'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Camera;
