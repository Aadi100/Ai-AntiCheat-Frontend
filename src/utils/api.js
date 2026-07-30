/**
 * Centralized API service layer.
 * Auth is JWT-based: every request uses Authorization: Bearer <access_token>.
 * On a 401, the access token is silently refreshed once via the refresh
 * token and the original request is retried before giving up.
 * Vite dev proxy forwards /api/* -> http://localhost:5050
 */

const BASE = '';

// Single source of truth for the API version — bump this in one place to
// re-point every endpoint below (e.g. 'v1' -> 'v2').
const API_VERSION = 'v1';
const API = `/api/${API_VERSION}`;
export const API_BASE = API;

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refresh_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || '';
}

/** Persist the access/refresh token pair returned by /login or /refresh. */
export function setTokens({ access_token, refresh_token } = {}) {
  if (access_token) localStorage.setItem(TOKEN_KEY, access_token);
  if (refresh_token) localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
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

// De-duped in-flight refresh — concurrent 401s share one /refresh call.
let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = fetch(BASE + API + '/refresh', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${refreshToken}` }
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json().catch(() => null);
        const newAccessToken = data?.response_data?.access_token;
        if (!newAccessToken) return false;
        setTokens({ access_token: newAccessToken });
        return true;
      })
      .catch(() => false)
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function parseResponse(res) {
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
}

// Endpoints that must never trigger a refresh-and-retry (avoids loops).
const NO_REFRESH_PATHS = [API + '/login', API + '/refresh'];

async function doFetch(method, path, { body, isForm, isRetry } = {}) {
  try {
    const headers = isForm
      ? { 'Authorization': `Bearer ${getToken()}` }
      : authHeaders();
    const fetchOpts = { method, headers };
    if (body !== undefined) {
      fetchOpts.body = isForm
        ? (() => { const f = new FormData(); Object.entries(body).forEach(([k, v]) => f.append(k, v)); return f; })()
        : JSON.stringify(body);
    }

    const res = await fetch(BASE + path, fetchOpts);

    if (res.status === 401 && !isRetry && !NO_REFRESH_PATHS.includes(path)) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return doFetch(method, path, { body, isForm, isRetry: true });
      }
    }

    return parseResponse(res);
  } catch (err) {
    return { ok: false, status: 0, data: { response_message: err.message } };
  }
}

async function apiGet(path) {
  return doFetch('GET', path);
}

async function apiPost(path, body = {}, isForm = false) {
  return doFetch('POST', path, { body, isForm });
}

async function apiPut(path, body = {}) {
  return doFetch('PUT', path, { body });
}

async function apiDelete(path) {
  return doFetch('DELETE', path);
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authLogin = (username, password) =>
  apiPost(API + '/login', { username, password });

// Uses the refresh token (not the access token) as the bearer credential.
export const authRefresh = async () => {
  const refreshToken = getRefreshToken();
  try {
    const res = await fetch(BASE + API + '/refresh', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${refreshToken}` }
    });
    return parseResponse(res);
  } catch (err) {
    return { ok: false, status: 0, data: { response_message: err.message } };
  }
};

export const authLogout = () =>
  apiPost(API + '/logout');

// ─── Dashboard Stats ─────────────────────────────────────────────────────────
export const fetchDashboardStats = () =>
  apiGet(API + '/detections/dashboard-stats');

export const fetchAnalytics = () =>
  apiGet(API + '/detections/analytics');

export const fetchDashboard = (recentLimit = 10, violationsLimit = 6, topLocationsLimit = 5) => {
  const params = new URLSearchParams({
    recent_limit: recentLimit,
    violations_limit: violationsLimit,
    top_locations_limit: topLocationsLimit
  });
  return apiGet(`${API}/dashboard?${params}`);
};

// ─── Entry Log / Detections ───────────────────────────────────────────────────
export const fetchDetectionsPaginated = (page = 1, perPage = 20, filter = null) => {
  const params = new URLSearchParams({ page, per_page: perPage });
  if (filter) params.append('filter', filter);
  return apiGet(`${API}/detections/sessions?${params}`);
};

export const fetchDetectionSessions = (page = 1, perPage = 20) => {
  const params = new URLSearchParams({ page, per_page: perPage });
  return apiGet(`${API}/detections/sessions?${params}`);
};

