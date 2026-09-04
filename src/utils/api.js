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

// ─── Tenant context (role / org_id / branch_ids from /login) ──────────────────
// org_id is null for a Super Admin (unrestricted); branch_ids is populated
// only for a Branch User. Persisted so it survives a page reload.
const ROLE_KEY = 'role';
const ORG_ID_KEY = 'org_id';
const BRANCH_IDS_KEY = 'branch_ids';

export function setAuthContext({ role, org_id, branch_ids } = {}) {
  if (role) localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(ORG_ID_KEY, org_id || '');
  localStorage.setItem(BRANCH_IDS_KEY, JSON.stringify(Array.isArray(branch_ids) ? branch_ids : []));
}

export function getAuthContext() {
  let branchIds = [];
  try { branchIds = JSON.parse(localStorage.getItem(BRANCH_IDS_KEY) || '[]'); } catch (e) { /* ignore */ }
  return {
    role: localStorage.getItem(ROLE_KEY) || '',
    orgId: localStorage.getItem(ORG_ID_KEY) || '',
    branchIds
  };
}

export function clearAuthContext() {
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(ORG_ID_KEY);
  localStorage.removeItem(BRANCH_IDS_KEY);
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
        ? (() => {
          const f = new FormData();
          Object.entries(body).forEach(([k, v]) => {
            if (Array.isArray(v)) v.forEach(item => f.append(k, item));
            else f.append(k, v);
          });
          return f;
        })()
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

// Many GET routes now require branch_id as a query param. Fail fast locally
// with the same error shape the server would give, instead of round-tripping.
const MISSING_BRANCH_ID_QUERY = { ok: false, status: 400, data: { response_code: 'CODE_MISSING_PARAMETERS', response_message: 'Missing parameter(s): branch_id' } };
const MISSING_ORG_ID_QUERY = { ok: false, status: 400, data: { response_code: 'CODE_MISSING_PARAMETERS', response_message: 'Missing parameter(s): org_id' } };

// ─── Dashboard Stats ─────────────────────────────────────────────────────────
export const fetchDashboardStats = (branchId) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  return apiGet(`${API}/detections/dashboard-stats?branch_id=${branchId}`);
};

export const fetchAnalytics = (branchId) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  return apiGet(`${API}/detections/analytics?branch_id=${branchId}`);
};

export const fetchDashboard = (branchId, recentLimit = 10, violationsLimit = 6, topLocationsLimit = 5) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  const params = new URLSearchParams({
    branch_id: branchId,
    recent_limit: recentLimit,
    violations_limit: violationsLimit,
    top_locations_limit: topLocationsLimit
  });
  return apiGet(`${API}/dashboard?${params}`);
};

// ─── Entry Log / Detections ───────────────────────────────────────────────────
export const fetchDetectionsPaginated = (branchId, page = 1, perPage = 20, filter = null) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  const params = new URLSearchParams({ branch_id: branchId, page, per_page: perPage });
  if (filter) params.append('filter', filter);
  return apiGet(`${API}/detections/sessions?${params}`);
};

export const fetchDetectionSessions = (branchId, page = 1, perPage = 20) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  const params = new URLSearchParams({ branch_id: branchId, page, per_page: perPage });
  return apiGet(`${API}/detections/sessions?${params}`);
};

// ─── Alerts ──────────────────────────────────────────────────────────────────
export const fetchAlerts = (branchId, page = 1, perPage = 20) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  const params = new URLSearchParams({ branch_id: branchId, page, per_page: perPage });
  return apiGet(`${API}/alerts/paginated?${params}`);
};

export const fetchAlertsLatest = (branchId, since = 0, limit = 20) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  return apiGet(`${API}/alerts/latest?branch_id=${branchId}&since=${since}&limit=${limit}`);
};

export const fetchAlertsBreakdown = (branchId) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  return apiGet(`${API}/alerts/breakdown?branch_id=${branchId}`);
};

export const fetchAlertsTopLocations = (branchId, limit) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  return apiGet(`${API}/alerts/top-locations?branch_id=${branchId}${limit ? `&limit=${limit}` : ''}`);
};

// ─── Persons ─────────────────────────────────────────────────────────────────
export const fetchPersons = (branchId, filters = {}) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  const params = new URLSearchParams({ ...filters, branch_id: branchId });
  return apiGet(`${API}/persons/read?${params}`);
};

// GET /persons/read only supports name / role / enrollment_id filters — there is
// no server-side id lookup, so callers fetch the full list and find client-side.
export const fetchPerson = (branchId) => fetchPersons(branchId);

export const createPerson = (body) =>
  apiPost(API + '/persons/create', body);

