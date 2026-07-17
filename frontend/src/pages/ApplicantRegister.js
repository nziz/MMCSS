import React, { useState, useEffect } from 'react';
import { getInstitutions, registerApplicant, verifyApplicantOtp, resendOtpToken } from '../services/api';

export default function ApplicantRegister({ onBackToLogin, addToast }) {
    const [step, setStep] = useState('register');
    const [institutions, setInstitutions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [username, setUsername] = useState('');

    const [form, setForm] = useState({
        username: '', password: '', confirmPassword: '',
        email: '', full_name: '', phone_number: '',
        national_id: '', gender: '', district: '',
        mobile_operator: 'mtn', institution_id: '',
    });

    const [otp, setOtp] = useState('');

    useEffect(() => {
        getInstitutions()
            .then(res => setInstitutions(res.data))
            .catch(() => {});
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (form.password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (!form.national_id.trim()) {
            setError('National ID is required.');
            return;
        }
        if (!form.email.trim()) {
            setError('Email address is required.');
            return;
        }
        if (!form.full_name.trim()) {
            setError('Full name is required.');
            return;
        }
        if (!form.phone_number.trim()) {
            setError('Phone number is required.');
            return;
        }

        setLoading(true);
        try {
            const res = await registerApplicant(form);
            setUsername(form.username);
            setSuccess(res.data.message || 'Registration successful! Check your email for OTP.');
            setStep('verify');
            setOtp('');
            if (addToast) addToast('Registration successful! Check your email for OTP.', 'success');
        } catch (err) {
            const msg = err.response?.data?.error || 
                       err.response?.data?.detail || 
                       err.response?.data?.message || 
                       JSON.stringify(err.response?.data) ||
                       'Registration failed. Please try again.';
            setError(msg);
            if (addToast) addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await verifyApplicantOtp(username, otp);
            localStorage.setItem('access_token', res.data.access);
            localStorage.setItem('refresh_token', res.data.refresh);
            if (addToast) addToast('Account verified successfully!', 'success');
            window.location.reload();
        } catch (err) {
            const msg = err.response?.data?.error || 
                       err.response?.data?.detail || 
                       err.response?.data?.message ||
                       'Verification failed. Please check your OTP.';
            setError(msg);
            if (addToast) addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setResendLoading(true);
        setError('');
        try {
            await resendOtpToken(username);
            setSuccess('New OTP sent to your email!');
            if (addToast) addToast('New OTP sent to your email!', 'success');
        } catch (err) {
            const msg = err.response?.data?.error || 
                       err.response?.data?.detail || 
                       err.response?.data?.message ||
                       'Failed to resend OTP. Please try again.';
            setError(msg);
            if (addToast) addToast(msg, 'error');
        } finally {
            setResendLoading(false);
        }
    };

    const rwandaDistricts = [
        'Bugesera','Burera','Gakenke','Gasabo','Gatsibo',
        'Gicumbi','Gisagara','Huye','Kamonyi','Karongi',
        'Kayonza','Kicukiro','Kirehe','Muhanga','Musanze',
        'Ngoma','Ngororero','Nyabihu','Nyagatare','Nyamagabe',
        'Nyamasheke','Nyanza','Nyarugenge','Nyaruguru','Rubavu',
        'Ruhango','Rulindo','Rusizi','Rutsiro','Rwamagana',
    ];

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h1 style={styles.logo}>MMCSS</h1>
                    <p style={styles.logoSub}>Mobile Money Credit Scoring System</p>
                    <h2 style={styles.title}>
                        {step === 'register' ? 'Create Your Account' : 'Verify Your Email'}
                    </h2>
                </div>

                {error && (
                    <div style={styles.error} role="alert">
                        <span>❌</span> {error}
                    </div>
                )}
                {success && (
                    <div style={styles.successBox}>{success}</div>
                )}

                {/* REGISTRATION FORM */}
                {step === 'register' && (
                    <form onSubmit={handleRegister} style={styles.form} noValidate>
                        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
                            <h3 style={styles.sectionTitle}>Account Credentials</h3>
                            <div style={styles.row}>
                                <div style={styles.field}>
                                    <label style={styles.label}>Username *</label>
                                    <input
                                        style={styles.input}
                                        name="username"
                                        value={form.username}
                                        onChange={handleChange}
                                        placeholder="Choose a username"
                                        required
                                    />
                                </div>
                                <div style={styles.field}>
                                    <label style={styles.label}>Email Address *</label>
                                    <input
                                        style={styles.input}
                                        name="email"
                                        type="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        placeholder="your@email.com"
                                        required
                                    />
                                </div>
                            </div>
                            <div style={styles.row}>
                                <div style={styles.field}>
                                    <label style={styles.label}>Password *</label>
                                    <input
                                        style={styles.input}
                                        name="password"
                                        type="password"
                                        value={form.password}
                                        onChange={handleChange}
                                        placeholder="Min 8 characters"
                                        required
                                    />
                                </div>
                                <div style={styles.field}>
                                    <label style={styles.label}>Confirm Password *</label>
                                    <input
                                        style={styles.input}
                                        name="confirmPassword"
                                        type="password"
                                        value={form.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="Repeat password"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
                            <h3 style={styles.sectionTitle}>Personal Information</h3>
                            <div style={styles.row}>
                                <div style={styles.field}>
                                    <label style={styles.label}>Full Name *</label>
                                    <input
                                        style={styles.input}
                                        name="full_name"
                                        value={form.full_name}
                                        onChange={handleChange}
                                        placeholder="As on National ID"
                                        required
                                    />
                                </div>
                                <div style={styles.field}>
                                    <label style={styles.label}>National ID *</label>
                                    <input
                                        style={styles.input}
                                        name="national_id"
                                        value={form.national_id}
                                        onChange={handleChange}
                                        placeholder="16-digit ID number"
                                        required
                                    />
                                </div>
                            </div>
                            <div style={styles.row}>
                                <div style={styles.field}>
                                    <label style={styles.label}>Phone Number *</label>
                                    <input
                                        style={styles.input}
                                        name="phone_number"
                                        value={form.phone_number}
                                        onChange={handleChange}
                                        placeholder="07XXXXXXXX"
                                        required
                                    />
                                </div>
                                <div style={styles.field}>
                                    <label style={styles.label}>Gender</label>
                                    <select
                                        style={styles.input}
                                        name="gender"
                                        value={form.gender}
                                        onChange={handleChange}
                                    >
                                        <option value="">Select gender</option>
                                        <option value="M">Male</option>
                                        <option value="F">Female</option>
                                        <option value="O">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div style={styles.row}>
                                <div style={styles.field}>
                                    <label style={styles.label}>District</label>
                                    <select
                                        style={styles.input}
                                        name="district"
                                        value={form.district}
                                        onChange={handleChange}
                                    >
                                        <option value="">Select district</option>
                                        {rwandaDistricts.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={styles.field}>
                                    <label style={styles.label}>Mobile Operator</label>
                                    <select
                                        style={styles.input}
                                        name="mobile_operator"
                                        value={form.mobile_operator}
                                        onChange={handleChange}
                                    >
                                        <option value="mtn">MTN Mobile Money</option>
                                        <option value="airtel">Airtel Money</option>
                                        <option value="both">Both MTN & Airtel</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
                            <h3 style={styles.sectionTitle}>Institution</h3>
                            <div style={styles.field}>
                                <label style={styles.label}>Select MFI / SACCO</label>
                                <select
                                    style={styles.input}
                                    name="institution_id"
                                    value={form.institution_id}
                                    onChange={handleChange}
                                >
                                    <option value="">Select institution (optional)</option>
                                    {institutions.map(inst => (
                                        <option key={inst.id} value={inst.id}>
                                            {inst.name} — {inst.district}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            style={loading ? styles.submitBtnDisabled : styles.submitBtn}
                            disabled={loading}
                        >
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <span style={styles.spinner} /> Registering...
                                </span>
                            ) : 'Create Account →'}
                        </button>

                        <p style={styles.loginLink}>
                            Already have an account?{' '}
                            <span style={styles.link} onClick={onBackToLogin}>
                                Login here
                            </span>
                        </p>
                    </form>
                )}

                {/* OTP VERIFICATION */}
                {step === 'verify' && (
                    <form onSubmit={handleVerify} style={styles.form}>
                        <div style={styles.otpBox}>
                            <div style={styles.otpIcon}>📧</div>
                            <p style={styles.otpText}>
                                A 6-digit verification code has been sent to your email address.
                                Enter it below to activate your account.
                            </p>
                            <input
                                style={styles.otpInput}
                                type="text"
                                maxLength={6}
                                placeholder="Enter 6-digit code"
                                value={otp}
                                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                                required
                            />
                            <button
                                type="submit"
                                style={loading || otp.length !== 6 ? styles.submitBtnDisabled : styles.submitBtn}
                                disabled={loading || otp.length !== 6}
                            >
                                {loading ? (
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <span style={styles.spinner} /> Verifying...
                                    </span>
                                ) : '✅ Verify & Activate Account'}
                            </button>
                            <p style={styles.loginLink}>
                                Didn't receive code?{' '}
                                <span
                                    style={{ ...styles.link, opacity: resendLoading ? 0.5 : 1, pointerEvents: resendLoading ? 'none' : 'auto' }}
                                    onClick={handleResendOtp}
                                >
                                    {resendLoading ? 'Sending...' : 'Resend OTP'}
                                </span>
                            </p>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #1565c0 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
    },
    card: {
        background: '#fff', borderRadius: '16px',
        padding: '40px', width: '100%', maxWidth: '720px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        animation: 'fadeIn 0.4s ease',
    },
    header: { textAlign: 'center', marginBottom: '32px' },
    logo: { fontSize: '32px', fontWeight: '800', color: '#1a237e', margin: '0 0 4px 0' },
    logoSub: { fontSize: '13px', color: '#999', margin: '0 0 20px 0' },
    title: { fontSize: '22px', fontWeight: '700', color: '#333', margin: 0 },
    error: {
        background: '#ffebee', color: '#c62828', padding: '12px 16px',
        borderRadius: '8px', marginBottom: '20px', fontSize: '14px',
        display: 'flex', alignItems: 'center', gap: '8px',
    },
    successBox: {
        background: '#e8f5e9', color: '#2e7d32', padding: '12px 16px',
        borderRadius: '8px', marginBottom: '20px', fontSize: '14px',
    },
    form: { display: 'flex', flexDirection: 'column', gap: '0' },
    sectionTitle: {
        fontSize: '14px', fontWeight: '700', color: '#1a237e',
        margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px',
    },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
    field: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '13px', fontWeight: '600', color: '#555' },
    input: {
        padding: '10px 14px', border: '2px solid #e0e0e0',
        borderRadius: '8px', fontSize: '14px',
        fontFamily: 'inherit', background: '#fff',
    },
    submitBtn: {
        padding: '14px', background: '#1a237e', color: '#fff',
        border: 'none', borderRadius: '10px', fontSize: '16px',
        fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
        marginTop: '8px',
    },
    submitBtnDisabled: {
        padding: '14px', background: '#9e9e9e', color: '#fff',
        border: 'none', borderRadius: '10px', fontSize: '16px',
        fontWeight: '700', cursor: 'not-allowed', fontFamily: 'inherit',
        marginTop: '8px',
    },
    spinner: {
        width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite', display: 'inline-block',
    },
    loginLink: { textAlign: 'center', fontSize: '14px', color: '#666', marginTop: '16px' },
    link: { color: '#1a237e', fontWeight: '700', cursor: 'pointer' },
    otpBox: {
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '16px', padding: '20px',
    },
    otpIcon: { fontSize: '48px' },
    otpText: { textAlign: 'center', color: '#555', fontSize: '15px', maxWidth: '400px' },
    otpInput: {
        padding: '16px', fontSize: '28px', fontWeight: '700',
        textAlign: 'center', letterSpacing: '8px',
        border: '3px solid #1a237e', borderRadius: '10px',
        width: '220px', fontFamily: 'inherit',
    },
};