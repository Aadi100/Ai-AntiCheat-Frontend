/**
 * Centralized API service layer.
 * All requests use the Authorization: Bearer <token> header.
 * Vite dev proxy forwards /api/* -> http://localhost:5050
 */

const BASE = '';

function getToken() {
  return localStorage.getItem('token') || '';
}

function authHeaders(extra = {}) {
  return {
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

/** Strip HTML tags and collapse whitespace from a server error string. */
function stripHtml(str) {
  return str
    .replace(/<[^>]*>/g, ' ')   // remove tags
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 300);          // cap at 300 chars
}


async function apiGet(path) {
  try {
    const res = await fetch(BASE + path, {
      method: 'GET',
      headers: authHeaders(),
    });
    const contentType = res.headers.get('content-type') || '';
    let data = null;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      const clean = text.trim().startsWith('<') ? stripHtml(text) : (text || res.statusText);
      data = { response_message: clean };
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { response_message: err.message } };
  }
}

async function apiPost(path, body = {}, isForm = false) {
  try {
    const headers = isForm
      ? { 'Authorization': `Bearer ${getToken()}` }
      : authHeaders();
    const bodyPayload = isForm
      ? (() => { const f = new FormData(); Object.entries(body).forEach(([k, v]) => f.append(k, v)); return f; })()
      : JSON.stringify(body);
    const res = await fetch(BASE + path, { method: 'POST', headers, body: bodyPayload });
    const contentType = res.headers.get('content-type') || '';
    let data = null;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      data = { response_message: text || res.statusText };
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { response_message: err.message } };
  }
}

async function apiPut(path, body = {}) {
  try {
    const res = await fetch(BASE + path, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(body)
    });
    const contentType = res.headers.get('content-type') || '';
    let data = null;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      data = { response_message: text || res.statusText };
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { response_message: err.message } };
  }
}