export const updatePerson = (body) =>
  apiPut(API + '/persons/update', body);

export const suspendPerson = (id) =>
  apiPost(API + '/persons/suspend', { id });

export const fetchPersonsExpiringSoon = (branchId, days = 7) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  return apiGet(`${API}/persons/expiring-soon?branch_id=${branchId}&days=${days}`);
};

export const fetchPersonsRoleCounts = (branchId) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  return apiGet(`${API}/persons/role-counts?branch_id=${branchId}`);
};

export const fetchPersonsExcluded = () =>
  apiGet(API + '/persons/excluded');

// ─── Unknown Persons ─────────────────────────────────────────────────────────
export const fetchUnknowns = (branchId, page = 1, perPage = 24) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  const params = new URLSearchParams({ branch_id: branchId, page, per_page: perPage });
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
export const fetchCameras = (branchId) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  return apiGet(`${API}/cameras/list?branch_id=${branchId}`);
};

export const createCamera = (body) =>
  apiPost(API + '/cameras/create', body);

export const updateCamera = (body) =>
  apiPut(API + '/cameras/update', body);

export const suspendCamera = (id) =>
  apiPost(API + '/cameras/suspend', { _id: id });

export const setCameraRoi = (id, roi) =>
  apiPost(`${API}/cameras/${id}/roi`, { roi });

// ─── Billing / Invoices ───────────────────────────────────────────────────────
export const fetchInvoices = (branchId, status = '') => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  const params = new URLSearchParams({ branch_id: branchId });
  if (status) params.append('status', status);
  return apiGet(`${API}/invoices/read?${params}`);
};

export const computeBilling = (year = '', monthNum = '', branchId = '') => {
  const params = {};
  if (year) params.year = year;
  if (monthNum) params.month_num = monthNum;
  if (branchId) params.branch_id = branchId;
  const q = new URLSearchParams(params).toString();
  return apiGet(`${API}/invoices/compute${q ? `?${q}` : ''}`);
};

export const generateInvoice = (year, monthNum, branchId = '') =>
  apiPost(API + '/invoices/generate', { year, month_num: monthNum, ...(branchId && { branch_id: branchId }) });

export const markInvoicePaid = (monthId) =>
  apiPost(`${API}/invoices/${monthId}/mark-paid`);

export const markInvoiceUnpaid = (monthId) =>
  apiPost(`${API}/invoices/${monthId}/mark-unpaid`);

export const backfillInvoices = (branchId = '') =>
  apiPost(API + '/invoices/ensure-past-months', branchId ? { branch_id: branchId } : {});

// ─── Settings ─────────────────────────────────────────────────────────────────
export const fetchSettings = (branchId) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  return apiGet(`${API}/settings?branch_id=${branchId}`);
};

export const fetchRecognitionOptions = (branchId) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  return apiGet(`${API}/settings/recognition-options?branch_id=${branchId}`);
};

export const saveSettings = (body, branchId) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  return apiPost(API + '/settings/save', { ...body, branch_id: branchId });
};

export const saveMatchSettings = (body, branchId) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  return apiPost(API + '/settings/save-match', { ...body, branch_id: branchId });
};

// Deliberately global — no branch_id, Super Admin only.
export const flushDatabase = () =>
  apiPost(API + '/settings/flush-database');



// ─── Reports ──────────────────────────────────────────────────────────────────
export const fetchReport = (branchId, params = {}) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  const q = new URLSearchParams({ ...params, branch_id: branchId });
  return apiGet(`${API}/reports?${q}`);
};

// ─── Console Log ─────────────────────────────────────────────────────────────
export const fetchConsoleTail = (pos = 0) =>
  apiGet(`/api/console-log/tail?pos=${pos}`);

export const clearConsoleLog = () =>
  apiPost('/console-log/clear');

// ─── Server Usage ─────────────────────────────────────────────────────────────
export const fetchServerUsage = (days = 30, branchId = '') =>
  apiGet(`${API}/server-usage?days=${days}${branchId ? `&branch_id=${branchId}` : ''}`);

// ─── Users ──────────────────────────────────────────────────────────────────
export const fetchUsers = () =>
  apiGet(API + '/users/read');

export const createUser = (body) =>
  apiPost(API + '/users/create', body);

export const updateUser = (body) =>
  apiPut(API + '/users/update', body);

export const suspendUser = (id) =>
  apiPost(API + '/users/suspend', { id });

// ─── Organizations ────────────────────────────────────────────────────────────
export const fetchOrganizations = () =>
  apiGet(API + '/organizations/read');

export const createOrganization = (body) =>
  apiPost(API + '/organizations/create', body);

