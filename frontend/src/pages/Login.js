import React, { useState } from 'react';
import { apiClient } from '../services/apiConfig';

export default function Login({ onLogin, onRegister }) {
    const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Step 1: Submit username + password
    const handleCredentials = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setError('Please enter both username and password.');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const res = await apiClient.post('/auth/otp/request/', {
                username: username.trim(),
                password: password.trim(),
            });

            console.log('[Login] OTP request response:', res.data);

            if (res.data.requires_otp) {
                // Need OTP verification
                setStep('otp');
                setOtpCode('');
            } else {
                // No OTP needed — login successful
                const { access, refresh, user } = res.data;
                if (access) {
                    localStorage.setItem('access_token', access);
                    if (refresh) localStorage.setItem('refresh_token', refresh);
                    onLogin(user);
                } else {
                    setError('Login failed. No access token received.');
                }
            }
        } catch (err) {
            console.error('[Login] Error:', err);
            const msg = err.response?.data?.error || 
                       err.response?.data?.detail || 
                       err.response?.data?.message ||
                       'Invalid username or password.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!otpCode.trim()) {
            setError('Please enter the OTP code.');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const res = await apiClient.post('/auth/otp/verify/', {
                username: username.trim(),
                otp_code: otpCode.trim(),
            });

            console.log('[Login] OTP verify response:', res.data);

            const { access, refresh, user } = res.data;
            if (access) {
                localStorage.setItem('access_token', access);
                if (refresh) localStorage.setItem('refresh_token', refresh);
                onLogin(user);
            } else {
                setError('Verification failed. No access token received.');
            }
        } catch (err) {
            console.error('[Login] OTP verify error:', err);
            const msg = err.response?.data?.error || 
                       err.response?.data?.detail || 
                       err.response?.data?.message ||
                       'Invalid OTP code.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setLoading(true);
        setError('');
        try {
            await apiClient.post('/auth/otp/resend/', {
                username: username.trim(),
            });
            setError('');
            alert('New OTP sent to your email!');
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to resend OTP.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h1 style={styles.title}>MMCSS</h1>
                    <p style={styles.subtitle}>Mobile Money Credit Scoring System</p>
                    <p style={styles.university}>University of Kigali — BBIT 2026</p>
                </div>

                {error && (
                    <div style={styles.error} role="alert">
                        <span>❌</span> {error}
                    </div>
                )}

                {/* STEP 1: Username + Password */}
                {step === 'credentials' && (
                    <form onSubmit={handleCredentials} style={styles.form} noValidate>
                        <div style={styles.field}>
                            <label style={styles.label} htmlFor="login-username">Username</label>
                            <input
                                id="login-username"
                                style={styles.input}
                                type="text"
                                value={username}
                                onChange={e => { setUsername(e.target.value); setError(''); }}
                                placeholder="Enter username"
                                autoComplete="username"
                                required
                            />
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label} htmlFor="login-password">Password</label>
                            <div style={styles.passwordWrap}>
                                <input
                                    id="login-password"
                                    style={{ ...styles.input, paddingRight: '44px' }}
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setError(''); }}
                                    placeholder="Enter password"
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    style={styles.eyeBtn}
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <button
                            style={loading ? styles.buttonDisabled : styles.button}
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <span style={styles.spinner} /> Checking...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>
                )}

                {/* STEP 2: OTP Verification */}
                {step === 'otp' && (
                    <form onSubmit={handleVerifyOtp} style={styles.form} noValidate>
                        <div style={styles.otpBox}>
                            <div style={styles.otpIcon}>📧</div>
                            <p style={styles.otpText}>
                                A verification code has been sent to your email.
                                Enter it below to complete login.
                            </p>
                            <input
                                style={styles.otpInput}
                                type="text"
                                maxLength={6}
                                placeholder="Enter OTP"
                                value={otpCode}
                                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                required
                                autoFocus
                            />
                            <button
                                style={loading || otpCode.length < 4 ? styles.buttonDisabled : styles.button}
                                type="submit"
                                disabled={loading || otpCode.length < 4}
                            >
                                {loading ? (
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <span style={styles.spinner} /> Verifying...
                                    </span>
                                ) : 'Verify & Login'}
                            </button>
                            <p style={styles.resendLink}>
                                Didn't receive code?{' '}
                                <span style={styles.link} onClick={handleResendOtp}>
                                    Resend OTP
                                </span>
                            </p>
                            <p style={styles.backLink}>
                                <span style={styles.link} onClick={() => { setStep('credentials'); setError(''); }}>
                                    ← Back to login
                                </span>
                            </p>
                        </div>
                    </form>
                )}

                <div style={styles.divider}>
                    <span style={styles.dividerLine} />
                    <span style={styles.dividerText}>New applicant?</span>
                    <span style={styles.dividerLine} />
                </div>

                <button style={styles.registerBtn} onClick={onRegister} type="button">
                    Create Applicant Account
                </button>

                <p style={styles.note}>
                    Staff accounts are created by the administrator only.
                </p>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
    },
    card: {
        background: '#fff', borderRadius: '16px', padding: '40px',
        width: '100%', maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        animation: 'fadeIn 0.4s ease',
    },
    header: { textAlign: 'center', marginBottom: '32px' },
    title: { fontSize: '36px', fontWeight: '800', color: '#1a237e', margin: '0 0 8px 0' },
    subtitle: { fontSize: '14px', color: '#555', margin: '0 0 4px 0' },
    university: { fontSize: '12px', color: '#888', margin: '0' },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    field: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '13px', fontWeight: '600', color: '#333' },
    input: {
        padding: '12px 16px', borderRadius: '8px', border: '2px solid #e0e0e0',
        fontSize: '14px', outline: 'none', transition: 'border-color 0.2s',
        fontFamily: 'inherit', width: '100%',
    },
    passwordWrap: { position: 'relative' },
    eyeBtn: {
        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer',
        padding: '4px',
    },
    button: {
        padding: '14px', background: '#1a237e', color: '#fff', border: 'none',
        borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    buttonDisabled: {
        padding: '14px', background: '#9e9e9e', color: '#fff', border: 'none',
        borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'not-allowed',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    spinner: {
        width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite', display: 'inline-block',
    },
    error: {
        background: '#ffebee', color: '#c62828', padding: '12px 16px',
        borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
        marginBottom: '16px',
    },
    otpBox: {
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '16px', padding: '10px 0',
    },
    otpIcon: { fontSize: '48px' },
    otpText: { textAlign: 'center', color: '#555', fontSize: '14px', maxWidth: '320px' },
    otpInput: {
        padding: '16px', fontSize: '28px', fontWeight: '700',
        textAlign: 'center', letterSpacing: '8px',
        border: '3px solid #1a237e', borderRadius: '10px',
        width: '200px', fontFamily: 'inherit',
    },
    resendLink: { textAlign: 'center', fontSize: '13px', color: '#666', margin: '0' },
    backLink: { textAlign: 'center', fontSize: '13px', color: '#666', margin: '4px 0 0 0' },
    link: { color: '#1a237e', fontWeight: '700', cursor: 'pointer' },
    divider: {
        display: 'flex', alignItems: 'center', gap: '12px',
        margin: '24px 0 16px 0',
    },
    dividerLine: { flex: 1, height: '1px', background: '#e0e0e0' },
    dividerText: { color: '#888', fontSize: '13px', whiteSpace: 'nowrap' },
    registerBtn: {
        width: '100%', padding: '13px', background: 'none', border: '2px solid #1a237e',
        color: '#1a237e', borderRadius: '8px', fontSize: '14px', fontWeight: '600',
        cursor: 'pointer', transition: 'all 0.2s',
    },
    note: { textAlign: 'center', fontSize: '11px', color: '#aaa', marginTop: '16px', marginBottom: '0' },
};