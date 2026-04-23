import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../lib/api';

interface EmployeeDetailType {
    id: number;
    full_name?: string;
    email?: string;
    empid?: string;
    phone_number?: string;
    user_role?: string;
    department?: string;
    address?: string;
    doj?: string;
    dob?: string;
    active?: string;
    profile_picture?: string;
}

import { getGlobalProfileUrl } from '../../lib/profileHelpers';

export default function ConsultantdetailsV() {
    const { id } = useParams<{ id: string }>();
    const [emp, setEmp] = useState<EmployeeDetailType | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        api.get<EmployeeDetailType>(`/api/employees/${id}`).then(({ data }) => setEmp(data)).catch(() => setEmp(null)).finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>;
    if (!emp) return <div className="text-center py-12 text-slate-500">Consultant not found. <Link to="/v/consultants" className="text-[#3d3399] hover:underline">Back to Consultants</Link></div>;

    const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-');

    return (
        <div className="space-y-4">
            <Link to="/v/consultants" className="text-[#3d3399] hover:underline text-sm font-medium">&larr; Back to Consultants</Link>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-[#3d3399]/20 flex items-center justify-center text-xl font-semibold text-[#3d3399] overflow-hidden">
                            {emp.profile_picture ? (
                                <img 
                                    src={getGlobalProfileUrl(emp.id, emp.profile_picture, "vendor")} 
                                    alt={emp.full_name} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.innerHTML = emp.full_name?.charAt(0).toUpperCase() || '?';
                                    }}
                                />
                            ) : (
                                (emp.full_name || '?').charAt(0).toUpperCase()
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-slate-800">{emp.full_name ?? 'Consultant'}</h2>
                            <p className="text-slate-500">{emp.email}</p>
                            <span className={`inline-flex mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${emp.active === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{emp.active || 'inactive'}</span>
                        </div>
                    </div>
                    <Link to={`/v/consultants?edit=${emp.id}`} className="px-4 py-2 rounded-lg border border-[#3d3399] text-[#3d3399] font-medium hover:bg-[#3d3399]/10">Edit</Link>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div><dt className="text-slate-500">Employee ID</dt><dd className="font-medium text-slate-800">{emp.empid ?? '-'}</dd></div>
                    <div><dt className="text-slate-500">Role</dt><dd className="font-medium text-slate-800">{emp.user_role ?? '-'}</dd></div>
                    <div><dt className="text-slate-500">Phone</dt><dd className="font-medium text-slate-800">{emp.phone_number ?? '-'}</dd></div>
                    <div><dt className="text-slate-500">Department</dt><dd className="font-medium text-slate-800">{emp.department ?? '-'}</dd></div>
                    <div><dt className="text-slate-500">Date of Joining</dt><dd className="font-medium text-slate-800">{formatDate(emp.doj)}</dd></div>
                    <div><dt className="text-slate-500">Date of Birth</dt><dd className="font-medium text-slate-800">{formatDate(emp.dob)}</dd></div>
                    {emp.address && <div className="sm:col-span-2"><dt className="text-slate-500">Address</dt><dd className="font-medium text-slate-800">{emp.address}</dd></div>}
                </dl>
            </div>
        </div>
    );
}
