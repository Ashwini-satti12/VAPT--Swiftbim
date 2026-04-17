import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../lib/api';
import backIcon from '../../assets/TechnicalDirector/back icon.svg';

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

export default function ConsultantdetailsTD() {
    const { id } = useParams<{ id: string }>();
    const [emp, setEmp] = useState<EmployeeDetailType | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        api.get<EmployeeDetailType>(`/api/employees/${id}`).then(({ data }) => setEmp(data)).catch(() => setEmp(null)).finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>;
    if (!emp) return <div className="text-center py-12 text-slate-500">Consultant not found. <Link to="/td/consultants" className="text-[#3d3399] hover:underline">Back to Consultants</Link></div>;

    const formatDate = (d?: string) => {
        if (!d) return '-';
        const date = new Date(d);
        if (isNaN(date.getTime())) return d;
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
    };


    return (
        <div className="space-y-4">
            <Link to="/td/consultants" className="w-fit p-2 bg-[#F2F2F2] rounded-md text-[#3d3399] hover:underline text-[14px] flex items-center gap-2 font-medium">
                <img src={backIcon} alt="Back" className="w-5 h-5 translate-y-[1px]" />
            </Link>
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-6">
                        <div className="w-[85px] h-[85px] rounded-full bg-[#3d3399]/20 flex items-center justify-center text-3xl font-semibold text-[#3d3399] overflow-hidden shadow-sm">
                            {emp.profile_picture ? (
                                <img
                                    src={getGlobalProfileUrl(emp.id, emp.profile_picture)}
                                    alt={emp.full_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        if (target.parentElement) {
                                            target.parentElement.innerHTML = emp.full_name?.charAt(0).toUpperCase() || '?';
                                        }
                                    }}
                                />
                            ) : (
                                (emp.full_name || '?').charAt(0).toUpperCase()
                            )}
                        </div>
                        <div className="flex flex-col gap-1">
                            <h2 className="text-[20px] font-bold text-slate-800 font-Gantari">{emp.full_name ? emp.full_name.toUpperCase() : 'Consultant'}</h2>
                            <p className="text-[16px] text-[#8B8B8B] font-gantari font-medium">{emp.email}</p>
                            <span className={`inline-flex mt-1 px-3 py-1 text-[12px] font-semibold rounded-full w-fit ${emp.active === 'active' ? 'bg-[#E0FFE8] text-[#008F22]' : 'bg-[#FFEEEE] text-[#E00100]'}`}>
                                {emp.active || 'inactive'}
                            </span>
                        </div>
                    </div>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-6 mt-10">
                    {[
                        { label: 'Employee ID', value: emp.empid ?? '-' },
                        { label: 'Role', value: emp.user_role ?? '-' },
                        { label: 'Phone', value: emp.phone_number ?? '-' },
                        { label: 'Department', value: emp.department ?? '-' },
                        { label: 'Date of Joining', value: formatDate(emp.doj) },
                        
                        { label: 'Date of Birth', value: formatDate(emp.dob) },
                    ].map((item, idx) => (
                        <div key={idx} className="grid grid-cols-[140px_15px_1fr] items-center">
                            <span className="text-[14px] text-[#616161] font-gantari font-medium">{item.label}</span>
                            <span className="text-[14px] text-[#616161] font-gantari font-medium">:</span>
                            <span className="text-[14px] font-bold text-[#353535] font-gantari">{item.value}</span>
                        </div>
                    ))}
                    {emp.address && (
                        <div className="md:col-span-2 grid grid-cols-[140px_15px_1fr] items-start">
                            <span className="text-[14px] text-[#616161] font-Gantari font-medium">Address</span>
                            <span className="text-[14px] text-[#616161] font-Gantari font-medium">:</span>
                            <span className="text-[14px] font-bold text-[#353535] font-Gantari leading-relaxed">{emp.address}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