// ─── Alerts ──────────────────────────────────────────────────────────────────
export const fetchAlerts = (page = 1, perPage = 20) => {
  const params = new URLSearchParams({ page, per_page: perPage });
  return apiGet(`${API}/alerts/paginated?${params}`);
};

export const fetchAlertsLatest = (since = 0, limit = 20) =>
  apiGet(`${API}/alerts/latest?since=${since}&limit=${limit}`);

export const fetchAlertsBreakdown = () =>
  apiGet(API + '/alerts/breakdown');

export const fetchAlertsTopLocations = () =>
  apiGet(API + '/alerts/top-locations');

// ─── Persons ─────────────────────────────────────────────────────────────────
export const fetchPersons = (filters = {}) => {
  const params = new URLSearchParams(filters);
  return apiGet(`${API}/persons/read?${params}`);
};

// GET /persons/read only supports name / role / enrollment_id filters — there is
// no server-side id lookup, so callers fetch the full list and find client-side.
export const fetchPerson = () =>
  apiGet(API + '/persons/read');

export const createPerson = (body) =>
  apiPost(API + '/persons/create', body);

export const updatePerson = (body) =>
  apiPut(API + '/persons/update', body);

export const suspendPerson = (id) =>
  apiPost(API + '/persons/suspend', { id });

export const fetchPersonsExpiringSoon = (days = 7) =>
  apiGet(`${API}/persons/expiring-soon?days=${days}`);

export const fetchPersonsRoleCounts = () =>
  apiGet(API + '/persons/role-counts');

export const fetchPersonsExcluded = () =>
  apiGet(API + '/persons/excluded');

// ─── Unknown Persons ─────────────────────────────────────────────────────────
export const fetchUnknowns = (page = 1, perPage = 24) => {
  const params = new URLSearchParams({ page, per_page: perPage });
  return apiGet(`${API}/unknowns/paginated?${params}`);
};

export const fetchUnknown = (seq) =>
  apiGet(`${API}/unknowns/by-seq/${seq}`);

export const fetchUnknownPhotos = (seq) =>
  apiGet(`${API}/unknowns/by-seq/${seq}/photos`);

export const deleteUnknown = (seq) =>
  apiDelete(`${API}/unknowns/by-seq/${seq}`);

export const createUnknown = (body) =>
  apiPost(API + '/unknowns/create', body);

export const updateUnknown = (body) =>
  apiPut(API + '/unknowns/update', body);

export const suspendUnknown = (id) =>
  apiPost(API + '/unknowns/suspend', { _id: id });

export const processUnknownSighting = (body) =>
  apiPost(API + '/unknowns/process-sighting', body);

// ─── Cameras ─────────────────────────────────────────────────────────────────
export const fetchCameras = () =>
  apiGet(API + '/cameras/list');

export const createCamera = (body) =>
  apiPost(API + '/cameras/create', body);

export const updateCamera = (body) =>
  apiPut(API + '/cameras/update', body);

export const suspendCamera = (id) =>
  apiPost(API + '/cameras/suspend', { id });

export const setCameraRoi = (id, roi) =>
  apiPost(`${API}/cameras/${id}/roi`, { roi });

export const startCamera = (cameraId) =>
  apiPost(`${API}/cameras/${cameraId}/start`);

export const stopCamera = (cameraId) =>
  apiPost(`${API}/cameras/${cameraId}/stop`);

// ─── Grab / Detection Pipeline ───────────────────────────────────────────────
export const grabCamera = (cameraId) =>
  apiPost(`${API}/grabs/${cameraId}/grab`);

export const captureCamera = (cameraId) =>
  apiPost(`${API}/grabs/${cameraId}/capture`);

export const grabStatus = (cameraId) =>
  apiGet(`${API}/grabs/${cameraId}/status`);

// ─── Billing / Invoices ───────────────────────────────────────────────────────
export const fetchInvoices = (status = '') => {
  const q = status ? `?status=${status}` : '';
  return apiGet(`${API}/invoices/read${q}`);
};

export const computeBilling = (year = '', monthNum = '') => {
  const params = {};
  if (year) params.year = year;
  if (monthNum) params.month_num = monthNum;
  const q = new URLSearchParams(params).toString();
  return apiGet(`${API}/invoices/compute${q ? `?${q}` : ''}`);
};

export const generateInvoice = (year, monthNum) =>
  apiPost(API + '/invoices/generate', { year, month_num: monthNum });

export const markInvoicePaid = (monthId) =>
  apiPost(`${API}/invoices/${monthId}/mark-paid`);

