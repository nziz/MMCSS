import { useState, useCallback } from 'react';

/**
 * useToast — Reusable toast notification hook
 * Usage: const { toasts, addToast, removeToast } = useToast();
 */
export function useToast() {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now() + Math.random();
        const toast = { id, message, type, duration };
        setToasts((prev) => [...prev, toast]);

        if (duration > 0) {
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, duration);
        }
        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return { toasts, addToast, removeToast };
}

/**
 * ToastContainer — Render this at app root
 */
export function ToastContainer({ toasts, removeToast }) {
    const typeStyles = {
        success: { background: '#e8f5e9', color: '#2e7d32', border: '2px solid #2e7d32' },
        error: { background: '#ffebee', color: '#c62828', border: '2px solid #c62828' },
        warning: { background: '#fff8e1', color: '#f57f17', border: '2px solid #f57f17' },
        info: { background: '#e3f2fd', color: '#1565c0', border: '2px solid #1565c0' },
    };

    const icons = {
        success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️',
    };

    return (
        <div style={containerStyle}>
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    style={{
                        ...toastStyle,
                        ...typeStyles[toast.type],
                        animation: 'slideIn 0.3s ease',
                    }}
                >
                    <span style={{ fontSize: '16px' }}>{icons[toast.type]}</span>
                    <span style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>
                        {toast.message}
                    </span>
                    <button
                        onClick={() => removeToast(toast.id)}
                        style={closeBtnStyle}
                        aria-label="Dismiss notification"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
}

const containerStyle = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxWidth: '400px',
};

const toastStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 18px',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    cursor: 'default',
    minWidth: '280px',
};

const closeBtnStyle = {
    background: 'none',
    border: 'none',
    fontSize: '14px',
    cursor: 'pointer',
    opacity: 0.6,
    padding: '0 4px',
};