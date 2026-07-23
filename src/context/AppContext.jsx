import React, { createContext, useContext, useState, useEffect } from 'react';
import * as mock from '../utils/mockData';

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
      const response = await fetch('/api/v1/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (response.ok && data.response_code === 200) {
        const retrievedToken = data.response_data?.token || data.response_data || '';
        if (retrievedToken) {
          localStorage.setItem('token', retrievedToken);
          setToken(retrievedToken);
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
    localStorage.removeItem('token');
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
    external_api_key: 'fm-ak-889812988102a9b3c4f7',
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
        const response = await fetch('/api/v1/admin/invoices/compute', {
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

  // ─── Live Polling Simulation (Only when logged in) ────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;

    const interval = setInterval(() => {
      const type = Math.random() > 0.5 ? 'unknown_entry' : 'face_hidden';
      const triggerTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
      
      const newAlert = {
        type,
        crop_path: type === 'unknown_entry' ? 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&auto=format&fit=crop&q=60' : '',
        image_path: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=60',
        triggered_at: triggerTime,
        triggered_at_epoch: Math.floor(Date.now() / 1000),
        seen_with: type === 'unknown_entry' ? [{ name: 'Alex Jones' }] : [],
        detection_id: 'det_' + Math.random().toString(36).substring(2, 12),
        location: cameras[Math.floor(Math.random() * cameras.length)]?.location || 'Main Entrance',
        action: 'checkin'
      };

      // Add to alerts state
      setAlerts(prev => [newAlert, ...prev].slice(0, 20));

      // Pop toast
      addToast({
        type: newAlert.type,
        triggered_at: newAlert.triggered_at,
        seen_with: newAlert.seen_with,
        data: newAlert
      });

      // Add to console log
      setConsoleLogs(prev => [
        ...prev,
        `[Pipeline] Active Surveillance trigger: ${newAlert.type === 'unknown_entry' ? 'Unknown Entry' : 'Face Hidden'} detected at ${newAlert.location}`
      ]);

      // Update statistics
      setBillingSummary(prev => {
        const isSearch = Math.random() > 0.3;
        const addSearch = isSearch ? 1 : 0;
        const addTrain = !isSearch ? 1 : 0;
        const newSearchTotal = prev.search_total + addSearch;
        const newTrainTotal = prev.training_total + addTrain;
        const billableSearch = Math.max(0, newSearchTotal - prev.free_search_limit);
        const billableTrain = Math.max(0, newTrainTotal - prev.free_training_limit);
        const amountDue = billableSearch * prev.rate_search + billableTrain * prev.rate_training;
        
        return {
          ...prev,
          search_total: newSearchTotal,
          training_total: newTrainTotal,
          billable_search: billableSearch,
          billable_training: billableTrain,
          amount_due: amountDue
        };
      });

    }, 20000); // 20s poller for page activity

    return () => clearInterval(interval);
  }, [isLoggedIn, cameras]);

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
