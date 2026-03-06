import { useEffect, useState, useRef } from 'react';
import api from '../../lib/api';

type MilestoneStatus = 'not_started' | 'submitted' | 'approved' | 'invoiced' | 'paid';

type Invoice = {
    id: number;
    file_url: string;
    submitted_at: string;
    status: MilestoneStatus;
};

type Milestone = {
    id: number;
    milestone_name: string;
    milestone_amount: number;
    due_date: string;
    notes?: string;
    paid?: number;
    project_name?: string;
    invoice: Invoice | null;
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    paid: { label: 'Paid', bg: '#E8F9E8', text: '#16A34A' },
    invoiced: { label: 'Invoiced', bg: '#EFF6FF', text: '#1565C0' },
    approved: { label: 'Approved', bg: '#F0FDF4', text: '#15803D' },
    submitted: { label: 'Submitted', bg: '#FFF3E0', text: '#E65100' },
    not_started: { label: 'Not Started', bg: '#F2F2F2', text: '#717171' },
};

function getMilestoneStatus(m: Milestone): string {
    if (m.paid) return 'paid';
    if (m.invoice) {
        if (m.invoice.status === 'paid') return 'paid';
        if (m.invoice.status === 'approved') return 'approved';
        return 'submitted';
    }
    return 'not_started';
}

function formatAmount(amt?: number) {
    if (!amt) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
}

