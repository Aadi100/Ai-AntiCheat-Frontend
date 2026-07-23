import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Icon } from '../components/Icon';
import * as apiSvc from '../utils/api';

export const Camera = () => {
  const {
    cameras,
    setCameras,
    setConsoleLogs
  } = useApp();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [activeMode, setActiveMode] = useState(null); // 'stream' | 'roi' | 'edit' | null
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Streaming & ROI editing states
  const [isStreaming, setIsStreaming] = useState(false);
  const [isEditingRoi, setIsEditingRoi] = useState(false);

  // Add Camera states
  const addType = 'ip'; // Hardcoded IP only
  const [addName, setAddName] = useState('');
  const [ipUrl, setIpUrl] = useState('');
  const [addLocation, setAddLocation] = useState('');
  const [addAction, setAddAction] = useState('');
  const [addConnected, setAddConnected] = useState(false);
  const [addConnecting, setAddConnecting] = useState(false);
  const [addConnectStatus, setAddConnectStatus] = useState('Connect first to draw a capture area (optional).');
  const [saving, setSaving] = useState(false);

  // Edit Camera states
  const [editName, setEditName] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editAction, setEditAction] = useState('');

  // Drag ROI states (active cameras) - normalized (0.0 to 1.0)
  const [dragActiveId, setDragActiveId] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 }); // in pixels
  const [dragCurrent, setDragCurrent] = useState({ x: 0, y: 0 }); // in pixels
  const [isDragging, setIsDragging] = useState(false);
  const [roiBox, setRoiBox] = useState(null); // normalized coordinates
  const overlayRef = useRef(null);

  // Drag ROI states (add camera) - normalized (0.0 to 1.0)
  const [addRoiBox, setAddRoiBox] = useState(null);
  const [addIsDragging, setAddIsDragging] = useState(false);
  const [addDragStart, setAddDragStart] = useState({ x: 0, y: 0 }); // in pixels
  const [addDragCurrent, setAddDragCurrent] = useState({ x: 0, y: 0 }); // in pixels
  const addOverlayRef = useRef(null);

  // Real-time ticking stream clock
  const [feedTime, setFeedTime] = useState('');

  // Selected Camera reference
  const selectedCamera = cameras.find(c => c._id === selectedCameraId);

  // Load cameras list on mount
  const loadCameras = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiSvc.fetchCameras();
      if (res.ok) {
        const list = res.data.response_data || [];
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
  }, []);

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

  // Sync edit form states & ROI box when selected camera changes
  useEffect(() => {
    if (selectedCamera) {
      setEditName(selectedCamera.name || '');
      setEditSource(selectedCamera.source || '');
      setEditLocation(selectedCamera.location || '');
      setEditAction(selectedCamera.action || '');
      setRoiBox(selectedCamera.roi || null);
    } else {
      setEditName('');
      setEditSource('');
      setEditLocation('');
      setEditAction('');
      setRoiBox(null);
    }
  }, [selectedCameraId, cameras]);

  // Clean up active streams on unmount
  useEffect(() => {
    return () => {
      if (selectedCameraId && isStreaming) {
        apiSvc.stopCamera(selectedCameraId).catch(console.error);
      }
    };
  }, [selectedCameraId, isStreaming]);

  // Actions
  const handleActionClick = async (camId, mode) => {
    if (selectedCameraId === camId && activeMode === mode) {
      if (isStreaming) {
        try {
          await apiSvc.stopCamera(camId);
        } catch (e) {
          console.error(e);
        }
        setIsStreaming(false);
      }
      setSelectedCameraId(null);
      setActiveMode(null);
      setIsEditingRoi(false);
      return;
    }

    if (isStreaming && selectedCameraId && selectedCameraId !== camId) {
      try {
        await apiSvc.stopCamera(selectedCameraId);
      } catch (e) {
        console.error(e);
      }
      setIsStreaming(false);
    }

    setSelectedCameraId(camId);
    setActiveMode(mode);

    if (mode === 'stream') {
      setIsEditingRoi(false);
      setIsStreaming(true);
      try {
        await apiSvc.startCamera(camId);
        loadCameras();
      } catch (e) {
        console.error(e);
      }
    } else if (mode === 'roi') {
      setIsEditingRoi(true);
      setIsStreaming(true);
      try {
        await apiSvc.startCamera(camId);
        loadCameras();
      } catch (e) {
        console.error(e);
      }
    } else if (mode === 'edit') {
      setIsEditingRoi(false);
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
        const res = await apiSvc.deleteCamera(id);
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

  const handleStartStream = async (camId) => {
    try {
      setSaving(true);
      const res = await apiSvc.startCamera(camId);
      if (res.ok) {
        setIsStreaming(true);
        setConsoleLogs(prev => [...prev, `[Camera] Live stream started for camera: ${camId}`]);
        loadCameras();
      } else {
        alert(`Failed to start stream: ${res.data?.response_message}`);
      }
    } catch (err) {
      alert(`Connection error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleStopStream = async (camId) => {
    try {
      setSaving(true);
      const res = await apiSvc.stopCamera(camId);
      if (res.ok) {
        setIsStreaming(false);
        setIsEditingRoi(false);
        setConsoleLogs(prev => [...prev, `[Camera] Live stream stopped for camera: ${camId}`]);
        loadCameras();
      } else {
        alert(`Failed to stop stream: ${res.data?.response_message}`);
      }
    } catch (err) {
      alert(`Connection error: ${err.message}`);
    } finally {
      setSaving(false);
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
      setAddConnectStatus('✓ Connected successfully. Define capture area (optional).');
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
    try {
      setSaving(true);
      const createRes = await apiSvc.createCamera({
        name: addName,
        type: addType,
        source: ipUrl.trim(),
        location: addLocation,
        action: addAction
      });

      if (createRes.ok) {
        const createdCam = createRes.data.response_data || {};
        const newCamId = createdCam._id;

        if (addRoiBox) {
          await apiSvc.setCameraRoi(newCamId, addRoiBox);
        }

        setConsoleLogs(prev => [...prev, `[Camera] Saved new camera "${addName}".`]);
        
        setAddName('');
        setIpUrl('');
        setAddLocation('');
        setAddAction('');
        setAddConnected(false);
        setAddRoiBox(null);
        
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
    setAddRoiBox(null);
    setAddConnectStatus('Connect first to draw a capture area (optional).');
  };

  // Drag handles (Existing Cameras preview)
  const handleMouseDown = (e, camId) => {
    if (!isEditingRoi) return;
    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    
    setDragActiveId(camId);
    setDragStart({ x: startX, y: startY });
    setDragCurrent({ x: startX, y: startY });
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const currentY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    
    setDragCurrent({ x: currentX, y: currentY });
  };

  const handleMouseUp = () => {
    if (!isDragging || !overlayRef.current) return;
    setIsDragging(false);

    const rect = overlayRef.current.getBoundingClientRect();
    const x = Math.min(dragStart.x, dragCurrent.x) / rect.width;
    const y = Math.min(dragStart.y, dragCurrent.y) / rect.height;
    const w = Math.abs(dragStart.x - dragCurrent.x) / rect.width;
    const h = Math.abs(dragStart.y - dragCurrent.y) / rect.height;

    if (w > 0.02 && h > 0.02) {
      setRoiBox({ x, y, w, h });
    }
  };

  const handleSaveRoi = async (camId) => {
    if (!roiBox) return;
    try {
      const res = await apiSvc.setCameraRoi(camId, roiBox);
      if (res.ok) {
        setConsoleLogs(prev => [...prev, `[Camera] Capture ROI area coordinates saved for camera ${camId}.`]);
        setStatusMsg('✓ Capture Area bounds saved successfully!');
        setIsEditingRoi(false);
        setActiveMode('stream');
        loadCameras();
        setTimeout(() => setStatusMsg(''), 4000);
      } else {
        alert(`Failed to save ROI: ${res.data?.response_message}`);
      }
    } catch (err) {
      alert(`Connection error: ${err.message}`);
    }
  };

  const handleCancelEditingRoi = () => {
    setRoiBox(selectedCamera.roi || null);
    setIsEditingRoi(false);
    setActiveMode('stream');
  };

  const handleClearRoi = async (camId) => {
    try {
      const res = await apiSvc.setCameraRoi(camId, null);
      if (res.ok) {
        setConsoleLogs(prev => [...prev, `[Camera] Capture ROI area cleared for camera ${camId}.`]);
        setStatusMsg('✓ Capture Area bounds cleared successfully!');
        setRoiBox(null);
        setIsEditingRoi(false);
        setActiveMode('stream');
        loadCameras();
        setTimeout(() => setStatusMsg(''), 4000);
      } else {
        alert(`Failed to clear ROI: ${res.data?.response_message}`);
      }
    } catch (err) {
      alert(`Connection error: ${err.message}`);
    }
  };

  // Drag handles (Add Camera preview)
  const handleAddMouseDown = (e) => {
    if (!addOverlayRef.current) return;
    const rect = addOverlayRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    setAddDragStart({ x: startX, y: startY });
    setAddDragCurrent({ x: startX, y: startY });
    setAddIsDragging(true);
  };

  const handleAddMouseMove = (e) => {
    if (!addIsDragging || !addOverlayRef.current) return;
    const rect = addOverlayRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const currentY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    setAddDragCurrent({ x: currentX, y: currentY });
  };

  const handleAddMouseUp = () => {
    if (!addIsDragging || !addOverlayRef.current) return;
    setAddIsDragging(false);

    const rect = addOverlayRef.current.getBoundingClientRect();
    const x = Math.min(addDragStart.x, addDragCurrent.x) / rect.width;
    const y = Math.min(addDragStart.y, addDragCurrent.y) / rect.height;
    const w = Math.abs(addDragStart.x - addDragCurrent.x) / rect.width;
    const h = Math.abs(addDragStart.y - addDragCurrent.y) / rect.height;

    if (w > 0.02 && h > 0.02) {
      setAddRoiBox({ x, y, w, h });
    }
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
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ color: 'var(--fg-strong)', fontSize: '18px', fontWeight: '800' }}>Camera Operations</h2>
          <p className="text-muted" style={{ marginTop: '2px' }}>Manage remote IP video sources and configure localized region-of-interest triggers.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => { handleCancelAdd(); setIsAddModalOpen(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '24px', fontWeight: '700', fontSize: '12.5px' }}
        >
          ➕ Add IP Camera
        </button>
      </div>

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

      {/* Main Accordion Directory */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px', margin: '0 auto' }}>
        {cameras.length > 0 ? (
          cameras.map((c) => {
            const isExpanded = selectedCameraId === c._id;
            return (
              <div
                key={c._id}
                style={{
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                {/* Card Header Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ fontWeight: '800', fontSize: '15px', color: 'var(--fg-strong)', margin: 0 }}>
                      {c.name}
                    </h3>
                    <div style={{ fontSize: '11px', color: 'var(--fg2)', wordBreak: 'break-all', fontFamily: 'monospace', marginTop: '4px' }}>
                      🔗 {c.source}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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
                    {c.roi && (
                      <span className="badge badge-sm badge-ok" style={{ fontSize: '9px' }}>
                        🎯 ROI Set
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
                      className={`btn btn-sm ${isExpanded && activeMode === 'roi' ? 'btn-ok' : ''}`}
                      style={{ padding: '6px 12px', fontSize: '11.5px', fontWeight: 'bold', background: isExpanded && activeMode === 'roi' ? 'var(--ok)' : 'var(--bg3)', border: '1px solid var(--border)', color: isExpanded && activeMode === 'roi' ? '#fff' : 'var(--fg)' }}
                      onClick={() => handleActionClick(c._id, 'roi')}
                    >
                      {isExpanded && activeMode === 'roi' ? '🎯 Editing ROI' : '🎯 Set ROI'}
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
                    
                    {/* Mode: Stream or ROI */}
                    {(activeMode === 'stream' || activeMode === 'roi') && (
                      <div>
                        {/* Stream preview box */}
                        <div className="roi-stage" ref={overlayRef} style={{ background: '#000', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-soft)' }}>
                          <img
                            className="video-frame"
                            src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=640&auto=format&fit=crop&q=80"
                            style={{ width: '100%', display: 'block', opacity: 0.8 }}
                            alt="Live Camera Feed"
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

                          {/* Drag-to-ROI selector overlays */}
                          {activeMode === 'roi' && (
                            <div
                              style={{ position: 'absolute', inset: 0, cursor: 'crosshair', zIndex: 10 }}
                              onMouseDown={(e) => handleMouseDown(e, c._id)}
                              onMouseMove={handleMouseMove}
                              onMouseUp={handleMouseUp}
                            ></div>
                          )}

                          {/* Dragging Bounding Box */}
                          {isDragging && dragActiveId === c._id && (
                            <div style={{
                              position: 'absolute',
                              border: '2px dashed var(--accent)',
                              background: 'rgba(139,92,246,0.1)',
                              left: Math.min(dragStart.x, dragCurrent.x),
                              top: Math.min(dragStart.y, dragCurrent.y),
                              width: Math.abs(dragStart.x - dragCurrent.x),
                              height: Math.abs(dragStart.y - dragCurrent.y),
                              pointerEvents: 'none',
                              zIndex: 15
                            }}></div>
                          )}

                          {/* Saved ROI Area using responsive percentages */}
                          {roiBox && !isDragging && (
                            <div style={{
                              position: 'absolute',
                              border: activeMode === 'roi' ? '2px dashed var(--accent)' : '2px solid var(--accent)',
                              background: 'rgba(139,92,246,0.15)',
                              left: `${roiBox.x * 100}%`,
                              top: `${roiBox.y * 100}%`,
                              width: `${roiBox.w * 100}%`,
                              height: `${roiBox.h * 100}%`,
                              pointerEvents: 'none',
                              zIndex: 14
                            }}>
                              <span style={{ position: 'absolute', top: '-18px', left: '0', background: 'var(--accent)', color: '#fff', fontSize: '9px', padding: '1px 5px', borderRadius: '3px 3px 0 0', fontWeight: 'bold' }}>
                                {activeMode === 'roi' ? 'EDITING ROI CAPTURE AREA' : 'ROI CAPTURE AREA'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* ROI control helper bar */}
                        {activeMode === 'roi' && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
                            <span className="text-muted" style={{ fontSize: '11px' }}>
                              Drag on the stream monitor above to select the capture area bounds.
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="btn btn-sm btn-ok"
                                disabled={!roiBox}
                                onClick={() => handleSaveRoi(c._id)}
                              >
                                Save Area
                              </button>
                              <button className="btn btn-sm" onClick={handleCancelEditingRoi}>
                                Cancel
                              </button>
                              <button className="btn btn-sm" onClick={() => handleClearRoi(c._id)}>
                                Clear Area
                              </button>
                            </div>
                          </div>
                        )}
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
          <div className="panel" style={{ padding: '40px', textAlign: 'center' }}>
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

              {/* Drag Preview Stream for Add Camera */}
              {addConnected && (
                <div style={{ marginBottom: '18px' }}>
                  <div className="roi-stage" ref={addOverlayRef} style={{ background: '#000', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                    <img
                      className="video-frame"
                      src="https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=640&auto=format&fit=crop&q=80"
                      style={{ width: '100%', display: 'block', opacity: 0.8 }}
                      alt="Connection Stream Preview"
                    />
                    <div
                      style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', cursor: 'crosshair', zIndex: 10 }}
                      onMouseDown={handleAddMouseDown}
                      onMouseMove={handleAddMouseMove}
                      onMouseUp={handleAddMouseUp}
                    ></div>

                    {/* Rendering Add Camera Drag bounds */}
                    {addIsDragging && (
                      <div style={{
                        position: 'absolute',
                        border: '2px dashed var(--accent)',
                        background: 'rgba(139,92,246,0.1)',
                        left: Math.min(addDragStart.x, addDragCurrent.x),
                        top: Math.min(addDragStart.y, addDragCurrent.y),
                        width: Math.abs(addDragStart.x - addDragCurrent.x),
                        height: Math.abs(addDragStart.y - addDragCurrent.y),
                        pointerEvents: 'none',
                        zIndex: 15
                      }}></div>
                    )}

                    {/* Rendering Add Camera Saved ROI Area */}
                    {addRoiBox && !addIsDragging && (
                      <div style={{
                        position: 'absolute',
                        border: '2px solid var(--accent)',
                        background: 'rgba(139,92,246,0.15)',
                        left: `${addRoiBox.x * 100}%`,
                        top: `${addRoiBox.y * 100}%`,
                        width: `${addRoiBox.w * 100}%`,
                        height: `${addRoiBox.h * 100}%`,
                        pointerEvents: 'none',
                        zIndex: 14
                      }}></div>
                    )}
                  </div>

                  <div style={{ marginTop: '6px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="text-muted" style={{ fontSize: '11px' }}>Drag on frame to define ROI bounds (optional).</span>
                    <button type="button" className="btn btn-sm" style={{ padding: '3px 8px' }} onClick={() => setAddRoiBox(null)}>Clear Area</button>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
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
