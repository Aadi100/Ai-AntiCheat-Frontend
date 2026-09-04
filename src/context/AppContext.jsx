import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as mock from '../utils/mockData';
import * as apiSvc from '../utils/api';


const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // ─── Theme ────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // ─── Auth (REAL API backed) ────────────────────────────────────────────────
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const isLoggedIn = !!token;

  // Tenant context returned by /login — restored from storage on reload so a
  // refresh doesn't lose which org/branch(es) the current user is scoped to.
  const [authCtx, setAuthCtx] = useState(() => apiSvc.getAuthContext());
  const { role, orgId, branchIds } = authCtx;

  // ─── Org / Branch selection (drill-down: Super Admin picks an org, then a
  // branch; Org Admin picks a branch within their own org; Branch User is
  // auto-scoped to their one branch) — persisted so a reload keeps the pick.
  const [selectedOrgId, setSelectedOrgIdState] = useState(() => localStorage.getItem('selected_org_id') || '');
  const [selectedBranchId, setSelectedBranchIdState] = useState(() => localStorage.getItem('selected_branch_id') || '');

  const setSelectedOrgId = (id) => {
    localStorage.setItem('selected_org_id', id || '');
    setSelectedOrgIdState(id || '');
  };
  const setSelectedBranchId = (id) => {
    localStorage.setItem('selected_branch_id', id || '');
    setSelectedBranchIdState(id || '');
  };
  const clearSelection = () => {
    localStorage.removeItem('selected_org_id');
    localStorage.removeItem('selected_branch_id');
    setSelectedOrgIdState('');
    setSelectedBranchIdState('');
  };
  // Drop back to org selection (Super Admin) or branch selection (Org Admin)
  // — used by the "Switch Branch" control in the sidebar.
  const switchBranch = () => {
    setSelectedBranchId('');
    if (role === 'super_admin') setSelectedOrgId('');
  };

  // Forms/filters across the app default to this branch.
  const defaultBranchId = selectedBranchId;

  const login = async (username, password) => {
    try {
      const response = await fetch(`${apiSvc.API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (response.ok && data.response_code === 200) {
        const accessToken = data.response_data?.access_token || '';
        const refreshToken = data.response_data?.refresh_token || '';
        if (accessToken) {
          const newRole = data.response_data?.role;
          const newOrgId = data.response_data?.org_id;
          const newBranchIds = data.response_data?.branch_ids;

          apiSvc.setTokens({ access_token: accessToken, refresh_token: refreshToken });
          apiSvc.setAuthContext({ role: newRole, org_id: newOrgId, branch_ids: newBranchIds });
          setToken(accessToken);
          setAuthCtx(apiSvc.getAuthContext());

          // A Branch User is auto-scoped to their one branch; an Org Admin's
          // org is implied. A Super Admin picks both, starting from scratch.
          if (newRole === 'branch_user' && Array.isArray(newBranchIds) && newBranchIds.length === 1) {
            setSelectedOrgId(newOrgId || '');
            setSelectedBranchId(newBranchIds[0]);
          } else if (newRole === 'org_admin') {
            setSelectedOrgId(newOrgId || '');
            setSelectedBranchId('');
          } else {
            clearSelection();
          }

          return { success: true, role: newRole };
        }
      }
      return {
        success: false,
        message: data.response_message || 'Invalid username or password (database check failed)'
      };
    } catch (err) {
      return {
        success: false,
        message: 'Could not connect to the authentication server. Please verify the Flask backend is running.'
      };
    }
  };

  const logout = () => {
    // Clear local session immediately; revoke the token server-side best-effort
    // in the background so the UI doesn't wait on the network to sign out.
    apiSvc.authLogout().catch(() => {});
    apiSvc.clearTokens();
    apiSvc.clearAuthContext();
    setToken('');
    setAuthCtx({ role: '', orgId: '', branchIds: [] });
    clearSelection();
  };

  // ─── Modals State ─────────────────────────────────────────────────────────
  const [lightbox, setLightbox] = useState({ open: false, images: [], index: 0 });
  const [cardModal, setCardModal] = useState({ open: false, data: null });
  const [sessionModal, setSessionModal] = useState({ open: false, data: null });

  const openLightbox = (images, index = 0) => setLightbox({ open: true, images, index });
  const closeLightbox = () => setLightbox(prev => ({ ...prev, open: false }));
  const stepLightbox = (delta) => setLightbox(prev => {
    if (!prev.images.length) return prev;
    const nextIndex = (prev.index + delta + prev.images.length) % prev.images.length;
    return { ...prev, index: nextIndex };
  });

  const openCardModal = (data) => setCardModal({ open: true, data });
  const closeCardModal = () => setCardModal({ open: false, data: null });
  const openSessionModal = (data) => setSessionModal({ open: true, data });
  const closeSessionModal = () => setSessionModal({ open: false, data: null });

  // ─── Global Mock States (Restored for all features) ───────────────────────
  const [cameras, setCameras] = useState(mock.mockCameras);
  const [enrolledPersons, setEnrolledPersons] = useState(mock.mockPersons);
  const [unknownPersons, setUnknownPersons] = useState(mock.mockUnknowns);
  const [duplicatePairs, setDuplicatePairs] = useState(mock.mockDuplicateReviews);
  const [entryLogs, setEntryLogs] = useState(mock.mockEntryLogs);
  const [alerts, setAlerts] = useState(mock.mockViolations);
  const [invoices, setInvoices] = useState(mock.mockInvoices);
  const [consoleLogs, setConsoleLogs] = useState(mock.mockConsoleLogs);
  const [detections, setDetections] = useState(mock.mockDetections);
  const [billingSummary, setBillingSummary] = useState(mock.mockBillingSummary);

  const [settings, setSettings] = useState({
    auto_run_detection: true,
    multi_camera_stream: true,
    recognition_model: 'ArcFace',
    match_threshold: 68.0,
    match_margin: 12.0
  });

  // ─── Toasts State ─────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Math.random().toString(36).substring(2);
    setToasts(prev => [...prev, { id, ...toast }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 7000);
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  // ─── Background Quick Camera Test (Shift+P) ────────────────────────────────
  // Discovers a camera directly via the browser (no backend USB-scan call),
  // opens it off-screen, grabs a few frames, and posts them for recognition —
  // all without navigating away. The result is reported via toast.
  const quickTestRunningRef = useRef(false);

  const runBackgroundCameraDiagnostic = async () => {
    if (quickTestRunningRef.current) {
      addToast({ type: 'info', title: 'Quick Camera Test', message: 'A test is already running in the background.' });
      return;
    }
    quickTestRunningRef.current = true;

    let stream = null;
    let video = null;

    try {
      setConsoleLogs(prev => [...prev, '[Quick Test] Detecting cameras via the browser...']);
      if (!navigator.mediaDevices?.enumerateDevices) {
        addToast({ type: 'error', title: 'Quick Camera Test Failed', message: 'This browser does not support camera enumeration.' });
        return;
      }
      let devices = await navigator.mediaDevices.enumerateDevices();
      let cams = devices.filter(d => d.kind === 'videoinput');
      if (cams.length === 0) {
        addToast({ type: 'error', title: 'Quick Camera Test Failed', message: 'No cameras were detected on this device.' });
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: cams[0].deviceId ? { deviceId: { exact: cams[0].deviceId } } : true
        });
      } catch (mediaErr) {
        addToast({ type: 'error', title: 'Quick Camera Test Failed', message: `Could not access webcam: ${mediaErr.message}` });
        return;
      }

      // Labels are blank until permission is granted — re-enumerate now that
      // getUserMedia succeeded, so the console log can show a real name.
      devices = await navigator.mediaDevices.enumerateDevices();
      cams = devices.filter(d => d.kind === 'videoinput');
      const cameraLabel = cams[0]?.label || 'default camera';

      video = document.createElement('video');
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.style.position = 'fixed';
      video.style.left = '-9999px';
      video.style.width = '1px';
      video.style.height = '1px';
      document.body.appendChild(video);
      video.srcObject = stream;
      await video.play().catch(() => {});

      setConsoleLogs(prev => [...prev, `[Quick Test] Opened camera (${cameraLabel}). Grabbing frames...`]);

      // Let the feed render a real frame before capturing
      await new Promise(resolve => setTimeout(resolve, 700));

      const capturedImages = {};
      const frameCount = 5;
      for (let i = 0; i < frameCount; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        canvas.getContext('2d').drawImage(video, 0, 0, 640, 360);
        capturedImages[`img${i + 1}`] = canvas.toDataURL('image/jpeg', 0.85);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      stream.getTracks().forEach(track => track.stop());
      document.body.removeChild(video);
      stream = null;
      video = null;

      setConsoleLogs(prev => [...prev, '[Quick Test] Frames captured. Posting payload to recognize-images API...']);

      // Dynamically pick the first enrolled camera for this branch — same
      // order as the Camera ID dropdown in the Test Camera page.
      let firstCameraId = '';
      try {
        const camRes = await apiSvc.fetchCameras(defaultBranchId);
        if (camRes.ok && Array.isArray(camRes.data?.response_data) && camRes.data.response_data.length > 0) {
          firstCameraId = camRes.data.response_data[0]._id || camRes.data.response_data[0].id || '';
        }
      } catch (_) { /* ignore — send empty camera_id */ }

      const payload = {
        camera_id: firstCameraId,
        process: 'server',
        images: capturedImages,
        dataset_folder: 'dataset',
        collection_id: null,
        log: true,
        return_details: true
      };

      // Debug-friendly version — replaces raw base64 blobs with metadata only
      const debugPayload = {
        ...payload,
        images: Object.fromEntries(
          Object.entries(capturedImages).map(([k, v]) => [
            k,
            `[base64 JPEG ~${Math.round(v.length / 1024)}KB]`
          ])
        )
      };

      const res = await apiSvc.recognizeImages(payload);
      if (res.ok) {
        const summary = res.data?.response_data?.summary;
        addToast({
          type: 'success',
          title: 'Quick Camera Test Complete',
          message: summary
            ? `Detected ${summary.total_faces} face(s) — ${summary.matched} matched, ${summary.unmatched} unmatched.`
            : 'Recognition pipeline finished successfully.'
        });
        setConsoleLogs(prev => [...prev, `[Quick Test] Recognition successful. Total faces: ${summary?.total_faces ?? 0}`]);
      } else {
        addToast({ type: 'error', title: 'Quick Camera Test Failed', message: res.data?.response_message || 'Recognition pipeline returned an error.' });
        setConsoleLogs(prev => [...prev, `[Quick Test] Recognition pipeline error: ${res.data?.response_message}`]);
      }

      // Return debug info for the caller to display
      return { debugPayload, response: res.data, status: res.status, ok: res.ok };
    } catch (err) {
      addToast({ type: 'error', title: 'Quick Camera Test Failed', message: err.message });
    } finally {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (video && video.parentNode) video.parentNode.removeChild(video);
      quickTestRunningRef.current = false;
    }
  };

  // ─── Plan Banner State ────────────────────────────────────────────────────
  const [planBannerVisible, setPlanBannerVisible] = useState(() => {
    const dismissedMonth = localStorage.getItem('plan_banner_dismissed_month');
    return dismissedMonth !== mock.mockBillingSummary.month;
  });

  const dismissPlanBanner = () => {
    localStorage.setItem('plan_banner_dismissed_month', billingSummary.month);
    setPlanBannerVisible(false);
  };

  // ─── Fetch live billing summary on login ──────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;

    const loadBillingSummary = async () => {
      try {
        const response = await fetch(`${apiSvc.API_BASE}/invoices/compute`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const resJson = await response.json();
          if (resJson.response_data) {
            setBillingSummary(resJson.response_data);
            
            // Sync banner visibility
            const dismissedMonth = localStorage.getItem('plan_banner_dismissed_month');
            setPlanBannerVisible(dismissedMonth !== resJson.response_data.month);
          }
        }
      } catch (err) {
        // Keep mock/default values
      }
    };

    loadBillingSummary();
  }, [isLoggedIn, token]);

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        isLoggedIn,
        token,
        role,
        orgId,
        branchIds,
        defaultBranchId,
        selectedOrgId,
        selectedBranchId,
        setSelectedOrgId,
        setSelectedBranchId,
        clearSelection,
        switchBranch,
        login,
        logout,
        lightbox,
        openLightbox,
        closeLightbox,
        stepLightbox,
        cardModal,
        openCardModal,
        closeCardModal,
        sessionModal,
        openSessionModal,
        closeSessionModal,
        cameras,
        setCameras,
        enrolledPersons,
        setEnrolledPersons,
        unknownPersons,
        setUnknownPersons,
        duplicatePairs,
        setDuplicatePairs,
        entryLogs,
        setEntryLogs,
        alerts,
        setAlerts,
        billingSummary,
        setBillingSummary,
        invoices,
        setInvoices,
        consoleLogs,
        setConsoleLogs,
        settings,
        setSettings,
        toasts,
        addToast,
        removeToast,
        runBackgroundCameraDiagnostic,
        planBannerVisible,
        dismissPlanBanner,
        detections,
        setDetections
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
