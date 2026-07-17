import React, { useState } from 'react';
import { scoreIndividual } from '../services/api';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

const TIER_COLORS = {
    excellent: '#2e7d32', good: '#558b2f',
    fair: '#f9a825', poor: '#e65100', very_poor: '#b71c1c',
};

const TIER_EXPLANATIONS = {
    excellent: 'This applicant demonstrates outstanding mobile money behaviour. Consistent high-frequency transactions, strong savings culture, and reliable bill payments indicate very low credit risk.',
    good: 'This applicant shows good financial behaviour with regular mobile money activity and acceptable savings patterns. Minor areas for improvement exist but overall risk is manageable.',
    fair: 'This applicant shows moderate mobile money activity. Some inconsistencies in savings or bill payments were noted. A closer review is recommended before approving credit.',
    poor: 'This applicant shows weak mobile money behaviour with irregular transactions and limited savings. Credit approval is not recommended without additional collateral or guarantees.',
    very_poor: 'This applicant demonstrates very poor mobile money behaviour. Extremely low transaction activity and no savings history indicate very high credit risk. Loan application should be declined.',
};

const INDICATOR_EXPLANATIONS = {
    txn_frequency_score: {
        label: 'Transaction Frequency', max: 25,
        explain: (score) => score >= 15
            ? 'High transaction frequency indicates active mobile money usage and financial engagement.'
            : score >= 8
            ? 'Moderate transaction frequency. The applicant uses mobile money but not consistently.'
            : 'Low transaction frequency suggests minimal mobile money engagement, which is a risk indicator.',
    },
    avg_txn_value_score: {
        label: 'Average Transaction Value', max: 20,
        explain: (score) => score >= 12
            ? 'High average transaction values suggest the applicant handles significant amounts of money regularly.'
            : score >= 6
            ? 'Moderate transaction values. The applicant conducts everyday transactions but amounts are limited.'
            : 'Low average transaction values indicate limited financial capacity or activity.',
    },
    savings_score: {
        label: 'Savings Consistency', max: 20,
        explain: (score) => score >= 12
            ? 'Strong savings behaviour observed across most months. This is a very positive credit indicator.'
            : score >= 5
            ? 'Some savings activity detected but not consistent across all months.'
            : 'No or very limited savings behaviour detected. This significantly increases credit risk.',
    },
    bill_payment_score: {
        label: 'Bill Payment Regularity', max: 15,
        explain: (score) => score >= 9
            ? 'Regular bill payments demonstrate financial discipline and responsibility.'
            : score >= 4
            ? 'Occasional bill payments observed but regularity needs improvement.'
            : 'No consistent bill payment history found. This is a negative credit indicator.',
    },
    network_diversity_score: {
        label: 'Network Diversity', max: 10,
        explain: (score) => score >= 6
            ? 'Wide network of transaction counterparties indicates active social and business engagement.'
            : score >= 3
            ? 'Moderate network diversity. The applicant transacts with a limited set of counterparties.'
            : 'Very limited transaction network, suggesting low financial activity or social isolation.',
    },
    account_age_score: {
        label: 'Account Age', max: 10,
        explain: (score) => score >= 6
            ? 'Long account history provides strong evidence of sustained mobile money engagement.'
            : score >= 3
            ? 'Moderate account age. The applicant has some history but is relatively new to mobile money.'
            : 'Very new account with limited history. Insufficient data to fully assess creditworthiness.',
    },
};