export const updateOrganization = (body) =>
  apiPut(API + '/organizations/update', body);

export const suspendOrganization = (id) =>
  apiPost(API + '/organizations/suspend', { id });

// ─── Branches ─────────────────────────────────────────────────────────────────
export const fetchBranches = (orgId) => {
  if (!orgId) return Promise.resolve(MISSING_ORG_ID_QUERY);
  return apiGet(`${API}/branches/read?org_id=${orgId}`);
};

export const createBranch = (body) =>
  apiPost(API + '/branches/create', body);

export const updateBranch = (body) =>
  apiPut(API + '/branches/update', body);

export const suspendBranch = (id) =>
  apiPost(API + '/branches/suspend', { id });

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

// branch_id is now required by the backend — fail fast locally with the same
// error shape the server would return, instead of round-tripping for a 4000.
const MISSING_BRANCH_ID = { ok: false, status: 400, data: { response_code: 4000, response_message: 'Missing parameter(s): branch_id' } };

// ─── Dataset (Known Persons) ──────────────────────────────────────────────────
// folder is no longer accepted — the backend auto-resolves it from that
// branch's own Settings (camera_dataset_dir).
export const fetchDatasetImages = (branchId) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  return apiGet(`${API}/dataset/images?branch_id=${branchId}`);
};

export const deleteDatasetImage = (path, branchId) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID);
  return apiPost(API + '/dataset/delete-local-image', { path, branch_id: branchId });
};

export const deleteDatasetPerson = (name, branchId) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID);
  return apiPost(API + '/dataset/delete-person', { name, branch_id: branchId });
};

export const deleteDatasetAll = (branchId) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID);
  return apiPost(API + '/dataset/delete-local', { branch_id: branchId });
};

export const trainDataset = (branchId = '') => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID);
  return apiPost(API + '/dataset/train', { branch_id: branchId });
};

export const syncTrainDataset = (branchId = '') => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID);
  return apiPost(API + '/dataset/sync-train', { branch_id: branchId });
};

// Multipart upload — search the server face collection. images and branch_id
// are both required by the backend now; it checks images first, so mirror
// that order locally rather than guessing which error the server would give.
export const datasetRecognize = (files, branchId = '') => {
  if (!files || files.length === 0) {
    return Promise.resolve({ ok: false, status: 400, data: { response_message: 'Please select at least one image.' } });
  }
  if (!branchId) {
    return Promise.resolve({ ok: false, status: 400, data: { response_message: "'branch_id' is required." } });
  }
  return apiPost(API + '/dataset/recognize', { images: files, branch_id: branchId }, true);
};

export const fetchDatasetServerCollections = (branchId) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  return apiGet(`${API}/dataset/server/collections?branch_id=${branchId}`);
};

export const fetchDatasetServerFaces = (branchId, collectionId = '') => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  const params = new URLSearchParams({ branch_id: branchId });
  if (collectionId) params.append('collection_id', collectionId);
  return apiGet(`${API}/dataset/server/faces?${params}`);
};

export const deleteDatasetServerCollection = (branchId, collectionId = '') => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID);
  return apiPost(API + '/dataset/server/delete-collection', { branch_id: branchId, ...(collectionId && { collection_id: collectionId }) });
};

export const deleteDatasetServerCollections = (branchId, collectionIds = []) => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID);
  return apiPost(API + '/dataset/server/delete-collections', { branch_id: branchId, collection_ids: collectionIds });
};

export const deleteDatasetServerFace = (branchId, faceId, collectionId = '') => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID);
  return apiPost(API + '/dataset/server/delete-face', { branch_id: branchId, face_id: faceId, ...(collectionId && { collection_id: collectionId }) });
};

export const deleteDatasetServerFaces = (branchId, faceIds = [], collectionId = '') => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID);
  return apiPost(API + '/dataset/server/delete-faces', { branch_id: branchId, face_ids: faceIds, ...(collectionId && { collection_id: collectionId }) });
};

export const fetchDuplicatesPendingCount = (branchId, folder = '') => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  const params = new URLSearchParams({ branch_id: branchId });
  if (folder) params.append('folder', folder);
  return apiGet(`${API}/duplicate-reviews/pending/count?${params}`);
};

export const fetchDuplicatesPending = (branchId, folder = '') => {
  if (!branchId) return Promise.resolve(MISSING_BRANCH_ID_QUERY);
  const params = new URLSearchParams({ branch_id: branchId });
  if (folder) params.append('folder', folder);
  return apiGet(`${API}/duplicate-reviews/pending?${params}`);
};

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