async function apiDelete(path) {
  try {
    const res = await fetch(BASE + path, {
      method: 'DELETE',
      headers: authHeaders()
    });
    const contentType = res.headers.get('content-type') || '';
    let data = null;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      data = { response_message: text || res.statusText };
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { response_message: err.message } };
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authLogin = (username, password) =>
  apiPost('/api/v1/admin/login', { username, password });

export const authLogout = () =>
  apiPost('/api/v1/admin/logout');

// ─── Dashboard Stats ─────────────────────────────────────────────────────────
export const fetchDashboardStats = () =>
  apiGet('/api/v1/admin/detections/dashboard-stats');

export const fetchAnalytics = () =>
  apiGet('/api/v1/admin/detections/analytics');

export const fetchDashboard = (recentLimit = 10, violationsLimit = 6, topLocationsLimit = 5) => {
  const params = new URLSearchParams({
    recent_limit: recentLimit,
    violations_limit: violationsLimit,
    top_locations_limit: topLocationsLimit
  });
  return apiGet(`/api/v1/admin/dashboard?${params}`);
};

// ─── Entry Log / Detections ───────────────────────────────────────────────────
export const fetchDetectionsPaginated = (page = 1, perPage = 20, filter = null) => {
  const params = new URLSearchParams({ page, per_page: perPage });
  if (filter) params.append('filter', filter);
  return apiGet(`/api/v1/admin/detections/sessions?${params}`);
};

export const fetchDetectionSessions = (page = 1, perPage = 20) => {
  const params = new URLSearchParams({ page, per_page: perPage });
  return apiGet(`/api/v1/admin/detections/sessions?${params}`);
};

// ─── Alerts ──────────────────────────────────────────────────────────────────
export const fetchAlerts = (page = 1, perPage = 20) => {
  const params = new URLSearchParams({ page, per_page: perPage });
  return apiGet(`/api/v1/admin/alerts/paginated?${params}`);
};

export const fetchAlertsLatest = (since = 0, limit = 20) =>
  apiGet(`/api/v1/admin/alerts/latest?since=${since}&limit=${limit}`);

export const fetchAlertsBreakdown = () =>
  apiGet('/api/v1/admin/alerts/breakdown');

export const fetchAlertsTopLocations = () =>
  apiGet('/api/v1/admin/alerts/top-locations');

// ─── Persons ─────────────────────────────────────────────────────────────────
export const fetchPersons = (filters = {}) => {
  const params = new URLSearchParams(filters);
  return apiGet(`/api/v1/admin/persons/read?${params}`);
};

export const fetchPerson = (id) =>
  apiGet(`/api/v1/admin/persons/read?_id=${id}`);

export const createPerson = (body) =>
  apiPost('/api/v1/admin/persons/create', body);

export const updatePerson = (body) =>
  apiPut('/api/v1/admin/persons/update', body);

export const suspendPerson = (id) =>
  apiPost('/api/v1/admin/persons/suspend', { _id: id });

export const fetchPersonsExpiringSoon = (days = 7) =>
  apiGet(`/api/v1/admin/persons/expiring-soon?days=${days}`);

export const fetchPersonsRoleCounts = () =>
  apiGet('/api/v1/admin/persons/role-counts');

export const fetchPersonsExcluded = () =>
  apiGet('/api/v1/admin/persons/excluded');

// ─── Unknown Persons ─────────────────────────────────────────────────────────
export const fetchUnknowns = (page = 1, perPage = 24) => {
  const params = new URLSearchParams({ page, per_page: perPage });
  return apiGet(`/api/v1/admin/unknowns/paginated?${params}`);
};

export const fetchUnknown = (seq) =>
  apiGet(`/api/v1/admin/unknowns/by-seq/${seq}`);

export const fetchUnknownPhotos = (seq) =>
  apiGet(`/api/v1/admin/unknowns/by-seq/${seq}/photos`);

export const deleteUnknown = (seq) =>
  apiDelete(`/api/v1/admin/unknowns/by-seq/${seq}`);

export const createUnknown = (body) =>
  apiPost('/api/v1/admin/unknowns/create', body);

export const updateUnknown = (body) =>
  apiPut('/api/v1/admin/unknowns/update', body);

export const suspendUnknown = (id) =>
  apiPost('/api/v1/admin/unknowns/suspend', { _id: id });

export const processUnknownSighting = (body) =>
  apiPost('/api/v1/admin/unknowns/process-sighting', body);

// ─── Cameras ─────────────────────────────────────────────────────────────────
export const fetchCameras = () =>
  apiGet('/api/v1/admin/cameras/list');

export const createCamera = (body) =>
  apiPost('/api/v1/admin/cameras/create', body);

export const updateCamera = (body) =>
  apiPut('/api/v1/admin/cameras/update', body);

export const deleteCamera = (id) =>
  apiDelete(`/api/v1/admin/cameras/${id}`);

export const setCameraRoi = (id, roi) =>
  apiPost(`/api/v1/admin/cameras/${id}/roi`, { roi });

export const startCamera = (cameraId) =>
  apiPost(`/api/v1/admin/cameras/${cameraId}/start`);

export const stopCamera = (cameraId) =>
  apiPost(`/api/v1/admin/cameras/${cameraId}/stop`);

export const scanUsb = () =>
  apiGet('/api/v1/admin/cameras/scan-usb');

// ─── Grab / Detection Pipeline ───────────────────────────────────────────────
export const grabCamera = (cameraId) =>
  apiPost(`/api/v1/admin/grabs/${cameraId}/grab`);

export const captureCamera = (cameraId) =>
  apiPost(`/api/v1/admin/grabs/${cameraId}/capture`);

export const grabStatus = (cameraId) =>
  apiGet(`/api/v1/admin/grabs/${cameraId}/status`);

// ─── Billing / Invoices ───────────────────────────────────────────────────────
export const fetchInvoices = (status = '') => {
  const q = status ? `?status=${status}` : '';
  return apiGet(`/api/v1/admin/invoices/read${q}`);
};

export const computeBilling = (year = '', monthNum = '') => {
  const params = {};
  if (year) params.year = year;
  if (monthNum) params.month_num = monthNum;
  const q = new URLSearchParams(params).toString();
  return apiGet(`/api/v1/admin/invoices/compute${q ? `?${q}` : ''}`);
};

export const generateInvoice = (year, monthNum) =>
  apiPost('/api/v1/admin/invoices/generate', { year, month_num: monthNum });

export const markInvoicePaid = (monthId) =>
  apiPost(`/api/v1/admin/invoices/${monthId}/mark-paid`);

export const markInvoiceUnpaid = (monthId) =>
  apiPost(`/api/v1/admin/invoices/${monthId}/mark-unpaid`);

export const backfillInvoices = () =>
  apiPost('/api/v1/admin/invoices/ensure-past-months');

// ─── Settings ─────────────────────────────────────────────────────────────────
export const fetchSettings = () =>
  apiGet('/api/v1/admin/settings');

export const fetchRecognitionOptions = () =>
  apiGet('/api/v1/admin/settings/recognition-options');

export const saveSettings = (body) =>
  apiPost('/api/v1/admin/settings/save', body);

export const saveMatchSettings = (body) =>
  apiPost('/api/v1/admin/settings/save-match', body);

export const regenerateApiKey = () =>
  apiPost('/api/v1/admin/settings/regenerate-api-key');

export const flushDatabase = () =>
  apiPost('/api/v1/admin/settings/flush-database');



// ─── Reports ──────────────────────────────────────────────────────────────────
export const fetchReport = (params = {}) => {
  const q = new URLSearchParams(params);
  return apiGet(`/api/v1/admin/reports?${q}`);
};

// ─── Console Log ─────────────────────────────────────────────────────────────
export const fetchConsoleTail = (pos = 0) =>
  apiGet(`/api/console-log/tail?pos=${pos}`);

export const clearConsoleLog = () =>
  apiPost('/console-log/clear');

// ─── Server Usage ─────────────────────────────────────────────────────────────
export const fetchServerUsage = (days = 30) =>
  apiGet(`/api/v1/admin/server-usage?days=${days}`);

// ─── Recognize Images (new admin API) ────────────────────────────────────────
export const recognizeImages = (payload) =>
  apiPost('/api/v1/admin/detections/recognize-images', payload);

// ─── Image Path Normalizer ────────────────────────────────────────────────────
export const formatImagePath = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  let normalized = path.replace(/\\/g, '/');
  
  if (normalized.startsWith('/media/')) {
    return normalized;
  }
  
  const mediaIndex = normalized.indexOf('media/');
  if (mediaIndex !== -1) {
    return '/' + normalized.substring(mediaIndex);
  }
  
  if (normalized.startsWith('/')) {
    return '/media' + normalized;
  }
  
  return '/media/' + normalized;
};