export const markInvoiceUnpaid = (monthId) =>
  apiPost(`${API}/invoices/${monthId}/mark-unpaid`);

export const backfillInvoices = () =>
  apiPost(API + '/invoices/ensure-past-months');

// ─── Settings ─────────────────────────────────────────────────────────────────
export const fetchSettings = () =>
  apiGet(API + '/settings');

export const fetchRecognitionOptions = () =>
  apiGet(API + '/settings/recognition-options');

export const saveSettings = (body) =>
  apiPost(API + '/settings/save', body);

export const saveMatchSettings = (body) =>
  apiPost(API + '/settings/save-match', body);

export const flushDatabase = () =>
  apiPost(API + '/settings/flush-database');



// ─── Reports ──────────────────────────────────────────────────────────────────
export const fetchReport = (params = {}) => {
  const q = new URLSearchParams(params);
  return apiGet(`${API}/reports?${q}`);
};

// ─── Console Log ─────────────────────────────────────────────────────────────
export const fetchConsoleTail = (pos = 0) =>
  apiGet(`/api/console-log/tail?pos=${pos}`);

export const clearConsoleLog = () =>
  apiPost('/console-log/clear');

// ─── Server Usage ─────────────────────────────────────────────────────────────
export const fetchServerUsage = (days = 30) =>
  apiGet(`${API}/server-usage?days=${days}`);

// ─── Recognize Images ──────────────────────────────────────────────────────────
export const recognizeImages = (payload) =>
  apiPost(API + '/detections/recognize-images', payload);

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
  return apiGet(`${API}/dataset/images${q}`);
};

export const deleteDatasetImage = (path, folder = '') =>
  apiPost(API + '/dataset/delete-image', { path, ...(folder && { folder }) });

export const deleteDatasetPerson = (name, folder = '') =>
  apiPost(API + '/dataset/delete-person', { name, ...(folder && { folder }) });

export const deleteDatasetAll = (folder = '') =>
  apiPost(API + '/dataset/delete-all', folder ? { folder } : {});

export const trainDataset = (folder = '') =>
  apiPost(API + '/dataset/train', folder ? { folder } : {});

export const syncTrainDataset = (folder = '') =>
  apiPost(API + '/dataset/sync-train', folder ? { folder } : {});

export const fetchDatasetServerCollections = () =>
  apiGet(API + '/dataset/server/collections');

export const fetchDatasetServerFaces = (collectionId = '') => {
  const q = collectionId ? `?collection_id=${encodeURIComponent(collectionId)}` : '';
  return apiGet(`${API}/dataset/server/faces${q}`);
};

export const deleteDatasetServerCollection = (collectionId = '') =>
  apiPost(API + '/dataset/server/delete-collection', collectionId ? { collection_id: collectionId } : {});

export const deleteDatasetServerFace = (faceId, collectionId = '') =>
  apiPost(API + '/dataset/server/delete-face', { face_id: faceId, ...(collectionId && { collection_id: collectionId }) });

export const fetchDuplicatesPendingCount = (folder = '') =>
  apiGet(`${API}/duplicate-reviews/pending/count?folder=${encodeURIComponent(folder)}`);

export const fetchDuplicatesPending = (folder = '') =>
  apiGet(`${API}/duplicate-reviews/pending?folder=${encodeURIComponent(folder)}`);

export const resolveDuplicateReview = (reviewId, resolution = 'ignored') =>
  apiPost(`${API}/duplicate-reviews/${reviewId}/resolve`, { resolution });

// ─── Unknown Dataset ──────────────────────────────────────────────────────────
export const fetchUnknownDatasetImages = () =>
  apiGet(API + '/unknowns/dataset/images');

export const deleteUnknownDatasetImage = (path) =>
  apiPost(API + '/unknowns/dataset/delete-image', { path });

export const trainUnknownDataset = () =>
  apiPost(API + '/unknowns/dataset/train');

export const deleteAllUnknownDataset = () =>
  apiPost(API + '/unknowns/dataset/delete-all');

export const fetchUnknownServerFaces = () =>
  apiGet(API + '/unknowns/dataset/server/faces');

export const deleteUnknownServerFace = (faceId) =>
  apiPost(API + '/unknowns/dataset/server/delete-face', { face_id: faceId });

export const deleteUnknownServerFaces = (faceIds) =>
  apiPost(API + '/unknowns/dataset/server/delete-faces', { face_ids: faceIds });