function generatePDF(result) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFillColor(26, 35, 126);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('MMCSS - Credit Score Report', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Mobile Money Credit Scoring System | University of Kigali', pageWidth / 2, 30, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 37, { align: 'center' });

    y = 55;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Applicant Information', 14, y); y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${result.applicant_name}`, 14, y); y += 6;
    doc.text(`Reference: ${result.applicant_ref}`, 14, y); y += 6;
    doc.text(`Scored By: ${result.scored_by_name}`, 14, y); y += 6;
    doc.text(`Date: ${new Date(result.scored_at).toLocaleDateString()}`, 14, y); y += 12;

    const tier = result.risk_tier;
    const colorMap = {
        excellent: [46, 125, 50], good: [85, 139, 47],
        fair: [249, 168, 37], poor: [230, 81, 0], very_poor: [183, 28, 28],
    };
    const [r, g, b] = colorMap[tier] || [100, 100, 100];
    doc.setFillColor(r, g, b);
    doc.rect(14, y, pageWidth - 28, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${result.risk_tier_display.toUpperCase()} — CSI Score: ${result.csi_total} / 100`, pageWidth / 2, y + 10, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Recommendation: ${result.recommendation_display}`, pageWidth / 2, y + 18, { align: 'center' });
    y += 30;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Overall Assessment', 14, y); y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const explanation = TIER_EXPLANATIONS[tier] || '';
    const splitExp = doc.splitTextToSize(explanation, pageWidth - 28);
    doc.text(splitExp, 14, y);
    y += splitExp.length * 6 + 8;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Score Breakdown by Indicator', 14, y); y += 8;

    const indicators = Object.keys(INDICATOR_EXPLANATIONS);
    indicators.forEach((key) => {
        const info = INDICATOR_EXPLANATIONS[key];
        const score = result[key];
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 35, 126);
        doc.text(`${info.label}: ${score} / ${info.max} pts`, 14, y); y += 6;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        const expText = doc.splitTextToSize(info.explain(score), pageWidth - 28);
        doc.text(expText, 14, y);
        y += expText.length * 5 + 6;
    });

    if (y > 260) { doc.addPage(); y = 20; }
    y += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('This report was generated by the Rule-Based Mobile Money Credit Scoring System (MMCSS).', 14, y); y += 5;
    doc.text('Researcher: Nziza Aime Octave | UOK BBIT 2026 | Confidential', 14, y);

    doc.save(`MMCSS_Report_${result.applicant_ref}_${Date.now()}.pdf`);
}