export default function MilestonesV() {
    const [loading, setLoading] = useState(true);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [uploading, setUploading] = useState<number | null>(null);
    const [successId, setSuccessId] = useState<number | null>(null);
    const [error, setError] = useState('');
    const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

    useEffect(() => {
        api.get<{ milestones: Milestone[] }>('/api/vendors/milestones')
            .then(({ data }) => setMilestones(data.milestones ?? []))
            .catch(() => setMilestones([]))
            .finally(() => setLoading(false));
    }, []);

    const handleInvoiceUpload = async (milestoneId: number, file: File) => {
        setUploading(milestoneId);
        setError('');
        const fd = new FormData();
        fd.append('file', file);
        try {
            const { data } = await api.post<{ success: boolean; file_url: string }>(
                `/api/vendors/milestones/${milestoneId}/submit-invoice`, fd,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            if (data.success) {
                setMilestones(prev => prev.map(m =>
                    m.id === milestoneId
                        ? { ...m, invoice: { id: 0, file_url: data.file_url, submitted_at: new Date().toISOString(), status: 'submitted' } }
                        : m
                ));
                setSuccessId(milestoneId);
                setTimeout(() => setSuccessId(null), 3000);
            }
        } catch { setError('Invoice upload failed. Please try again.'); }
        finally {
            setUploading(null);
            const ref = fileRefs.current[milestoneId];
            if (ref) ref.value = '';
        }
    };

    // Group by project
    const grouped: Record<string, Milestone[]> = {};
    for (const m of milestones) {
        const key = m.project_name || 'General';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(m);
    }

    const totalAmount = milestones.reduce((s, m) => s + (m.milestone_amount || 0), 0);
    const paidAmount = milestones.filter(m => getMilestoneStatus(m) === 'paid').reduce((s, m) => s + (m.milestone_amount || 0), 0);
    const pendingCount = milestones.filter(m => getMilestoneStatus(m) === 'not_started').length;

    if (loading) return (
        <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DE3D3A]" />
        </div>
    );

    return (
        <div className="h-full flex flex-col">
            <h1 className="text-xl font-medium font-gantari text-slate-800 mb-5 shrink-0">Payments & Milestones</h1>

            {/* KPI strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5 shrink-0">
                {[
                    { label: 'Total Milestones', value: milestones.length, color: '#353535' },
                    { label: 'Total Amount', value: formatAmount(totalAmount), color: '#353535' },
                    { label: 'Paid', value: formatAmount(paidAmount), color: '#16A34A' },
                    { label: 'Pending', value: `${pendingCount} milestone${pendingCount !== 1 ? 's' : ''}`, color: '#E65100' },
                ].map((k, i) => (
                    <div key={i} className="bg-white border border-[#EBEBEB] rounded-xl px-4 py-3">
                        <p className="text-[11px] text-[#717171] font-gantari font-medium mb-1">{k.label}</p>
                        <p className="text-lg font-bold font-gantari" style={{ color: k.color }}>{k.value}</p>
                    </div>
                ))}
            </div>

            {error && <div className="mb-3 p-3 bg-[#FFE5E5] rounded-xl text-sm font-gantari text-[#DE3D3A] shrink-0">{error}</div>}

            {/* Milestone table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {milestones.length === 0 ? (
                    <div className="bg-white rounded-2xl p-16 text-center border border-[#EBEBEB]">
                        <p className="text-lg font-semibold font-gantari text-[#353535] mb-2">No milestones yet</p>
                        <p className="text-sm font-gantari text-[#717171]">Milestones will appear here once assigned to your projects.</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {Object.entries(grouped).map(([projectName, items]) => (
                            <div key={projectName} className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden">
                                <div className="px-5 py-3 border-b border-[#F0F0F0] bg-[#FAFAFA]">
                                    <h3 className="text-sm font-bold font-gantari text-[#353535]">{projectName}</h3>
                                </div>
                                <div className="divide-y divide-[#F8F8F8]">
                                    {items.map(m => {
                                        const status = getMilestoneStatus(m);
                                        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
                                        const canUpload = !m.invoice && status === 'not_started';
                                        const isUploading = uploading === m.id;
                                        const isSuccess = successId === m.id;

                                        return (
                                            <div key={m.id} className="px-5 py-4 flex flex-wrap gap-4 items-center">
                                                <div className="flex-1 min-w-[140px]">
                                                    <p className="text-sm font-bold font-gantari text-[#353535]">{m.milestone_name}</p>
                                                    {m.notes && <p className="text-xs text-[#717171] font-gantari mt-0.5 truncate max-w-xs">{m.notes}</p>}
                                                </div>
                                                <div className="text-right min-w-[100px]">
                                                    <p className="text-sm font-bold font-gantari text-[#353535]">{formatAmount(m.milestone_amount)}</p>
                                                    <p className="text-xs text-[#717171] font-gantari">{m.due_date ? `Due ${new Date(m.due_date).toLocaleDateString()}` : ''}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: cfg.bg, color: cfg.text }}>
                                                        {cfg.label}
                                                    </span>
                                                </div>
                                                <div className="min-w-[140px] text-right">
                                                    {isSuccess && <span className="text-[12px] text-[#16A34A] font-semibold font-gantari">✅ Invoice submitted</span>}
                                                    {m.invoice && !isSuccess && (
                                                        <a href={m.invoice.file_url} target="_blank" rel="noreferrer" className="text-[12px] text-[#3B82F6] font-semibold font-gantari hover:underline">
                                                            View Invoice ↗
                                                        </a>
                                                    )}
                                                    {canUpload && (
                                                        <label className="cursor-pointer">
                                                            <span className="text-[12px] font-bold font-gantari text-white bg-[#DE3D3A] px-3 py-1.5 rounded-lg hover:bg-[#c93d3d] transition-colors">
                                                                {isUploading ? 'Uploading…' : 'Upload Invoice'}
                                                            </span>
                                                            <input
                                                                type="file"
                                                                accept=".pdf,.png,.jpg,.jpeg"
                                                                className="hidden"
                                                                disabled={isUploading}
                                                                ref={el => { fileRefs.current[m.id] = el; }}
                                                                onChange={e => {
                                                                    const f = e.target.files?.[0];
                                                                    if (f) handleInvoiceUpload(m.id, f);
                                                                }}
                                                            />
                                                        </label>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
