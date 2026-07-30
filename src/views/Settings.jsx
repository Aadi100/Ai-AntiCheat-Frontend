import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import * as apiSvc from '../utils/api';

export const Settings = () => {
  const {
    settings,
    setSettings,
    setConsoleLogs,
    setAlerts,
    setEntryLogs,
    setEnrolledPersons,
    setUnknownPersons,
    setInvoices,
    setBillingSummary
  } = useApp();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'aws' | 'matching' | 'danger'

  // Dynamic Recognition Options
  const [recognitionOptions, setRecognitionOptions] = useState({
    detectors: [
      { id: 'yunet', label: 'YuNet', note: 'fast' },
      { id: 'mtcnn', label: 'MTCNN', note: null },
      { id: 'retinaface', label: 'RetinaFace', note: 'accurate' }
    ],
    models: [
      { id: 'ArcFace', label: 'ArcFace', recommended_threshold: 0.55, recommended_margin: 0.05 },
      { id: 'Facenet512', label: 'Facenet512', recommended_threshold: 0.65, recommended_margin: 0.05 }
    ],
    default: { detector: 'mtcnn', model: 'Facenet512', robust: false }
  });

  // Form states matching live API fields
  const [detector, setDetector] = useState('mtcnn');
  const [embeddingModel, setEmbeddingModel] = useState('Facenet512');
  const [robustEmb, setRobustEmb] = useState(false);

  const [syncEndpoint, setSyncEndpoint] = useState('');
  const [cameraSaveDir, setCameraSaveDir] = useState('');
  const [cameraDatasetDir, setCameraDatasetDir] = useState('');
  const [cameraAreaEnabled, setCameraAreaEnabled] = useState(true);
  const [useMultipleImages, setUseMultipleImages] = useState(false);
  
  const [serverRegion, setServerRegion] = useState('');
  const [serverCollectionId, setServerCollectionId] = useState('');
  const [unknownServerCollectionId, setUnknownServerCollectionId] = useState('');
  const [serverAccessKey, setServerAccessKey] = useState('');
  const [serverSecretKey, setServerSecretKey] = useState('');
  const [trainUnknownEverySighting, setTrainUnknownEverySighting] = useState(true);

  const [apiKey, setApiKey] = useState('');

  // Matching configuration
  const [selectedMatchModel, setSelectedMatchModel] = useState('Facenet512');
  const [threshold, setThreshold] = useState(65);
  const [margin, setMargin] = useState(5);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      const [settingsRes, optionsRes] = await Promise.all([
        apiSvc.fetchSettings(),
        apiSvc.fetchRecognitionOptions()
      ]);

      if (optionsRes.ok && optionsRes.data?.response_data) {
        setRecognitionOptions(optionsRes.data.response_data);
      }

      if (settingsRes.ok) {
        const data = settingsRes.data.response_data || {};
        setSettings(data);
        syncFormFields(data, optionsRes.ok ? optionsRes.data.response_data : null);
      } else {
        setSaveStatus(`✗ Failed to load database settings: ${settingsRes.data?.response_message}`);
      }
    } catch (err) {
      setSaveStatus(`✗ Could not connect to the backend: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const syncFormFields = (s, opt = null) => {
    setDetector(s.detector || 'mtcnn');
    setEmbeddingModel(s.embedding_model || 'Facenet512');
    setRobustEmb(s.robust_emb ?? false);

    setSyncEndpoint(s.sync_endpoint || '');
    setCameraSaveDir(s.camera_save_dir || '');
    setCameraDatasetDir(s.camera_dataset_dir || '');
    setCameraAreaEnabled(s.camera_area_enabled ?? true);
    setUseMultipleImages(s.use_multiple_images ?? false);

    setServerRegion(s.server_region || '');
    setServerCollectionId(s.server_collection_id || '');
    setUnknownServerCollectionId(s.unknown_server_collection_id || '');
    setTrainUnknownEverySighting(s.train_unknown_every_sighting ?? true);
    setServerAccessKey(s.server_access_key || '');
    setServerSecretKey(s.server_secret_key || '');

    setApiKey(s.api_key || '');

    const currentModel = s.embedding_model || 'Facenet512';
    setSelectedMatchModel(prev => prev || currentModel);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Update threshold/margin sliders when selectedMatchModel or settings change
  useEffect(() => {
    if (settings) {
      // Find model details for default values if not defined in settings
      const opts = recognitionOptions || {};
      const modelObj = opts.models?.find(m => m.id === selectedMatchModel);
      const defaultThresh = modelObj ? modelObj.recommended_threshold : 0.65;
      const defaultMargin = modelObj ? modelObj.recommended_margin : 0.05;

      const threshVal = settings.match_threshold_by_model?.[selectedMatchModel] ?? defaultThresh;
      const marginVal = settings.match_margin_by_model?.[selectedMatchModel] ?? defaultMargin;
      
      setThreshold(Math.round(threshVal * 100));
      setMargin(Math.round(marginVal * 100));
    }
  }, [selectedMatchModel, settings, recognitionOptions]);

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus('');
    try {
      const payload = {
        api_key: apiKey,
        sync_endpoint: syncEndpoint,
        camera_save_dir: cameraSaveDir,
        camera_dataset_dir: cameraDatasetDir,
        camera_area_enabled: cameraAreaEnabled,
        use_multiple_images: useMultipleImages,
        detector,
        embedding_model: embeddingModel,
        robust_emb: robustEmb
      };
      const res = await apiSvc.saveSettings(payload);
      if (res.ok) {
        setSaveStatus('✓ General configurations saved successfully.');
        setConsoleLogs(prev => [...prev, `[Settings] Saved general backend configurations.`]);
        const updated = res.data.response_data || {};
        setSettings(updated);
        syncFormFields(updated);
      } else {
        setSaveStatus(`✗ ${res.data?.response_message || 'Failed to save general settings.'}`);
      }
    } catch (err) {
      setSaveStatus(`✗ Connection error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAws = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus('');
    try {
      const payload = {
        server_access_key: serverAccessKey,
        server_secret_key: serverSecretKey,
        server_region: serverRegion,
        server_collection_id: serverCollectionId,
        unknown_server_collection_id: unknownServerCollectionId,
        train_unknown_every_sighting: trainUnknownEverySighting
      };
      const res = await apiSvc.saveSettings(payload);
      if (res.ok) {
        setSaveStatus('✓ Server Cloud settings saved successfully.');
        setConsoleLogs(prev => [...prev, `[Settings] Updated Server Rekognition collection configs.`]);
        const updated = res.data.response_data || {};
        setSettings(updated);
        syncFormFields(updated);
      } else {
        setSaveStatus(`✗ ${res.data?.response_message || 'Failed to save Server settings.'}`);
      }
    } catch (err) {
      setSaveStatus(`✗ Connection error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMatch = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus('');
    try {
      const payload = {
        threshold: threshold / 100,
        margin: margin / 100,
        embedding_model: selectedMatchModel
      };
      const res = await apiSvc.saveMatchSettings(payload);
      if (res.ok) {
        setSaveStatus('✓ Model matching criteria updated.');
        setConsoleLogs(prev => [...prev, `[Settings] Threshold: ${threshold}%, Margin: ${margin}% for ${selectedMatchModel}`]);
        await loadSettings();
      } else {
        setSaveStatus(`✗ ${res.data?.response_message || 'Failed to save parameters.'}`);
      }
    } catch (err) {
      setSaveStatus(`✗ Connection error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleFlushDatabase = async () => {
    if (!window.confirm('CAUTION: This will delete ALL enrolled persons, unknown profiles, sighting logs, alerts, and billing invoices. This action CANNOT be undone! Are you absolutely sure?')) return;
    setSaving(true);
    setSaveStatus('');
    try {
      const res = await apiSvc.flushDatabase();
      if (res.ok) {
        setAlerts([]);
        setEntryLogs([]);
        setEnrolledPersons([]);
        setUnknownPersons([]);
        setInvoices([]);
        setBillingSummary(null);
        setConsoleLogs([`[Database] Database flushed. All tables cleared.`, `[Startup] Pipeline active. Monitoring...`]);
        setSaveStatus('✓ Database flushed successfully.');
      } else {
        setSaveStatus(`✗ ${res.data?.response_message || 'Flush failed.'}`);
      }
    } catch (err) {
      setSaveStatus(`✗ Connection error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', gap: '12px' }}>
        <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,.15)', borderTopColor: 'var(--accent)' }}></div>
        <span className="text-muted">Loading settings panel...</span>
      </div>
    );
  }

  // Styles utility
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

  const panelCardStyle = {
    background: 'var(--panel)',
    borderRadius: '12px',
    border: '1px solid var(--border-soft)',
    padding: '24px',
    boxShadow: 'var(--shadow-sm)',
    margin: 0
  };

  const toggleContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    background: 'var(--bg2)',
    borderRadius: '8px',
    border: '1px solid var(--border-soft)',
    marginBottom: '16px'
  };

  const renderTabChip = (id, label) => {
    const active = activeTab === id;
    return (
      <button 
        className="btn"
        style={{
          padding: '8px 16px',
          borderRadius: '20px',
          border: '1px solid',
          borderColor: active ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
          background: active ? 'rgba(124,108,240,0.12)' : 'var(--bg3)',
          color: active ? 'var(--accent)' : 'var(--fg2)',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '12.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: active ? '0 2px 8px rgba(124,108,240,0.15)' : 'none'
        }}
        onClick={() => setActiveTab(id)}
      >
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure recognition models, cloud collections, matching criteria, and system defaults."
      />

      {saveStatus && (
        <div style={{
          padding: '12px 18px',
          marginBottom: '20px',
          borderRadius: '8px',
          background: saveStatus.startsWith('✓') ? 'rgba(34,197,94,0.12)' : 'rgba(240,71,90,0.12)',
          color: saveStatus.startsWith('✓') ? 'var(--ok)' : 'var(--err)',
          fontSize: '13px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <Icon name={saveStatus.startsWith('✓') ? 'check-circle' : 'alert-triangle'} size={15} />
          {saveStatus}
        </div>
      )}

      {/* Tabs Menu */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--border-soft)', paddingBottom: '14px', marginBottom: '24px' }}>
        {renderTabChip('general', '⚙️ General & Paths')}
        {renderTabChip('aws', '☁️ Cloud Server')}
        {renderTabChip('matching', '🎯 Matching Criteria')}
        {renderTabChip('danger', '⚠️ Danger Zone')}
      </div>

      {/* TAB 1: General & Paths */}
      {activeTab === 'general' && (
        <div style={panelCardStyle}>
          <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '18px', borderBottom: '1px solid var(--border-soft)', paddingBottom: '10px' }}>
            API Keys & Directory Storage
          </div>
          <form onSubmit={handleSaveGeneral}>
            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ fontWeight: '600', fontSize: '12.5px', marginBottom: '6px' }}>Internal Admin Secret Key</label>
              <input
                type="text"
                className="form-input mono"
                style={inputStyle}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="Admin API key"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ fontWeight: '600', fontSize: '12.5px', marginBottom: '6px' }}>Detections Sync Endpoint URL</label>
              <input
                type="text"
                className="form-input mono"
                style={inputStyle}
                value={syncEndpoint}
                onChange={e => setSyncEndpoint(e.target.value)}
                placeholder="http://..."
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ fontWeight: '600', fontSize: '12.5px', marginBottom: '6px' }}>Camera Saves Directory Path</label>
              <input
                type="text"
                className="form-input mono"
                style={inputStyle}
                value={cameraSaveDir}
                onChange={e => setCameraSaveDir(e.target.value)}
                placeholder="e.g. C:\saves"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ fontWeight: '600', fontSize: '12.5px', marginBottom: '6px' }}>Camera Dataset Directory Path</label>
              <input
                type="text"
                className="form-input mono"
                style={inputStyle}
                value={cameraDatasetDir}
                onChange={e => setCameraDatasetDir(e.target.value)}
                placeholder="e.g. C:\dataset"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ fontWeight: '600', fontSize: '12.5px', marginBottom: '6px' }}>Active Face Detector</label>
              <select className="form-select" style={inputStyle} value={detector} onChange={e => setDetector(e.target.value)}>
                {recognitionOptions.detectors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.label} {d.note ? `(${d.note})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ fontWeight: '600', fontSize: '12.5px', marginBottom: '6px' }}>Active Embedding Model</label>
              <select className="form-select" style={inputStyle} value={embeddingModel} onChange={e => setEmbeddingModel(e.target.value)}>
                {recognitionOptions.models.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Card 1: Coordinate Grid */}
            <div style={toggleContainerStyle}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '13px' }}>Enable Camera ROI Coordinate Grid</div>
                <div style={{ fontSize: '11px', color: 'var(--fg3)', marginTop: '2px' }}>Limit pipeline detections to specified region-of-interest coordinates</div>
              </div>
              <input
                type="checkbox"
                checked={cameraAreaEnabled}
                onChange={e => setCameraAreaEnabled(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent)' }}
              />
            </div>

            {/* Toggle Card 2: Multiple Images */}
            <div style={toggleContainerStyle}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '13px' }}>Use Multiple Images per Profile</div>
                <div style={{ fontSize: '11px', color: 'var(--fg3)', marginTop: '2px' }}>Enable multiple training photos verification checks per identity</div>
              </div>
              <input
                type="checkbox"
                checked={useMultipleImages}
                onChange={e => setUseMultipleImages(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent)' }}
              />
            </div>

            {/* Toggle Card 3: Robust Embedding */}
            <div style={{ ...toggleContainerStyle, marginBottom: '24px' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '13px' }}>Robust Embedding Generation</div>
                <div style={{ fontSize: '11px', color: 'var(--fg3)', marginTop: '2px' }}>Generate more robust facial embeddings for higher matching consistency</div>
              </div>
              <input
                type="checkbox"
                checked={robustEmb}
                onChange={e => setRobustEmb(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent)' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }} disabled={saving}>
              {saving ? 'Saving Configurations...' : 'Save General Settings'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: AWS Cloud Server */}
      {activeTab === 'aws' && (
        <div style={panelCardStyle}>
          <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '18px', borderBottom: '1px solid var(--border-soft)', paddingBottom: '10px' }}>
            Server Rekognition Integration Settings
          </div>
          <form onSubmit={handleSaveAws}>
            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ fontWeight: '600', fontSize: '12.5px', marginBottom: '6px' }}>Server Access Key ID</label>
              <input
                type="text"
                className="form-input mono"
                style={inputStyle}
                value={serverAccessKey}
                onChange={e => setServerAccessKey(e.target.value)}
                placeholder="AKIA..."
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ fontWeight: '600', fontSize: '12.5px', marginBottom: '6px' }}>Server Secret Access Key</label>
              <input
                type="password"
                className="form-input mono"
                style={inputStyle}
                value={serverSecretKey}
                onChange={e => setServerSecretKey(e.target.value)}
                placeholder="••••••••••••••••••••"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ fontWeight: '600', fontSize: '12.5px', marginBottom: '6px' }}>Server Region</label>
              <input
                type="text"
                className="form-input mono"
                style={inputStyle}
                value={serverRegion}
                onChange={e => setServerRegion(e.target.value)}
                placeholder="us-east-1"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ fontWeight: '600', fontSize: '12.5px', marginBottom: '6px' }}>Authorized Faces Collection ID</label>
              <input
                type="text"
                className="form-input mono"
                style={inputStyle}
                value={serverCollectionId}
                onChange={e => setServerCollectionId(e.target.value)}
                placeholder="rekognition-authorized-faces"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ fontWeight: '600', fontSize: '12.5px', marginBottom: '6px' }}>Unknown Faces Collection ID</label>
              <input
                type="text"
                className="form-input mono"
                style={inputStyle}
                value={unknownServerCollectionId}
                onChange={e => setUnknownServerCollectionId(e.target.value)}
                placeholder="rekognition-unknown-faces"
              />
            </div>

            {/* Toggle Card 5 */}
            <div style={{ ...toggleContainerStyle, marginBottom: '24px' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '13px' }}>Train Unknowns on Every Sighting</div>
                <div style={{ fontSize: '11px', color: 'var(--fg3)', marginTop: '2px' }}>Train unknown face vectors automatically upon each recorded sighting detection</div>
              </div>
              <input
                type="checkbox"
                checked={trainUnknownEverySighting}
                onChange={e => setTrainUnknownEverySighting(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent)' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }} disabled={saving}>
              {saving ? 'Saving Configurations...' : 'Save Server Settings'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: Matching Criteria */}
      {activeTab === 'matching' && (
        <div style={panelCardStyle}>
          <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '18px', borderBottom: '1px solid var(--border-soft)', paddingBottom: '10px' }}>
            Model-Specific Matching Criteria
          </div>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ fontWeight: '600', fontSize: '12.5px', marginBottom: '6px' }}>Configure Parameters for Model</label>
            <select className="form-select" style={inputStyle} value={selectedMatchModel} onChange={e => setSelectedMatchModel(e.target.value)}>
              {recognitionOptions.models.map(m => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-muted" style={{ marginBottom: '20px', fontSize: '13px' }}>
            Adjust validation parameters for model: <strong style={{ color: 'var(--accent)' }}>{selectedMatchModel}</strong>.
          </p>
          <form onSubmit={handleSaveMatch}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ fontWeight: '600', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Match Threshold</span>
                <span className="mono font-bold" style={{ color: 'var(--accent)', fontSize: '13.5px' }}>{threshold}%</span>
              </label>
              <input
                type="range"
                min="30"
                max="99"
                step="1"
                value={threshold}
                onChange={e => setThreshold(parseInt(e.target.value))}
                style={{ width: '100%', height: '6px', background: 'var(--bg3)', borderRadius: '4px', cursor: 'pointer' }}
              />
              <div className="text-muted" style={{ fontSize: '11px', marginTop: '6px' }}>
                Minimum similarity score percentage required to count as a match for {selectedMatchModel}.
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" style={{ fontWeight: '600', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Match Tolerance Margin</span>
                <span className="mono font-bold" style={{ color: 'var(--accent)', fontSize: '13.5px' }}>{margin}%</span>
              </label>
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={margin}
                onChange={e => setMargin(parseInt(e.target.value))}
                style={{ width: '100%', height: '6px', background: 'var(--bg3)', borderRadius: '4px', cursor: 'pointer' }}
              />
              <div className="text-muted" style={{ fontSize: '11px', marginTop: '6px' }}>
                Ambiguity margin check. Lower margins require more distinctive matching verification profiles.
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }} disabled={saving}>
              {saving ? 'Saving Criteria...' : 'Save Matching Criteria'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: Danger Zone */}
      {activeTab === 'danger' && (
        <div style={{ ...panelCardStyle, borderColor: 'var(--err)', borderStyle: 'solid', borderWidth: '1px' }}>
          <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--err)', marginBottom: '18px', borderBottom: '1px solid rgba(240,71,90,0.15)', paddingBottom: '10px' }}>
            🗑️ Destructive Flush Operations
          </div>
          <p className="text-muted" style={{ marginBottom: '24px', fontSize: '13px', lineHeight: 1.5 }}>
            Wipes the entire application database. This will clean out all cameras, enrolled persons, unknown profiles, sighting logs, alerts, and billing invoices. **This action is irreversible!**
          </p>
          <button
            type="button"
            className="btn"
            style={{ background: 'rgba(240,71,90,0.12)', color: 'var(--err)', border: '1px solid var(--err)', padding: '12px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}
            onClick={handleFlushDatabase}
            disabled={saving}
          >
            Flush Entire Application Database
          </button>
        </div>
      )}
    </div>
  );
};

export default Settings;
