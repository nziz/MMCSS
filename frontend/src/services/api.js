// api.js — Clean API service layer using the centralized config
import { apiClient } from './apiConfig';

// ── Auth ──────────────────────────────────────────────────────────────
export const loginUser = async (username, password) => {
    const response = await apiClient.post('/auth/otp/request/', { username, password });
    return response.data;
};

export const refreshToken = async (refresh) => {
    const response = await apiClient.post('/auth/refresh/', { refresh });
    return response.data;
};

// ── Institutions ──────────────────────────────────────────────────────
export const getInstitutions = async () => {
    const response = await apiClient.get('/institutions/');
    return response;
};

// ── Applicant (Public Auth) ──────────────────────────────────────────
export const registerApplicant = async (formData) => {
    const response = await apiClient.post('/auth/register/', formData);
    return response;
};

export const verifyApplicantOtp = async (username, otpCode) => {
    const response = await apiClient.post('/auth/otp/verify/', { username, otp_code: otpCode });
    return response;
};

export const resendOtpToken = async (username) => {
    const response = await apiClient.post('/auth/otp/resend/', { username });
    return response;
};

export const resendOtp = async (username) => {
    const response = await apiClient.post('/auth/otp/resend/', { username });
    return response;
};

// ── Dashboard ─────────────────────────────────────────────────────────
export const getDashboardStats = async () => {
    const response = await apiClient.get('/scores/analytics/');
    return response;
};

export const getScores = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await apiClient.get(`/scores/history/?${query}`);
    return response;
};

export const getScoreDetail = async (id) => {
    const response = await apiClient.get(`/scores/${id}/`);
    return response;
};

// ── Scoring ───────────────────────────────────────────────────────────
export const scoreIndividual = async (formData) => {
    const response = await apiClient.post('/score/individual/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response;
};

export const scoreBatch = async (formData) => {
    const response = await apiClient.post('/score/batch/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response;
};

// ── Admin ───────────────────────────────────────────────────────────
export const getRules = async () => {
    const response = await apiClient.get('/rules/');
    return response;
};

export const updateRule = async (id, data) => {
    const response = await apiClient.put(`/rules/${id}/`, data);
    return response;
};

export const getUsers = async () => {
    const response = await apiClient.get('/users/');
    return response;
};

export const createUser = async (data) => {
    const response = await apiClient.post('/users/', data);
    return response;
};

export const updateUser = async (id, data) => {
    const response = await apiClient.patch(`/users/${id}/`, data);
    return response;
};

export const deleteUser = async (id) => {
    const response = await apiClient.delete(`/users/${id}/`);
    return response;
};

// ── Applicant Portal ─────────────────────────────────────────────────
export const getApplicantPortal = async () => {
    const response = await apiClient.get('/applicant/portal/');
    return response;
};

export const uploadApplicantFile = async (formData) => {
    const response = await apiClient.post('/applicant/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response;
};

export const updateApplicantProfile = async (data) => {
    const response = await apiClient.put('/applicant/profile/', data);
    return response;
};

// ── Applicant Lookup ──────────────────────────────────────────────────
export const getApplicantByRef = async (ref) => {
    const response = await apiClient.get(`/applicants/${ref}/`);
    return response;
};