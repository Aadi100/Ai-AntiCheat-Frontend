import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { SecureImage } from '../components/SecureImage';
import * as apiSvc from '../utils/api';

export const TestCamera = () => {
  const { setConsoleLogs } = useApp();

  const [usbList, setUsbList] = useState([]);
  const [selectedUsb, setSelectedUsb] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('Rescan to fetch available hardware USB index ports.');
  const [isStreaming, setIsStreaming] = useState(false);
  const [feedTime, setFeedTime] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Real video refs
  const videoRef = useRef(null);
  const localStreamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Capture parameters states
  const [cameraId, setCameraId] = useState('test_usb_camera');
  const [processMode, setProcessMode] = useState('local');
  const [datasetFolder, setDatasetFolder] = useState('dataset');
  const [collectionId, setCollectionId] = useState('');
  const [logDetections, setLogDetections] = useState(true);
  const [returnDetails, setReturnDetails] = useState(true);

  // Capture processing states
  const [captureCount, setCaptureCount] = useState(5);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState(null);
  const [error, setError] = useState(null);

  // Resize listener
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load USB list on mount
  const handleScanUsb = async () => {
    setScanning(true);
    setScanStatus('Scanning USB bus indices...');
    try {
      const res = await apiSvc.scanUsb();
      if (res.ok && res.data?.response_data) {
        const ports = res.data.response_data.map(String);
        setUsbList(ports);
        setScanStatus(`Scan complete. Found ${ports.length} available ports.`);
        if (ports.length > 0 && !ports.includes(selectedUsb)) {
          setSelectedUsb(ports[0]);
        }
      } else {
        const mockPorts = ['0', '1', '2'];
        setUsbList(mockPorts);
        setScanStatus('Scan failed or empty. Loading default mock indices.');
        if (!selectedUsb) setSelectedUsb(mockPorts[0]);
      }
    } catch (e) {
      const mockPorts = ['0', '1', '2'];
      setUsbList(mockPorts);
      setScanStatus('Could not reach backend server. Loading mock indices.');
      if (!selectedUsb) setSelectedUsb(mockPorts[0]);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    handleScanUsb();
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

  // Clean up streaming on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Streaming Actions
  const handleStartStream = async () => {
    if (!selectedUsb) {
      alert("Select a USB Index first.");
      return;
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        localStreamRef.current = stream;
      }
      setIsStreaming(true);
      setConsoleLogs(prev => [...prev, `[Camera Test] Real webcam stream started for USB Index: ${selectedUsb}`]);
    } catch (err) {
      console.error("Failed to access webcam feed:", err);
      setError(`Permission denied or no webcam hardware found: ${err.message}. Showing simulated diagnostic stream.`);
      setIsStreaming(true); // Fallback to simulated render inside stream container
    }
  };

  const handleStopStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setIsCapturing(false);
    setIsAnalyzing(false);
    setConsoleLogs(prev => [...prev, `[Camera Test] Diagnostic stream stopped.`]);
  };

  // Canvas Grabs and Recognition Loop
  const handleCaptureAndRecognize = async () => {
    if (isCapturing || isAnalyzing) return;
    setIsCapturing(true);
    setCaptureProgress(0);
    setDiagnosticResults(null);
    setError(null);

    const count = parseInt(captureCount) || 5;
    const capturedImages = {};
    let current = 0;
    const intervalTime = 200; // 5 images per second (200ms)

    setConsoleLogs(prev => [...prev, `[Camera Test] Grabbing ${count} frames from webcam feed at 5 FPS...`]);

    const runCaptureTick = () => {
      if (current >= count) {
        setIsCapturing(false);
        setIsAnalyzing(true);
        setConsoleLogs(prev => [...prev, `[Camera Test] Frames captured. Posting payload to recognize-images API...`]);
        sendToRecognitionAPI(capturedImages);
        return;
      }

      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');

        // Draw feed source (Webcam video stream or placeholder image)
        if (videoRef.current && videoRef.current.srcObject) {
          ctx.drawImage(videoRef.current, 0, 0, 640, 360);
        } else {
          // Simulated canvas test pattern color fill
          ctx.fillStyle = '#0f0f1c';
          ctx.fillRect(0, 0, 640, 360);
          ctx.fillStyle = '#fff';
          ctx.font = '24px monospace';
          ctx.textAlign = 'center';
          ctx.fillText("SIMULATED DIAGNOSTIC FEED", 320, 160);
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(40, 200, 560, 40);
          ctx.fillStyle = 'var(--accent)';
          ctx.fillRect(40, 200, (current + 1) * (560 / count), 40);
        }

        // Draw diagnostic watermark overlay
        ctx.fillStyle = '#10b981'; // Green color overlay
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`TEST USB INDEX: ${selectedUsb}`, 15, 30);
        ctx.fillText(`TIMESTAMP: ${new Date().toISOString()}`, 15, 48);
        ctx.fillText(`CAPTURE: frame ${current + 1}/${count} (5 FPS)`, 15, 66);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        capturedImages[`img${current + 1}`] = dataUrl;
      } catch (err) {
        console.error("Frame capture error:", err);
      }

      current++;
      setCaptureProgress(current);
      setTimeout(runCaptureTick, intervalTime);
    };

    setTimeout(runCaptureTick, 0);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsAnalyzing(true);
    setDiagnosticResults(null);
    setError(null);
    setConsoleLogs(prev => [...prev, `[Camera Test] Reading ${files.length} selected files...`]);

    try {
      const readPromises = files.map(file => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
      });

      const base64List = await Promise.all(readPromises);
      const imagesObj = {};
      base64List.forEach((base64, index) => {
        imagesObj[`img${index + 1}`] = base64;
      });

      setConsoleLogs(prev => [...prev, `[Camera Test] Uploading and matching ${files.length} images...`]);
      await sendToRecognitionAPI(imagesObj);
    } catch (err) {
      setError(`Failed to read image files: ${err.message}`);
      setIsAnalyzing(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const sendToRecognitionAPI = async (imagesObj) => {
    try {
      const payload = {
        camera_id: cameraId,
        process: processMode,
        images: imagesObj,
        dataset_folder: datasetFolder,
        collection_id: collectionId || null,
        log: logDetections,
        return_details: returnDetails
      };

      const res = await apiSvc.recognizeImages(payload);
      if (res.ok) {
        setDiagnosticResults(res.data || null);
        setConsoleLogs(prev => [...prev, `[Camera Test] Recognition successful. Total detected: ${res.data?.response_data?.summary?.total_faces || 0}`]);
      } else {
        setError(res.data?.response_message || 'API matching pipeline failed.');
        setConsoleLogs(prev => [...prev, `[Camera Test] Recognition pipeline error: ${res.data?.response_message}`]);
      }
    } catch (err) {
      setError(`Connection error: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const inputStyle = {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--bg3)',
    color: 'var(--fg)',
    fontSize: '12px',
    boxSizing: 'border-box',
    width: '100%',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
  };

  const hasConsole = isStreaming || isAnalyzing || diagnosticResults;
  const isWide = windowWidth > 1100;

  // Grid layout structure: dynamic side-by-side or stacked
  const gridTemplate = isWide 
    ? (hasConsole ? '300px 1.2fr 1fr' : '300px 1.2fr')
    : '1fr';

  return (
    <div style={{ width: '100%' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: 'var(--fg-strong)', fontSize: '18px', fontWeight: '800' }}>Hardware Diagnostics</h2>
        <p className="text-muted" style={{ marginTop: '2px' }}>Query and preview active USB capture interfaces connected to your local system environment.</p>
      </div>

      {error && (
        <div className="banner-err" style={{ background: 'rgba(240,71,90,0.1)', borderColor: 'rgba(240,71,90,0.3)', borderLeftColor: 'var(--err)', color: 'var(--fg)', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, gap: '24px', alignItems: 'start', width: '100%' }}>
        
        {/* Column 1: Config Forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Section 1: USB Port Discovery */}
          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ fontWeight: '800', fontSize: '13.5px', color: 'var(--fg-strong)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="grid" size={15} />
              USB Port Selection
            </h3>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <select
                className="form-select"
                style={{ ...inputStyle, maxWidth: '180px', cursor: 'pointer' }}
                value={selectedUsb}
                onChange={(e) => {
                  setSelectedUsb(e.target.value);
                  if (isStreaming) {
                    handleStopStream();
                  }
                }}
              >
                {usbList.length > 0 ? (
                  usbList.map((port) => (
                    <option key={port} value={port}>
                      USB Port Index {port}
                    </option>
                  ))
                ) : (
                  <option value="">No USB Ports Scanned</option>
                )}
              </select>

              <button
                type="button"
                className="btn btn-sm"
                style={{ padding: '8px 12px', fontWeight: '600' }}
                onClick={handleScanUsb}
                disabled={scanning}
              >
                {scanning ? 'Scanning...' : 'Rescan Ports'}
              </button>
            </div>
            
            <div className="text-muted" style={{ fontSize: '11px', marginBottom: '16px' }}>
              {scanStatus}
            </div>

            <button
              type="button"
              className={`btn btn-sm ${isStreaming ? 'btn-danger' : 'btn-primary'}`}
              style={{ width: '100%', fontWeight: 'bold', padding: '10px' }}
              onClick={isStreaming ? handleStopStream : handleStartStream}
              disabled={usbList.length === 0}
            >
              {isStreaming ? '⏹ Stop Diagnostic Stream' : '▶ Start Diagnostic Stream'}
            </button>
          </div>

          {/* Section 2: API Parameters Form */}
          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ fontWeight: '800', fontSize: '13.5px', color: 'var(--fg-strong)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="trending-up" size={15} />
              API Body Parameters
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>Camera ID</label>
                <input
                  className="form-input"
                  style={inputStyle}
                  value={cameraId}
                  onChange={e => setCameraId(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0, marginTop: '12px' }}>
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>Process Mode</label>
                <select
                  className="form-select"
                  style={{ ...inputStyle, background: 'var(--bg2)' }}
                  value={processMode}
                  onChange={e => setProcessMode(e.target.value)}
                >
                  <option value="local">local</option>
                  <option value="server">server</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>Dataset Folder</label>
                <input
                  className="form-input"
                  style={inputStyle}
                  value={datasetFolder}
                  onChange={e => setDatasetFolder(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0, marginTop: '12px' }}>
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>Collection ID</label>
                <input
                  className="form-input"
                  style={inputStyle}
                  placeholder="e.g. default"
                  value={collectionId}
                  onChange={e => setCollectionId(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              <div className="form-check" style={{ marginBottom: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  id="logDetections"
                  checked={logDetections}
                  onChange={e => setLogDetections(e.target.checked)}
                  style={{ width: '14px', height: '14px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
                <label htmlFor="logDetections" style={{ fontSize: '11px', cursor: 'pointer', margin: 0 }}>Log matches to Database</label>
              </div>
              <div className="form-check" style={{ marginBottom: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  id="returnDetails"
                  checked={returnDetails}
                  onChange={e => setReturnDetails(e.target.checked)}
                  style={{ width: '14px', height: '14px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
                <label htmlFor="returnDetails" style={{ fontSize: '11px', cursor: 'pointer', margin: 0 }}>Return detailed faces metadata</label>
              </div>
            </div>
          </div>

        </div>

        {/* Column 2: Video Monitor & Captures */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Monitor */}
          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ fontWeight: '800', fontSize: '13.5px', color: 'var(--fg-strong)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="image" size={15} />
              Diagnostic Stream Monitor
            </h3>

            <div className="roi-stage" style={{ background: '#07070c', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-soft)', minHeight: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', display: isStreaming && localStreamRef.current ? 'block' : 'none', opacity: 0.85 }}
              />

              {!localStreamRef.current && isStreaming && (
                <img
                  className="video-frame"
                  src="https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=640&auto=format&fit=crop&q=80"
                  style={{ width: '100%', display: 'block', opacity: 0.85 }}
                  alt="Simulated Diagnostic Stream Feed"
                />
              )}

              {isStreaming ? (
                /* Grid HUD Overlays */
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: '20px' }}>
                    <span className="dot-live" style={{ width: '6px', height: '6px', boxShadow: 'none' }}></span>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {localStreamRef.current ? 'Real Feed' : 'Sim Feed'}
                    </span>
                  </div>

                  <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '9px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: '4px' }}>
                    USB Index {selectedUsb}
                  </div>

                  <div style={{ position: 'absolute', bottom: '12px', right: '12px', fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px' }}>
                    {feedTime}
                  </div>

                  <div style={{ position: 'absolute', bottom: '12px', left: '12px', fontSize: '9px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px' }}>
                    DIAGNOSTICS ACTIVE
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--fg3)', textAlign: 'center', padding: '24px' }}>
                  <div style={{ background: 'var(--bg2)', padding: '16px', borderRadius: '50%', marginBottom: '14px', border: '1px solid var(--border)' }}>
                    <Icon name="film" size={28} />
                  </div>
                  <div style={{ fontWeight: 'bold', color: 'var(--fg-strong)', fontSize: '14px' }}>Diagnostic Stream Offline</div>
                  <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px', maxWidth: '240px' }}>
                    Select a connected USB camera port and click "Start Diagnostic Stream".
                  </p>
                </div>
              )}
            </div>

            {/* Capture & Upload controls row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--border-soft)', paddingTop: '16px' }}>
              
              {/* Count config */}
              {isStreaming && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '11.5px', color: 'var(--fg2)', whiteSpace: 'nowrap' }}>Capture count:</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    className="form-input"
                    style={{ ...inputStyle, width: '70px', padding: '6px 8px' }}
                    value={captureCount}
                    onChange={e => setCaptureCount(e.target.value)}
                    disabled={isCapturing || isAnalyzing}
                  />
                  <span className="text-muted" style={{ fontSize: '10.5px' }}>(for livestream diagnostic)</span>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'grid', gridTemplateColumns: isStreaming ? '1fr 1fr' : '1fr', gap: '12px' }}>
                {isStreaming && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}
                    onClick={handleCaptureAndRecognize}
                    disabled={isCapturing || isAnalyzing}
                  >
                    {isCapturing ? (
                      <>
                        <span className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px', marginRight: '4px' }}></span>
                        Grabbing {captureProgress}/{captureCount}...
                      </>
                    ) : (
                      <>⚡ Capture & Recognize</>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  className="btn"
                  style={{ 
                    fontWeight: 'bold', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    padding: '10px', 
                    background: isStreaming ? 'var(--bg3)' : 'var(--accent)', 
                    border: isStreaming ? '1px solid var(--border)' : 'none',
                    color: isStreaming ? 'var(--fg)' : '#fff'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCapturing || isAnalyzing}
                >
                  📂 Upload & Recognize
                </button>

                <input
                  type="file"
                  multiple
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </div>

            </div>
          </div>
        </div>

        {/* Column 3: Diagnostic Console Panel (renders next to monitor in grid mode) */}
        {hasConsole && (
          <div className="panel" style={{ padding: '20px', background: '#0a0a0f', border: '1px solid var(--border)', minHeight: '445px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', marginBottom: '10px' }}>
              [DIAGNOSTIC PIPELINE MONITOR]
            </div>

            {isCapturing && (
              <div style={{ margin: 'auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <span className="spinner" style={{ width: '20px', height: '20px' }}></span>
                <span style={{ fontSize: '11px', color: 'var(--fg2)', fontFamily: 'monospace' }}>
                  GRABBING RAW FRAMES: buffer {captureProgress}/{captureCount} (5 images/sec)...
                </span>
              </div>
            )}

            {isAnalyzing && (
              <div style={{ margin: 'auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <span className="spinner" style={{ width: '20px', height: '20px', borderTopColor: 'var(--ok)' }}></span>
                <span style={{ fontSize: '11px', color: 'var(--ok)', fontFamily: 'monospace' }}>
                  DISPATCHING PAYLOAD TO RECOGNIZE-IMAGES PIPELINE...
                </span>
              </div>
            )}

            {!isCapturing && !isAnalyzing && !diagnosticResults && (
              <div style={{ margin: 'auto 0', textAlign: 'center', color: 'var(--fg3)', fontSize: '11px', fontFamily: 'monospace', padding: '10px' }}>
                System idle. Ready to test. Click "Capture & Recognize" or "Upload & Recognize" to post frames.
              </div>
            )}

            {diagnosticResults && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', fontSize: '11px', fontFamily: 'monospace' }}>
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', padding: '6px 10px', borderRadius: '6px', color: '#10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>STATUS: {diagnosticResults.response_message || 'OK'}</span>
                  <span style={{ fontSize: '10px', background: 'var(--ok)', color: '#000', padding: '1px 5px', borderRadius: '3px', fontWeight: 'bold' }}>{diagnosticResults.response_code || 200}</span>
                </div>
                
                {diagnosticResults.response_data?.summary && (
                  <div style={{ display: 'flex', gap: '10px', background: 'var(--bg3)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div>Det: <strong>{diagnosticResults.response_data.summary.total_faces}</strong></div>
                    <div>Match: <strong style={{ color: '#10b981' }}>{diagnosticResults.response_data.summary.matched}</strong></div>
                    <div>Unmatch: <strong style={{ color: 'var(--err)' }}>{diagnosticResults.response_data.summary.unmatched}</strong></div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {diagnosticResults.response_data?.results && 
                    Object.entries(diagnosticResults.response_data.results).map(([imgKey, resObj]) => (
                      <div key={imgKey} style={{ borderLeft: '3px solid var(--accent)', background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: '0 8px 8px 0', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', marginBottom: '8px' }}>
                          <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '12px' }}>{imgKey.toUpperCase()}</span>
                          {resObj.annotated_path && (
                            <a 
                              href={apiSvc.formatImagePath(resObj.annotated_path)} 
                              target="_blank" 
                              rel="noreferrer"
                              style={{ fontSize: '10px', color: 'var(--accent)', textDecoration: 'underline' }}
                            >
                              View Full Frame
                            </a>
                          )}
                        </div>
                        
                        {resObj.annotated_path && (
                          <div style={{ marginBottom: '10px', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <SecureImage 
                              src={resObj.annotated_path}
                              style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '180px', objectFit: 'contain' }}
                              alt="Annotated Capture Feed"
                            />
                          </div>
                        )}

                        {resObj.error ? (
                          <span style={{ color: 'var(--err)', fontSize: '11px' }}>{resObj.error}</span>
                        ) : resObj.faces && resObj.faces.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {resObj.faces.map((f, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                {f.crop_path && (
                                  <SecureImage
                                    src={f.crop_path}
                                    style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover' }}
                                    alt="Face Preview"
                                  />
                                )}
                                <div>
                                  <div style={{ color: 'var(--fg-strong)', fontWeight: 'bold', fontSize: '11px' }}>
                                    {f.name}
                                  </div>
                                  <div style={{ fontSize: '9.5px', color: 'var(--fg3)' }}>
                                    {f.similarity?.toFixed(1)}% similarity
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--fg3)', fontSize: '11px' }}>No face detected</span>
                        )}
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default TestCamera;
