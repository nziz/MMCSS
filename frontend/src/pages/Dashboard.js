import React, { useState, useEffect } from 'react';
import { getDashboardStats, getScores } from '../services/api';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    LineChart, Line
} from 'recharts';

const TIER_COLORS = {
    excellent: '#2e7d32', good: '#558b2f',
    fair: '#f9a825', poor: '#e65100', very_poor: '#b71c1c',
};

const RECOMMENDATIONS = {
    approve: { label: 'Approve', color: '#2e7d32' },
    approve_standard: { label: 'Approve Standard', color: '#558b2f' },
    review: { label: 'Review', color: '#f9a825' },
    conditional_decline: { label: 'Conditional Decline', color: '#e65100' },
    decline: { label: 'Decline', color: '#b71c1c' },
};

// ── Skeleton Components ──────────────────────────────────────────────
function SkeletonCard() {
    return <div className="skeleton skeleton-card" />;
}

function SkeletonChart() {
    return (
        <div className="card" style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="skeleton" style={{ width: '80%', height: '200px', borderRadius: '8px' }} />
        </div>
    );
}

// ── Empty State ──────────────────────────────────────────────────────
function EmptyState() {
    return (
        <div className="empty-state card">
            <div className="empty-state-icon">📭</div>
            <h3 className="empty-state-title">No scoring data yet</h3>
            <p className="empty-state-text">
                Start by scoring individual applicants or uploading a batch file to see analytics here.
            </p>
        </div>
    );
}

