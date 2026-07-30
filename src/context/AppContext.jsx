import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as mock from '../utils/mockData';
import * as apiSvc from '../utils/api';

export const QUICK_TEST_CAMERA_ID = '6a66fc33f08b0000ceda82f8';

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
          apiSvc.setTokens({ access_token: accessToken, refresh_token: refreshToken });
          setToken(accessToken);
          return { success: true };
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
    setToken('');
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

      const payload = {
        camera_id: QUICK_TEST_CAMERA_ID,
        process: 'server',
        images: capturedImages,
        dataset_folder: 'dataset',
        collection_id: null,
        log: true,
        return_details: true
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