// ─── Dataset (Known Persons) ──────────────────────────────────────────────────
export const fetchDatasetImages = (folder = '') => {
  const q = folder ? `?folder=${encodeURIComponent(folder)}` : '';
  return apiGet(`/api/v1/admin/dataset/images${q}`);
};

export const deleteDatasetImage = (path, folder = '') =>
  apiPost('/api/v1/admin/dataset/delete-image', { path, ...(folder && { folder }) });

export const deleteDatasetPerson = (name, folder = '') =>
  apiPost('/api/v1/admin/dataset/delete-person', { name, ...(folder && { folder }) });

export const deleteDatasetAll = (folder = '') =>
  apiPost('/api/v1/admin/dataset/delete-all', folder ? { folder } : {});

export const trainDataset = (folder = '') =>
  apiPost('/api/v1/admin/dataset/train', folder ? { folder } : {});

export const syncTrainDataset = (folder = '') =>
  apiPost('/api/v1/admin/dataset/sync-train', folder ? { folder } : {});

export const fetchDatasetServerCollections = () =>
  apiGet('/api/v1/admin/dataset/server/collections');

export const fetchDatasetServerFaces = (collectionId = '') => {
  const q = collectionId ? `?collection_id=${encodeURIComponent(collectionId)}` : '';
  return apiGet(`/api/v1/admin/dataset/server/faces${q}`);
};

export const deleteDatasetServerCollection = (collectionId = '') =>
  apiPost('/api/v1/admin/dataset/server/delete-collection', collectionId ? { collection_id: collectionId } : {});

export const deleteDatasetServerFace = (faceId, collectionId = '') =>
  apiPost('/api/v1/admin/dataset/server/delete-face', { face_id: faceId, ...(collectionId && { collection_id: collectionId }) });

export const fetchDuplicatesPendingCount = (folder = '') =>
  apiGet(`/api/v1/admin/duplicate-reviews/pending/count?folder=${encodeURIComponent(folder)}`);

export const fetchDuplicatesPending = (folder = '') =>
  apiGet(`/api/v1/admin/duplicate-reviews/pending?folder=${encodeURIComponent(folder)}`);

// ─── Unknown Dataset ──────────────────────────────────────────────────────────
export const fetchUnknownDatasetImages = () =>
  apiGet('/api/v1/admin/unknowns/dataset/images');

export const deleteUnknownDatasetImage = (path) =>
  apiPost('/api/v1/admin/unknowns/dataset/delete-image', { path });

export const trainUnknownDataset = () =>
  apiPost('/api/v1/admin/unknowns/dataset/train');

export const deleteAllUnknownDataset = () =>
  apiPost('/api/v1/admin/unknowns/dataset/delete-all');

export const fetchUnknownServerFaces = () =>
  apiGet('/api/v1/admin/unknowns/dataset/server/faces');

export const deleteUnknownServerFace = (faceId) =>
  apiPost('/api/v1/admin/unknowns/dataset/server/delete-face', { face_id: faceId });

export const deleteUnknownServerFaces = (faceIds) =>
  apiPost('/api/v1/admin/unknowns/dataset/server/delete-faces', { face_ids: faceIds });
