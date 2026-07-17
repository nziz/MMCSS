import axios from 'axios';

// apiConfig.js — Single source of truth for API configuration
// REACT_APP_API_URL should be the BASE URL only, e.g.:
//   Local:    http://127.0.0.1:8000
//   Railway:  https://mmcss-backend-production.up.railway.app
// The /api prefix is added automatically below.
const RAW_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

// Strip trailing slashes and /api if present to prevent double /api/
const CLEAN_URL = RAW_URL.replace(/\/+$/, '').replace(/\/api$/, '');

export const API_BASE = `${CLEAN_URL}/api`;

export const API_ENDPOINTS = {
    // Auth (staff login)
    LOGIN: `${API_BASE}/auth/login/`,
    REFRESH: `${API_BASE}/auth/refresh/`,
    PROFILE: `${API_BASE}/auth/profile/`,

    // Applicant auth (public registration)
    REGISTER: `${API_BASE}/auth/register/`,
    OTP_REQUEST: `${API_BASE}/auth/otp/request/`,
    OTP_VERIFY: `${API_BASE}/auth/otp/verify/`,
    OTP_RESEND: `${API_BASE}/auth/otp/resend/`,

    // Institutions
    INSTITUTIONS: `${API_BASE}/institutions/`,

    // Applicant (authenticated portal)
    APPLICANT_PORTAL: `${API_BASE}/applicant/portal/`,
    APPLICANT_UPLOAD: `${API_BASE}/applicant/upload/`,
    APPLICANT_PROFILE: `${API_BASE}/applicant/profile/`,
    APPLICANT_SCORES: `${API_BASE}/applicant/scores/`,

    // Scoring
    SCORE_INDIVIDUAL: `${API_BASE}/score/individual/`,
    SCORE_BATCH: `${API_BASE}/score/batch/`,

    // Scores / History
    SCORES: `${API_BASE}/scores/history/`,
    SCORE_DETAIL: (id) => `${API_BASE}/scores/${id}/`,
    SCORE_ANALYTICS: `${API_BASE}/scores/analytics/`,

    // Batches
    BATCHES: `${API_BASE}/batches/`,

    // Admin
    RULES: `${API_BASE}/rules/`,
    RULE_DETAIL: (id) => `${API_BASE}/rules/${id}/`,

    // Users
    USERS: `${API_BASE}/users/`,
    USER_DETAIL: (id) => `${API_BASE}/users/${id}/`,

    // Applicants lookup
    APPLICANT_LOOKUP: (ref) => `${API_BASE}/applicants/${ref}/`,
    APPLICANTS_LIST: `${API_BASE}/applicants/`,
};

// Axios instance with interceptors
export const apiClient = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor — handle 401 & queue requests during refresh
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
    refreshSubscribers.push(cb);
}

function onTokenRefreshed(newToken) {
    refreshSubscribers.forEach((cb) => cb(newToken));
    refreshSubscribers = [];
}

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve) => {
                    subscribeTokenRefresh((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        resolve(apiClient(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = localStorage.getItem('refresh_token');
                if (!refreshToken) throw new Error('No refresh token');

                const res = await axios.post(API_ENDPOINTS.REFRESH, {
                    refresh: refreshToken,
                });

                const newAccess = res.data.access;
                localStorage.setItem('access_token', newAccess);
                onTokenRefreshed(newAccess);
                originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                isRefreshing = false;
                return apiClient(originalRequest);
            } catch (refreshErr) {
                isRefreshing = false;
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
                return Promise.reject(refreshErr);
            }
        }

        return Promise.reject(error);
    }
);