export default function Dashboard({ addToast }) {
    const [stats, setStats] = useState(null);
    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const [statsRes, scoresRes] = await Promise.all([
                    getDashboardStats(),
                    getScores({}),
                ]);
                if (!cancelled) {
                    setStats(statsRes.data);
                    setScores(scoresRes.data);
                }
            } catch (err) {
                if (!cancelled) {
                    const msg = err.response?.data?.detail || 'Failed to load dashboard data.';
                    setError(msg);
                    if (addToast) addToast(msg, 'error');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [addToast]);

    if (loading) {
        return (
            <div style={styles.container}>
                <h2 style={styles.heading}> Dashboard Overview</h2>
                <div style={styles.cards}>
                    {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
                </div>
                <div style={styles.chartRow}>
                    <SkeletonChart />
                    <SkeletonChart />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <h2 style={styles.heading}>📊 Dashboard Overview</h2>
                <div className="empty-state card" style={{ borderLeft: '4px solid #b71c1c' }}>
                    <div className="empty-state-icon">⚠️</div>
                    <h3 className="empty-state-title">Error loading data</h3>
                    <p className="empty-state-text">{error}</p>
                    <button
                        style={{ ...styles.retryBtn, marginTop: '16px' }}
                        onClick={() => window.location.reload()}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!stats || scores.length === 0) {
        return (
            <div style={styles.container}>
                <h2 style={styles.heading}>📊 Dashboard Overview</h2>
                <EmptyState />
            </div>
        );
    }

    // Pie chart data — risk tiers
    const pieData = Object.entries(stats.tier_summary || {}).map(([key, value]) => ({
        name: key.replace('_', ' ').toUpperCase(),
        value,
        color: TIER_COLORS[key] || '#90a4ae',
    }));

    // Bar chart — average CSI per tier
    const barData = Object.entries(stats.tier_summary || {}).map(([key, count]) => ({
        tier: key.replace('_', ' '),
        count,
        fill: TIER_COLORS[key] || '#90a4ae',
    }));

    // Recommendation breakdown
    const recMap = {};
    scores.forEach(s => {
        recMap[s.recommendation] = (recMap[s.recommendation] || 0) + 1;
    });
    const recData = Object.entries(recMap).map(([key, value]) => ({
        name: RECOMMENDATIONS[key]?.label || key,
        value,
        color: RECOMMENDATIONS[key]?.color || '#888',
    }));

    // CSI trend over last 10 scores
    const trendData = [...scores]
        .sort((a, b) => new Date(a.scored_at) - new Date(b.scored_at))
        .slice(-10)
        .map((s, i) => ({
            name: `#${i + 1}`,
            CSI: s.csi_total,
            date: new Date(s.scored_at).toLocaleDateString(),
        }));

    // Mode breakdown
    const modeData = [
        { name: 'Individual', value: stats.individual_count, color: '#1a237e' },
        { name: 'Batch', value: stats.batch_count, color: '#0d47a1' },
    ].filter(d => d.value > 0);

    // Approval rate
    const approvalCount = scores.filter(s =>
        s.recommendation === 'approve' || s.recommendation === 'approve_standard'
    ).length;
    const approvalRate = stats.total_scored > 0
        ? Math.round((approvalCount / stats.total_scored) * 100)
        : 0;

    const declineCount = scores.filter(s => s.recommendation === 'decline').length;
    const reviewCount = scores.filter(s => s.recommendation === 'review').length;

    return (
        <div style={styles.container}>
            <h2 style={styles.heading}>📊 Dashboard Overview</h2>

            {/* Top KPI Cards */}
            <div style={styles.cards}>
                <KpiCard label="Total Scored" value={stats.total_scored} sub="All applicants" color="#1a237e" />
                <KpiCard label="Average CSI" value={stats.average_csi} sub="Out of 100 points" color="#2e7d32" />
                <KpiCard label="Approval Rate" value={`${approvalRate}%`} sub={`${approvalCount} approved`} color="#558b2f" />
                <KpiCard label="Declined" value={declineCount} sub={`${reviewCount} under review`} color="#b71c1c" />
                <KpiCard label="Individual" value={stats.individual_count} sub="Single scoring" color="#0d47a1" />
                <KpiCard label="Batch Sessions" value={stats.batch_count} sub="Group scoring" color="#283593" />
            </div>

            {/* Row 1 — Pie + Bar */}
            <div style={styles.chartRow}>
                <div className="card">
                    <h3 style={styles.chartTitle}>🎯 Risk Tier Distribution</h3>
                    <p style={styles.chartSub}>Breakdown of applicants by credit risk level</p>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name"
                                cx="50%" cy="50%" outerRadius={90}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {pieData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value} applicants`, 'Count']} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <h3 style={styles.chartTitle}>📊 Applicants per Risk Tier</h3>
                    <p style={styles.chartSub}>Count of applicants in each credit tier</p>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="tier" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value) => [`${value} applicants`, 'Count']} />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                {barData.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Row 2 — Line + Recommendation Pie */}
            <div style={styles.chartRow}>
                <div className="card">
                    <h3 style={styles.chartTitle}>📈 CSI Score Trend</h3>
                    <p style={styles.chartSub}>Credit score trend across last 10 scored applicants</p>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <Tooltip
                                formatter={(value) => [`CSI: ${value}`, 'Score']}
                                labelFormatter={(label, payload) =>
                                    payload?.[0]?.payload?.date || label}
                            />
                            <Line type="monotone" dataKey="CSI"
                                stroke="#1a237e" strokeWidth={2}
                                dot={{ fill: '#1a237e', r: 4 }}
                                activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <h3 style={styles.chartTitle}>✅ Recommendation Breakdown</h3>
                    <p style={styles.chartSub}>Distribution of loan recommendations given</p>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie data={recData} dataKey="value" nameKey="name"
                                cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                                {recData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value} applicants`, 'Count']} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Row 3 — Scoring Mode + Risk Summary Table */}
            <div style={styles.chartRow}>
                <div className="card">
                    <h3 style={styles.chartTitle}>🔄 Scoring Mode Split</h3>
                    <p style={styles.chartSub}>Individual vs batch scoring sessions</p>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={modeData} dataKey="value" nameKey="name"
                                cx="50%" cy="50%" outerRadius={80}
                                label={({ name, value }) => `${name}: ${value}`}>
                                {modeData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <h3 style={styles.chartTitle}>📋 Risk Summary Table</h3>
                    <p style={styles.chartSub}>Detailed count and percentage per tier</p>
                    <div className="table-responsive">
                        <table style={styles.summaryTable}>
                            <thead>
                                <tr style={{ background: '#1a237e' }}>
                                    <th style={styles.sth}>Risk Tier</th>
                                    <th style={styles.sth}>Count</th>
                                    <th style={styles.sth}>Percentage</th>
                                    <th style={styles.sth}>Recommendation</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { key: 'excellent', label: 'Excellent', rec: 'Approve' },
                                    { key: 'good', label: 'Good', rec: 'Approve Standard' },
                                    { key: 'fair', label: 'Fair', rec: 'Review' },
                                    { key: 'poor', label: 'Poor', rec: 'Conditional Decline' },
                                    { key: 'very_poor', label: 'Very Poor', rec: 'Decline' },
                                ].map(row => {
                                    const count = stats.tier_summary[row.key] || 0;
                                    const pct = stats.total_scored > 0
                                        ? ((count / stats.total_scored) * 100).toFixed(1)
                                        : '0.0';
                                    return (
                                        <tr key={row.key} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                            <td style={styles.std}>
                                                <span style={{ ...styles.dot, background: TIER_COLORS[row.key] }} />
                                                {row.label}
                                            </td>
                                            <td style={styles.std}>{count}</td>
                                            <td style={styles.std}>{pct}%</td>
                                            <td style={styles.std}>{row.rec}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KpiCard({ label, value, sub, color }) {
    return (
        <div className="card" style={{ borderTop: `4px solid ${color}`, textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
            <p style={styles.cardLabel}>{label}</p>
            <p style={{ ...styles.cardValue, color }}>{value}</p>
            <p style={styles.cardSub}>{sub}</p>
        </div>
    );
}

const styles = {
    container: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
    heading: { fontSize: '22px', fontWeight: '700', color: '#1a237e', marginBottom: '24px' },
    cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' },
    cardLabel: { fontSize: '11px', color: '#888', margin: '0 0 6px 0', textTransform: 'uppercase', fontWeight: '600' },
    cardValue: { fontSize: '28px', fontWeight: '800', color: '#1a237e', margin: '0 0 4px 0' },
    cardSub: { fontSize: '11px', color: '#aaa', margin: '0' },
    chartRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px', marginBottom: '16px' },
    chartTitle: { fontSize: '15px', fontWeight: '700', color: '#1a237e', margin: '0 0 4px 0' },
    chartSub: { fontSize: '12px', color: '#888', margin: '0 0 16px 0' },
    summaryTable: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
    sth: { padding: '10px 12px', color: '#fff', fontSize: '12px', fontWeight: '600', textAlign: 'left' },
    std: { padding: '10px 12px', color: '#333', verticalAlign: 'middle' },
    dot: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', marginRight: '8px' },
    retryBtn: {
        padding: '10px 24px', background: '#1a237e', color: '#fff',
        border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
    },
};