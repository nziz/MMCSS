import React, { useState, useEffect, useCallback } from 'react';
import { getApplicantPortal, uploadApplicantFile, updateApplicantProfile } from '../services/api';

const getTierColor = (tier) => ({
    excellent: '#1b5e20', good: '#2e7d32',
    fair: '#f57f17', poor: '#e65100', very_poor: '#b71c1c',
}[tier] || '#666');

const getTierBg = (tier) => ({
    excellent: '#e8f5e9', good: '#f1f8e9',
    fair: '#fff8e1', poor: '#fff3e0', very_poor: '#ffebee',
}[tier] || '#f5f5f5');

export default function ApplicantPortal({ user, onLogout, addToast }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState('dashboard');
    const [uploading, setUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState('');
    const [file, setFile] = useState(null);
    const [accountAge, setAccountAge] = useState(12);
    const [profileForm, setProfileForm] = useState({});
    const [profileMsg, setProfileMsg] = useState('');

    const fetchPortalData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getApplicantPortal();
            setData(res.data);
            setProfileForm({
                first_name: user?.first_name || '',
                last_name: user?.last_name || '',
                email: user?.email || '',
                phone_number: user?.phone_number || '',
            });
        } catch (err) {
            const msg = 'Failed to load your data. Please try again.';
            setError(msg);
            if (addToast) addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    }, [user, addToast]);

    useEffect(() => {
        fetchPortalData();
    }, [fetchPortalData]);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            setUploadMsg('Please select a CSV file.');
            if (addToast) addToast('Please select a CSV file.', 'warning');
            return;
        }
        setUploading(true);
        setUploadMsg('');
        const formData = new FormData();
        formData.append('transaction_file', file);
        formData.append('account_age_months', accountAge);
        try {
            const res = await uploadApplicantFile(formData);
            setUploadMsg('✅ ' + res.data.message);
            fetchPortalData();
            setTab('dashboard');
            if (addToast) addToast(res.data.message, 'success');
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.detail || 'Upload failed.';
            setUploadMsg('❌ ' + msg);
            if (addToast) addToast(msg, 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setProfileMsg('');
        try {
            await updateApplicantProfile(profileForm);
            setProfileMsg('✅ Profile updated successfully!');
            if (addToast) addToast('Profile updated successfully!', 'success');
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.detail || 'Update failed.';
            setProfileMsg('❌ ' + msg);
            if (addToast) addToast(msg, 'error');
        }
    };

    if (loading) {
        return (
            <div style={styles.loadingPage}>
                <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="skeleton" style={{ width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 16px' }} />
                    <div className="skeleton skeleton-text" style={{ width: '200px', margin: '0 auto' }} />
                </div>
            </div>
        );
    }

    const stats = data?.statistics || {};
    const scores = data?.score_history || [];
    const applicant = data?.applicant || {};

    return (
        <div style={styles.page}>
            {/* Top Bar */}
            <div style={styles.topBar}>
                <div style={styles.topLogo}>
                    <span style={styles.topLogoText}>MMCSS</span>
                    <span style={styles.topLogoSub}>Applicant Portal</span>
                </div>
                <div style={styles.topUser}>
                    <span style={styles.topUserName}>
                        {user?.first_name} {user?.last_name}
                    </span>
                    <button style={styles.logoutBtn} onClick={onLogout}>
                        Logout
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div style={styles.tabBar}>
                {[
                    { key: 'dashboard', label: '📊 My Dashboard' },
                    { key: 'upload', label: '📤 Request Scoring' },
                    { key: 'history', label: '📋 Score History' },
                    { key: 'profile', label: '👤 My Profile' },
                ].map(t => (
                    <button
                        key={t.key}
                        style={tab === t.key ? styles.tabActive : styles.tab}
                        onClick={() => setTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div style={styles.content}>
                {error && (
                    <div style={styles.error} role="alert">
                        <span>❌</span> {error}
                    </div>
                )}

                {/* ── DASHBOARD TAB ── */}
                {tab === 'dashboard' && (
                    <div>
                        <h2 style={styles.pageTitle}>
                            Welcome, {user?.first_name}! 👋
                        </h2>
                        <p style={styles.pageSubtitle}>
                            Here is your credit scoring summary
                        </p>

                        {/* Stats Cards */}
                        <div style={styles.statsGrid}>
                            {[
                                { label: 'Total Scorings', value: stats.total_scorings || 0, color: '#1a237e' },
                                { label: 'Average CSI', value: stats.average_csi ? `${stats.average_csi}/100` : '—', color: '#2e7d32' },
                                { label: 'Latest Score', value: stats.latest_csi ? `${stats.latest_csi}/100` : '—', color: '#f57f17' },
                                { label: 'Latest Tier', value: stats.latest_tier?.replace('_', ' ').toUpperCase() || '—', color: getTierColor(stats.latest_tier) },
                            ].map(item => (
                                <div key={item.label} className="card" style={{ textAlign: 'center' }}>
                                    <p style={styles.statLabel}>{item.label}</p>
                                    <p style={{ ...styles.statValue, color: item.color }}>
                                        {item.value}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Latest Score Card */}
                        {scores.length > 0 && (
                            <div className="card" style={{
                                backgroundColor: getTierBg(stats.latest_tier),
                                borderLeft: `6px solid ${getTierColor(stats.latest_tier)}`,
                                marginTop: '16px',
                            }}>
                                <h3 style={styles.latestTitle}>Your Latest Credit Score</h3>
                                <div style={styles.latestScore}>
                                    <span style={{
                                        ...styles.csiNumber,
                                        color: getTierColor(stats.latest_tier),
                                    }}>
                                        {stats.latest_csi}
                                    </span>
                                    <span style={styles.csiMax}>/100</span>
                                </div>
                                <div style={styles.latestTierBadge}>
                                    <span style={{
                                        background: getTierColor(stats.latest_tier),
                                        color: '#fff', padding: '6px 20px',
                                        borderRadius: '20px', fontSize: '14px',
                                        fontWeight: '700',
                                    }}>
                                        {stats.latest_tier?.replace('_', ' ').toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        )}

                        {scores.length === 0 && (
                            <div className="empty-state card">
                                <div className="empty-state-icon">📭</div>
                                <h3 className="empty-state-title">No scores yet</h3>
                                <p className="empty-state-text">Upload your transaction data to get your first credit score.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── UPLOAD TAB ── */}
                {tab === 'upload' && (
                    <div className="card">
                        <h3 style={{ margin: '0 0 16px 0', color: '#1a237e' }}>Request New Credit Scoring</h3>
                        <form onSubmit={handleUpload} style={styles.form}>
                            {uploadMsg && (
                                <div style={{
                                    padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px',
                                    background: uploadMsg.startsWith('✅') ? '#e8f5e9' : '#ffebee',
                                    color: uploadMsg.startsWith('✅') ? '#2e7d32' : '#c62828',
                                }}>
                                    {uploadMsg}
                                </div>
                            )}
                            <div style={styles.field}>
                                <label style={styles.label}>Account Age (Months)</label>
                                <input
                                    type="number"
                                    value={accountAge}
                                    onChange={(e) => setAccountAge(e.target.value)}
                                    style={styles.input}
                                    min="0"
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Upload Bank Statement / Transaction CSV</label>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setFile(e.target.files[0])}
                                    style={styles.input}
                                />
                                {file && (
                                    <p style={{ fontSize: '12px', color: '#2e7d32', marginTop: '6px' }}>
                                        ✅ Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                    </p>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={uploading}
                                style={uploading ? styles.submitBtnDisabled : styles.submitBtn}
                            >
                                {uploading ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={styles.spinner} /> Uploading...
                                    </span>
                                ) : '📤 Submit for Scoring'}
                            </button>
                        </form>
                    </div>
                )}

                {/* ── HISTORY TAB ── */}
                {tab === 'history' && (
                    <div>
                        <h3 style={{ margin: '0 0 16px 0', color: '#1a237e' }}>Your Score History</h3>
                        {scores.length === 0 ? (
                            <div className="empty-state card">
                                <div className="empty-state-icon">📭</div>
                                <h3 className="empty-state-title">No scores yet</h3>
                                <p className="empty-state-text">Upload your transaction data to see your scoring history.</p>
                            </div>
                        ) : (
                            scores.map((score) => (
                                <div
                                    key={score.id}
                                    className="card"
                                    style={{
                                        marginBottom: '12px',
                                        borderLeft: `4px solid ${getTierColor(score.risk_tier)}`,
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                        <div>
                                            <span style={{
                                                background: getTierColor(score.risk_tier),
                                                color: '#fff', padding: '3px 10px',
                                                borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                                            }}>
                                                {score.risk_tier_display?.toUpperCase()}
                                            </span>
                                            <span style={{ marginLeft: '10px', fontWeight: '700', color: '#1a237e' }}>
                                                CSI: {score.csi_total}/100
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '12px', color: '#888' }}>
                                            {new Date(score.scored_at).toLocaleDateString('en-GB')}
                                        </span>
                                    </div>
                                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#555' }}>
                                        {score.recommendation_display}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ── PROFILE TAB ── */}
                {tab === 'profile' && (
                    <div className="card">
                        <h3 style={{ margin: '0 0 16px 0', color: '#1a237e' }}>Update Your Profile</h3>
                        {profileMsg && (
                            <div style={{
                                padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px',
                                background: profileMsg.startsWith('✅') ? '#e8f5e9' : '#ffebee',
                                color: profileMsg.startsWith('✅') ? '#2e7d32' : '#c62828',
                            }}>
                                {profileMsg}
                            </div>
                        )}
                        <form onSubmit={handleProfileUpdate} style={styles.form}>
                            <div style={styles.grid2}>
                                <div style={styles.field}>
                                    <label style={styles.label}>First Name</label>
                                    <input
                                        style={styles.input}
                                        value={profileForm.first_name || ''}
                                        onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                                    />
                                </div>
                                <div style={styles.field}>
                                    <label style={styles.label}>Last Name</label>
                                    <input
                                        style={styles.input}
                                        value={profileForm.last_name || ''}
                                        onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div style={styles.grid2}>
                                <div style={styles.field}>
                                    <label style={styles.label}>Email</label>
                                    <input
                                        style={styles.input}
                                        type="email"
                                        value={profileForm.email || ''}
                                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                                    />
                                </div>
                                <div style={styles.field}>
                                    <label style={styles.label}>Phone Number</label>
                                    <input
                                        style={styles.input}
                                        value={profileForm.phone_number || ''}
                                        onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button type="submit" style={styles.submitBtn}>
                                💾 Save Changes
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    page: { maxWidth: '900px', margin: '0 auto' },
    topBar: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '24px', paddingBottom: '16px',
        borderBottom: '1px solid #e0e0e0',
    },
    topLogo: { display: 'flex', flexDirection: 'column' },
    topLogoText: { fontSize: '22px', fontWeight: '800', color: '#1a237e' },
    topLogoSub: { fontSize: '12px', color: '#888' },
    topUser: { display: 'flex', alignItems: 'center', gap: '12px' },
    topUserName: { fontSize: '14px', color: '#333', fontWeight: '600' },
    logoutBtn: {
        padding: '8px 16px', background: '#b71c1c', color: '#fff',
        border: 'none', borderRadius: '6px', fontSize: '13px',
        cursor: 'pointer', fontWeight: '600',
    },
    tabBar: {
        display: 'flex', gap: '8px', marginBottom: '24px',
        flexWrap: 'wrap',
    },
    tab: {
        padding: '10px 18px', background: '#fff', border: '2px solid #e0e0e0',
        borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
        fontWeight: '600', color: '#666', fontFamily: 'inherit',
    },
    tabActive: {
        padding: '10px 18px', background: '#1a237e', border: '2px solid #1a237e',
        borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
        fontWeight: '600', color: '#fff', fontFamily: 'inherit',
    },
    content: { paddingBottom: '40px' },
    error: {
        background: '#ffebee', color: '#c62828', padding: '12px 16px',
        borderRadius: '8px', marginBottom: '16px', fontSize: '14px',
        display: 'flex', alignItems: 'center', gap: '8px',
    },
    pageTitle: { fontSize: '22px', fontWeight: '700', color: '#1a237e', marginBottom: '4px' },
    pageSubtitle: { color: '#666', margin: '0 0 24px 0', fontSize: '15px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '16px' },
    statLabel: { fontSize: '11px', color: '#888', margin: '0 0 6px 0', textTransform: 'uppercase', fontWeight: '600' },
    statValue: { fontSize: '28px', fontWeight: '800', margin: 0 },
    latestTitle: { fontSize: '16px', fontWeight: '700', color: '#333', margin: '0 0 12px 0' },
    latestScore: { display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' },
    csiNumber: { fontSize: '48px', fontWeight: '800' },
    csiMax: { fontSize: '20px', color: '#888', fontWeight: '600' },
    latestTierBadge: { textAlign: 'center' },
    form: { display: 'flex', flexDirection: 'column', gap: '16px' },
    field: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '13px', fontWeight: '600', color: '#333' },
    input: { padding: '10px 14px', borderRadius: '8px', border: '2px solid #e0e0e0', fontSize: '14px', fontFamily: 'inherit' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
    submitBtn: {
        padding: '12px 24px', background: '#1a237e', color: '#fff',
        border: 'none', borderRadius: '8px', fontSize: '15px',
        fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
    },
    submitBtnDisabled: {
        padding: '12px 24px', background: '#9e9e9e', color: '#fff',
        border: 'none', borderRadius: '8px', fontSize: '15px',
        fontWeight: '600', cursor: 'not-allowed', fontFamily: 'inherit',
    },
    spinner: {
        width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite', display: 'inline-block',
    },
    loadingPage: { padding: '40px 20px', maxWidth: '600px', margin: '0 auto' },
};