async function generateWord(result) {
    const tier = result.risk_tier;
    const explanation = TIER_EXPLANATIONS[tier] || '';
    const indicators = Object.keys(INDICATOR_EXPLANATIONS);

    const indicatorParagraphs = indicators.flatMap(key => {
        const info = INDICATOR_EXPLANATIONS[key];
        const score = result[key];
        return [
            new Paragraph({
                children: [new TextRun({ text: `${info.label}: ${score} / ${info.max} pts`, bold: true, color: '1a237e' })],
                spacing: { before: 200 },
            }),
            new Paragraph({
                children: [new TextRun({ text: info.explain(score), size: 20 })],
                spacing: { after: 100 },
            }),
        ];
    });

    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({ text: 'MMCSS — Credit Score Report', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
                new Paragraph({ children: [new TextRun({ text: 'Mobile Money Credit Scoring System | University of Kigali', italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
                new Paragraph({ text: 'Applicant Information', heading: HeadingLevel.HEADING_2 }),
                new Paragraph({ children: [new TextRun({ text: `Name: ${result.applicant_name}`, bold: true })] }),
                new Paragraph({ children: [new TextRun(`Reference: ${result.applicant_ref}`)] }),
                new Paragraph({ children: [new TextRun(`Scored By: ${result.scored_by_name}`)] }),
                new Paragraph({ children: [new TextRun(`Date: ${new Date(result.scored_at).toLocaleDateString()}`)] }),
                new Paragraph({ text: 'Credit Score Result', heading: HeadingLevel.HEADING_2, spacing: { before: 300 } }),
                new Paragraph({ children: [new TextRun({ text: `${result.risk_tier_display.toUpperCase()} — CSI Score: ${result.csi_total} / 100`, bold: true, size: 28 })] }),
                new Paragraph({ children: [new TextRun({ text: `Recommendation: ${result.recommendation_display}`, bold: true })], spacing: { after: 200 } }),
                new Paragraph({ text: 'Overall Assessment', heading: HeadingLevel.HEADING_2 }),
                new Paragraph({ children: [new TextRun(explanation)], spacing: { after: 200 } }),
                new Paragraph({ text: 'Score Breakdown by Indicator', heading: HeadingLevel.HEADING_2 }),
                ...indicatorParagraphs,
                new Paragraph({ spacing: { before: 400 } }),
                new Paragraph({ children: [new TextRun({ text: 'This report was generated by the Rule-Based Mobile Money Credit Scoring System (MMCSS).', italics: true, size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: 'Researcher: Nziza Aime Octave | UOK BBIT 2026 | Confidential', italics: true, size: 18 })] }),
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `MMCSS_Report_${result.applicant_ref}_${Date.now()}.docx`);
}

export default function ScoreIndividual({ addToast }) {
    const [form, setForm] = useState({
        applicant_ref: '', applicant_name: '', phone_number: '',
        gender: '', district: '', mobile_operator: 'mtn',
        account_age_months: '', notes: '',
    });
    const [file, setFile] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a transaction file.');
            if (addToast) addToast('Please select a transaction file.', 'warning');
            return;
        }
        if (!form.applicant_ref.trim() || !form.applicant_name.trim()) {
            setError('Applicant reference and name are required.');
            return;
        }
        setLoading(true);
        setError('');
        setResult(null);

        const formData = new FormData();
        Object.entries(form).forEach(([k, v]) => { if (v) formData.append(k, v); });
        formData.append('transaction_file', file);

        try {
            const res = await scoreIndividual(formData);
            setResult(res.data);
            setShowModal(true);
            if (addToast) addToast(`Scored ${res.data.applicant_name} — CSI: ${res.data.csi_total}`, 'success');
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.detail || 'Scoring failed. Check your file format.';
            setError(msg);
            if (addToast) addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.heading}>Score Individual Applicant</h2>

            <form onSubmit={handleSubmit} style={styles.form} noValidate>
                {error && (
                    <div style={styles.error} role="alert">
                        <span>❌</span> {error}
                    </div>
                )}
                <div style={styles.grid}>
                    <div style={styles.field}>
                        <label style={styles.label} htmlFor="si-ref">Applicant Reference *</label>
                        <input id="si-ref" style={styles.input} name="applicant_ref"
                            value={form.applicant_ref} onChange={handleChange}
                            placeholder="e.g. APP-001" required />
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label} htmlFor="si-name">Full Name *</label>
                        <input id="si-name" style={styles.input} name="applicant_name"
                            value={form.applicant_name} onChange={handleChange}
                            placeholder="e.g. Jean Baptiste" required />
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label} htmlFor="si-phone">Phone Number</label>
                        <input id="si-phone" style={styles.input} name="phone_number"
                            value={form.phone_number} onChange={handleChange}
                            placeholder="e.g. 0788000000" />
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label} htmlFor="si-gender">Gender</label>
                        <select id="si-gender" style={styles.input} name="gender"
                            value={form.gender} onChange={handleChange}>
                            <option value="">Select</option>
                            <option value="M">Male</option>
                            <option value="F">Female</option>
                            <option value="O">Other</option>
                        </select>
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label} htmlFor="si-district">District</label>
                        <input id="si-district" style={styles.input} name="district"
                            value={form.district} onChange={handleChange}
                            placeholder="e.g. Kigali" />
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label} htmlFor="si-operator">Mobile Operator</label>
                        <select id="si-operator" style={styles.input} name="mobile_operator"
                            value={form.mobile_operator} onChange={handleChange}>
                            <option value="mtn">MTN Mobile Money</option>
                            <option value="airtel">Airtel Money</option>
                            <option value="both">Both</option>
                        </select>
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label} htmlFor="si-age">Account Age (months) *</label>
                        <input id="si-age" style={styles.input} name="account_age_months"
                            type="number" min="0"
                            value={form.account_age_months} onChange={handleChange}
                            placeholder="e.g. 18" required />
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label} htmlFor="si-file">Transaction File (CSV/JSON) *</label>
                        <input id="si-file" style={styles.input} type="file"
                            accept=".csv,.json"
                            onChange={e => { setFile(e.target.files[0]); if (error) setError(''); }}
                            required />
                    </div>
                </div>
                <div style={styles.field}>
                    <label style={styles.label} htmlFor="si-notes">Notes</label>
                    <textarea id="si-notes" style={styles.textarea} name="notes"
                        value={form.notes} onChange={handleChange}
                        placeholder="Optional notes..." rows={3} />
                </div>
                <button style={loading ? styles.buttonDisabled : styles.button}
                    type="submit" disabled={loading} aria-busy={loading}>
                    {loading ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <span style={styles.spinner} /> Scoring...
                        </span>
                    ) : 'Compute Credit Score'}
                </button>
            </form>

            {/* Result Modal */}
            {showModal && result && (
                <div style={styles.overlay} onClick={() => setShowModal(false)} role="dialog" aria-modal="true">
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Credit Score Report</h3>
                            <button style={styles.closeBtn} onClick={() => setShowModal(false)}
                                aria-label="Close report">✕</button>
                        </div>

                        <p style={styles.applicantInfo}>
                            <strong>{result.applicant_name}</strong> &nbsp;|&nbsp; Ref: {result.applicant_ref} &nbsp;|&nbsp; {new Date(result.scored_at).toLocaleDateString()}
                        </p>

                        <div style={{ ...styles.tierBadge, background: TIER_COLORS[result.risk_tier] || '#888' }}>
                            {result.risk_tier_display} — CSI: {result.csi_total} / 100
                        </div>

                        <div style={styles.recBox}>
                            <span style={styles.recLabel}>Recommendation:</span>
                            <span style={styles.recValue}>{result.recommendation_display}</span>
                        </div>

                        <div style={styles.explanationBox}>
                            <p style={styles.explanationTitle}>📋 Overall Assessment</p>
                            <p style={styles.explanationText}>{TIER_EXPLANATIONS[result.risk_tier]}</p>
                        </div>

                        <p style={styles.breakdownTitle}>📊 Score Breakdown</p>
                        <div style={styles.scoreGrid}>
                            {Object.keys(INDICATOR_EXPLANATIONS).map(key => {
                                const info = INDICATOR_EXPLANATIONS[key];
                                const score = result[key];
                                return (
                                    <div key={key} style={styles.scoreItem}>
                                        <div style={styles.scoreTop}>
                                            <span style={styles.scoreLabel}>{info.label}</span>
                                            <span style={styles.scoreVal}>{score}/{info.max}</span>
                                        </div>
                                        <div style={styles.barBg}>
                                            <div style={{
                                                ...styles.barFill,
                                                width: `${(score / info.max) * 100}%`,
                                                background: TIER_COLORS[result.risk_tier] || '#1a237e',
                                            }} />
                                        </div>
                                        <p style={styles.indicatorExplain}>{info.explain(score)}</p>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={styles.downloadRow}>
                            <button style={styles.pdfBtn} onClick={() => generatePDF(result)}>
                                📄 Download PDF
                            </button>
                            <button style={styles.wordBtn} onClick={() => generateWord(result)}>
                                📝 Download Word
                            </button>
                        </div>

                        <button style={styles.closeButton} onClick={() => setShowModal(false)}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    container: { padding: '24px', maxWidth: '1000px', margin: '0 auto' },
    heading: { fontSize: '22px', fontWeight: '700', color: '#1a237e', marginBottom: '24px' },
    form: { background: '#fff', borderRadius: '10px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' },
    field: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '13px', fontWeight: '600', color: '#333' },
    input: { padding: '10px 14px', borderRadius: '8px', border: '2px solid #e0e0e0', fontSize: '14px', fontFamily: 'inherit', transition: 'border-color 0.2s' },
    textarea: { padding: '10px 14px', borderRadius: '8px', border: '2px solid #e0e0e0', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit' },
    button: { marginTop: '16px', padding: '14px 32px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    buttonDisabled: { marginTop: '16px', padding: '14px 32px', background: '#9e9e9e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    spinner: { width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' },
    error: { background: '#ffebee', color: '#c62828', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' },
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
    modal: { background: '#fff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: 'fadeIn 0.3s ease' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
    modalTitle: { fontSize: '20px', fontWeight: '700', color: '#1a237e', margin: 0 },
    closeBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888', padding: '4px' },
    applicantInfo: { fontSize: '13px', color: '#666', marginBottom: '16px' },
    tierBadge: { color: '#fff', padding: '16px', borderRadius: '10px', fontSize: '22px', fontWeight: '800', textAlign: 'center', marginBottom: '12px', textTransform: 'uppercase' },
    recBox: { display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px', alignItems: 'center' },
    recLabel: { fontSize: '14px', color: '#555' },
    recValue: { fontSize: '15px', fontWeight: '700', color: '#1a237e' },
    explanationBox: { background: '#e8eaf6', borderRadius: '10px', padding: '16px', marginBottom: '20px' },
    explanationTitle: { fontSize: '14px', fontWeight: '700', color: '#1a237e', margin: '0 0 8px 0' },
    explanationText: { fontSize: '13px', color: '#333', margin: 0, lineHeight: '1.6' },
    breakdownTitle: { fontSize: '15px', fontWeight: '700', color: '#333', marginBottom: '12px' },
    scoreGrid: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' },
    scoreItem: { background: '#f9f9f9', borderRadius: '8px', padding: '12px' },
    scoreTop: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
    scoreLabel: { fontSize: '13px', fontWeight: '600', color: '#333' },
    scoreVal: { fontSize: '13px', fontWeight: '700', color: '#1a237e' },
    barBg: { background: '#e0e0e0', borderRadius: '4px', height: '6px', marginBottom: '8px' },
    barFill: { height: '6px', borderRadius: '4px', transition: 'width 0.5s ease' },
    indicatorExplain: { fontSize: '12px', color: '#666', margin: 0, lineHeight: '1.5' },
    downloadRow: { display: 'flex', gap: '12px', marginBottom: '12px' },
    pdfBtn: { flex: 1, padding: '12px', background: '#b71c1c', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    wordBtn: { flex: 1, padding: '12px', background: '#1565c0', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    closeButton: { width: '100%', padding: '12px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
};