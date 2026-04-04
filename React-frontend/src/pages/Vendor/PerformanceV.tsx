import { useEffect, useState } from 'react';
import api from '../../lib/api';

type Rating = {
    id: number;
    project_id: number | null;
    project_name: string;
    rating: number;
    feedback: string;
    rated_by_name: string;
    rated_at: string;
};

function Stars({ value, max = 5 }: { value: number; max?: number }) {
    return (
        <div className="flex gap-0.5">
            {Array.from({ length: max }).map((_, i) => (
                <svg
                    key={i}
                    className="w-4 h-4"
                    fill={i < Math.round(value) ? '#F59E0B' : 'none'}
                    stroke="#F59E0B"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
            ))}
        </div>
    );
}

function RatingBar({ value, max = 5, count }: { value: number; max?: number; count: number }) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="text-sm font-bold font-gantari text-[#353535] w-6 text-right">{value}</span>
            <div className="flex-1 h-2 bg-[#F2F2F2] rounded-full overflow-hidden">
                <div className="h-full bg-[#F59E0B] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-[#717171] font-gantari w-6">{count}</span>
        </div>
    );
}

export default function PerformanceV() {
    const [loading, setLoading] = useState(true);
    const [avgRating, setAvgRating] = useState(0);
    const [total, setTotal] = useState(0);
    const [ratings, setRatings] = useState<Rating[]>([]);

    useEffect(() => {
        api.get<{ avg_rating: number; total_ratings: number; ratings: Rating[] }>('/api/vendors/performance')
            .then(({ data }) => {
                setAvgRating(data.avg_rating || 0);
                setTotal(data.total_ratings || 0);
                setRatings(data.ratings ?? []);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    // Distribution counts
    const dist = [5, 4, 3, 2, 1].map(star => ({ star, count: ratings.filter(r => Math.round(r.rating) === star).length }));

    if (loading) return (
        <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DE3D3A]" />
        </div>
    );

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-5 shrink-0">
                <div>
                    <h1 className="text-[24px] font-medium font-gantari text-[#000000]">Performance & Ratings</h1>

                </div>
                <span className="text-[12px] font-semibold font-gantari text-[#717171] bg-[#F2F2F2] px-3 py-1.5 rounded-full">Phase 1 — Read Only</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 pb-4">

                {/* Summary card */}
                <div className="bg-white border border-[#EBEBEB] rounded-xl p-6">
                    {total === 0 ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-2xl bg-[#F8F8F8] flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-[#AEACAC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                            </div>
                            <p className="text-[18px] font-semibold font-gantari text-[#000000] mb-1">No ratings yet</p>
                            <p className="text-[14px] text-[#353535] font-gantari">Your performance ratings will appear here after project completion reviews.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Big rating display */}
                            <div className="flex flex-col items-center justify-center text-center">
                                <p className="text-6xl font-bold text-[#353535] font-gantari mb-2">{avgRating.toFixed(1)}</p>
                                <Stars value={avgRating} />
                                <p className="text-sm text-[#717171] font-gantari mt-2">Based on {total} review{total !== 1 ? 's' : ''}</p>
                            </div>
                            {/* Distribution bars */}
                            <div className="flex flex-col justify-center gap-2">
                                {dist.map(({ star, count }) => (
                                    <RatingBar key={star} value={star} count={count} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Ratings list */}
                {ratings.length > 0 && (
                    <div className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-[#F0F0F0] bg-[#FAFAFA]">
                            <h3 className="text-sm font-bold font-gantari text-[#353535]">Individual Reviews</h3>
                        </div>
                        <div className="divide-y divide-[#F8F8F8]">
                            {ratings.map(r => (
                                <div key={r.id} className="px-5 py-4">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                        <div>
                                            <p className="text-sm font-bold font-gantari text-[#353535]">{r.project_name || 'General Review'}</p>
                                            <p className="text-xs text-[#717171] font-gantari mt-0.5">
                                                Rated by <span className="font-semibold text-[#353535]">{r.rated_by_name}</span> · {r.rated_at ? new Date(r.rated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                                            </p>
                                        </div>
                                        <div className="shrink-0">
                                            <Stars value={r.rating} />
                                            <p className="text-xs text-[#717171] font-gantari text-right mt-0.5">{r.rating} / 5</p>
                                        </div>
                                    </div>
                                    {r.feedback && (
                                        <p className="text-sm text-[#717171] font-gantari bg-[#F8F8F8] rounded-lg px-4 py-3 leading-relaxed">
                                            "{r.feedback}"
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
