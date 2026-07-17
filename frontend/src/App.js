import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import './App.css';
import { ToastContainer, useToast } from './hooks/useToast';

// Lazy load pages
const Login = lazy(() => import('./pages/Login'));
const ApplicantRegister = lazy(() => import('./pages/ApplicantRegister'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ScoreIndividual = lazy(() => import('./pages/ScoreIndividual'));
const ScoreBatch = lazy(() => import('./pages/ScoreBatch'));
const ScoreHistory = lazy(() => import('./pages/ScoreHistory'));
const ApplicantHistory = lazy(() => import('./pages/ApplicantHistory'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

function PageLoader() {
    return (
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}>
            <div style={{width:'40px',height:'40px',border:'3px solid #e0e0e0',borderTopColor:'#1a237e',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
            <p style={{color:'#666',fontSize:'14px',marginTop:'16px'}}>Loading...</p>
        </div>
    );
}

export default function App() {
    const [user, setUser] = useState(null);
    const [page, setPage] = useState('login');
    const [menuOpen, setMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [authChecked, setAuthChecked] = useState(false);
    const { toasts, addToast, removeToast } = useToast();

    // Check auth on mount — just check if token exists
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            setAuthChecked(true);
            return;
        }
        // Token exists but we can't verify without calling backend
        // For now, assume it's valid and let API calls handle 401
        setAuthChecked(true);
    }, []);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLogin = useCallback((userData) => {
        console.log('[App] Login successful, user:', userData);
        setUser(userData);
        setPage('dashboard');
        addToast('Welcome back!', 'success');
    }, [addToast]);

    const handleLogout = useCallback(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        setPage('login');
        addToast('Logged out', 'info');
    }, [addToast]);

    const navItems = [
        { key: 'dashboard', label: '📊 Dashboard', roles: ['admin','loan_officer','branch_manager','auditor'] },
        { key: 'score', label: '👤 Score Individual', roles: ['admin','loan_officer','branch_manager'] },
        { key: 'batch', label: '👥 Batch Scoring', roles: ['admin','loan_officer','branch_manager'] },
        { key: 'history', label: '📋 Score History', roles: ['admin','loan_officer','branch_manager','auditor'] },
        { key: 'applicant', label: '🔍 Applicant History', roles: ['admin','loan_officer','branch_manager','auditor'] },
        { key: 'users', label: '👥 User Management', roles: ['admin'] },
        { key: 'admin', label: '⚙️ Admin Panel', roles: ['admin'] },
    ];

    const visibleNav = navItems.filter(item => item.roles.includes(user?.role));

    const renderPage = () => {
        const props = { user, onLogout: handleLogout, addToast };
        switch (page) {
            case 'login': return <Login onLogin={handleLogin} onRegister={() => setPage('register')} />;
            case 'register': return <ApplicantRegister onBackToLogin={() => setPage('login')} addToast={addToast} />;
            case 'dashboard': return <Dashboard {...props} />;
            case 'score': return <ScoreIndividual {...props} />;
            case 'batch': return <ScoreBatch {...props} />;
            case 'history': return <ScoreHistory {...props} />;
            case 'applicant': return <ApplicantHistory {...props} />;
            case 'users': return <UserManagement {...props} />;
            case 'admin': return <AdminPanel {...props} />;
            default: return <Dashboard {...props} />;
        }
    };

    if (!authChecked) {
        return (
            <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f6fa'}}>
                <PageLoader />
            </div>
        );
    }

    if (!user) {
        return (
            <Suspense fallback={<PageLoader />}>
                <ToastContainer toasts={toasts} removeToast={removeToast} />
                {renderPage()}
            </Suspense>
        );
    }

    return (
        <div style={{display:'flex',minHeight:'100vh'}}>
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {isMobile && (
                <div style={{position:'fixed',top:0,left:0,right:0,height:'56px',background:'#1a237e',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',zIndex:1100}}>
                    <button style={{background:'none',border:'none',color:'#fff',fontSize:'22px',cursor:'pointer'}} onClick={() => setMenuOpen(!menuOpen)}>
                        {menuOpen ? '✕' : '☰'}
                    </button>
                    <span style={{color:'#fff',fontSize:'18px',fontWeight:'700'}}>MMCSS</span>
                    <div style={{width:'40px'}} />
                </div>
            )}

            <aside style={{
                width:'240px', background:'#1a237e', color:'#fff',
                position:'fixed', top:0, left:0, bottom:0,
                display:'flex', flexDirection:'column', zIndex:1200,
                transform: isMobile ? (menuOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
                transition: 'transform 0.3s ease',
            }}>
                <div style={{padding:'24px 20px', borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
                    <h1 style={{fontSize:'24px',fontWeight:'800',margin:'0 0 4px 0'}}>MMCSS</h1>
                    <p style={{fontSize:'11px',opacity:0.7,margin:0}}>Credit Scoring</p>
                </div>

                <nav style={{flex:1,padding:'16px 12px',display:'flex',flexDirection:'column',gap:'4px',overflowY:'auto'}}>
                    {visibleNav.map(item => (
                        <button key={item.key}
                            style={page === item.key 
                                ? {padding:'12px 16px',borderRadius:'8px',textAlign:'left',background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',fontSize:'14px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}
                                : {padding:'12px 16px',borderRadius:'8px',textAlign:'left',background:'none',border:'none',color:'rgba(255,255,255,0.85)',fontSize:'14px',fontWeight:'500',cursor:'pointer',transition:'all 0.2s',fontFamily:'inherit'}
                            }
                            onClick={() => { setPage(item.key); if (isMobile) setMenuOpen(false); }}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div style={{padding:'16px',borderTop:'1px solid rgba(255,255,255,0.1)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
                        <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',fontWeight:'700'}}>
                            {(user.first_name?.[0] || user.username?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                            <p style={{fontSize:'13px',fontWeight:'600',margin:'0 0 2px 0'}}>{user.first_name} {user.last_name}</p>
                            <p style={{fontSize:'11px',opacity:0.6,margin:0,textTransform:'capitalize'}}>{user.role?.replace('_',' ')}</p>
                        </div>
                    </div>
                    <button style={{width:'100%',padding:'10px',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'8px',color:'#fff',fontSize:'13px',cursor:'pointer',fontFamily:'inherit'}} onClick={handleLogout}>
                        🚪 Logout
                    </button>
                </div>
            </aside>

            {isMobile && menuOpen && (
                <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:1150}} onClick={() => setMenuOpen(false)} />
            )}

            <main style={{flex:1,background:'#f5f6fa',minHeight:'100vh',marginLeft:isMobile?0:'240px',paddingTop:isMobile?'56px':'20px',padding:'20px',transition:'margin-left 0.3s ease'}}>
                <Suspense fallback={<PageLoader />}>
                    {renderPage()}
                </Suspense>
            </main>
        </div>
    );
}