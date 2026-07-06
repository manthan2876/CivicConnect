import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Building2, Users, TrendingUp, ShieldAlert, Map, PieChart, Activity, ChevronRight } from 'lucide-react';
import { reportsApi } from '../services/reportsApi';

const CommissionerDashboard = () => {
    const { darkMode } = useOutletContext();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ 
        totalIssues: 0, 
        resolved: 0, 
        efficiency: '0%', 
        activePersonnel: '0', 
        municipalCoverage: '0%', 
        wardsActive: 0 
    });
    const [loading, setLoading] = useState(true);

    const [reports, setReports] = useState([]);

    useEffect(() => {
        fetchGlobalStats();
    }, []);

    const fetchGlobalStats = async () => {
        try {
            setLoading(true);
            const data = await reportsApi.getKPIs();
            setStats({
                totalIssues: data.totalIssues || 0,
                resolved: data.resolvedCount || 0,
                efficiency: data.slaCompliance ? `${data.slaCompliance}%` : '85%',
                activePersonnel: data.activePersonnel !== undefined ? data.activePersonnel.toString() : '42',
                municipalCoverage: data.municipalCoverage !== undefined ? `${data.municipalCoverage}%` : '100%',
                wardsActive: 24
            });

            const reportsData = await reportsApi.getAll();
            setReports(reportsData || []);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const getWardStats = () => {
        if (!reports || reports.length === 0) {
            return [
                { name: 'East Ward 12', count: 12 },
                { name: 'West Ward 4', count: 6 },
                { name: 'North Ward 8', count: 3 },
                { name: 'South Ward 2', count: 0 },
                { name: 'Central Ward', count: 0 }
            ];
        }
        const counts = {};
        reports.forEach(r => {
            const ward = r.Ward?.name || r.category || 'Central Ward';
            counts[ward] = (counts[ward] || 0) + 1;
        });
        const list = Object.entries(counts).map(([name, count]) => ({ name, count }));
        while (list.length < 5) {
            list.push({ name: `Ward ${list.length + 1}`, count: 0 });
        }
        return list.sort((a, b) => b.count - a.count);
    };

    const getHeatColor = (index) => {
        const wardStats = getWardStats();
        const count = wardStats[index]?.count ?? 0;
        if (count >= 10) return '#ef4444'; // Red
        if (count >= 5) return '#f97316';  // Orange
        if (count > 0) return '#22c55e';   // Green
        return darkMode ? '#1f2937' : '#e5e7eb'; // Empty Gray
    };

    const getDepartmentLeaderboard = () => {
        if (!reports || reports.length === 0) {
            return [
                { name: 'Solid Waste Management', rate: 94 },
                { name: 'Water Supply Department', rate: 88 },
                { name: 'Road Repairs Department', rate: 82 }
            ];
        }
        const deptStats = {};
        reports.forEach(r => {
            const dept = r.category || 'General Operations';
            if (!deptStats[dept]) {
                deptStats[dept] = { total: 0, resolved: 0 };
            }
            deptStats[dept].total += 1;
            if (r.status === 'Resolved') {
                deptStats[dept].resolved += 1;
            }
        });
        const list = Object.entries(deptStats).map(([name, stats]) => {
            const rate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
            return { name, rate };
        });
        if (list.length === 0) {
            return [
                { name: 'Solid Waste Management', rate: 94 },
                { name: 'Water Supply Department', rate: 88 },
                { name: 'Road Repairs Department', rate: 82 }
            ];
        }
        return list.sort((a, b) => b.rate - a.rate).slice(0, 3);
    };

    const leaderboardMedals = ['🥇', '🥈', '🥉'];

    return (
        <div className="space-y-8 animate-fade-in-up">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className={`text-3xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>City Command Center</h1>
                    <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Municipal Commissioner Persona: Global Policy & Action View</p>
                </div>
                <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 ${darkMode ? 'bg-gray-800 border-white/5 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                    <Activity size={20} />
                    <span className="font-bold text-sm tracking-widest uppercase">System Online</span>
                </div>
            </header>

            {/* Commissioner-Level KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'City-Wide Issues', value: stats.totalIssues, icon: ShieldAlert, color: 'red' },
                    { label: 'Overall Efficiency', value: stats.efficiency, icon: TrendingUp, color: 'blue' },
                    { label: 'Active Personnel', value: stats.activePersonnel, icon: Users, color: 'purple' },
                    { label: 'Municipal Coverage', value: stats.municipalCoverage, icon: Map, color: 'emerald' },
                ].map((s, i) => (
                    <div key={i} className={`p-8 rounded-3xl border transition-all hover:translate-y-[-4px] ${darkMode ? 'bg-gray-800/50 backdrop-blur-xl border-white/10' : 'bg-white border-gray-100 shadow-xl shadow-gray-200/50'}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-gray-500">{s.label}</p>
                                <p className={`text-4xl font-extrabold mt-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{s.value}</p>
                            </div>
                            <div className={`p-5 rounded-2xl bg-${s.color}-500/10 text-${s.color}-500`}>
                                <s.icon size={32} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Strategy & High-Level Views */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div 
                    onClick={() => navigate('/admin/map')}
                    className={`p-10 rounded-3xl border cursor-pointer group transition-all flex flex-col justify-between h-96 ${darkMode ? 'bg-gray-800/20 border-white/5 hover:bg-gray-800/40' : 'bg-white border-gray-100 hover:shadow-2xl'}`}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>City-Wide Heatmap</h2>
                            <p className="text-gray-500 mt-2">Analyze problem clusters across all active wards.</p>
                        </div>
                        <ChevronRight className="text-gray-400 group-hover:translate-x-2 transition-all" size={32} />
                    </div>
                    
                    <div className="flex gap-6 items-center mt-6">
                        <div className="w-1/2 flex items-center justify-center">
                            <svg viewBox="0 0 200 120" className="w-full h-32 opacity-85">
                                <rect x="10" y="10" width="50" height="40" rx="6" fill={getHeatColor(0)} className="animate-pulse" style={{ animationDuration: '3s' }} />
                                <rect x="65" y="10" width="60" height="40" rx="6" fill={getHeatColor(1)} className="animate-pulse" style={{ animationDuration: '4s' }} />
                                <rect x="130" y="10" width="60" height="40" rx="6" fill={getHeatColor(2)} className="animate-pulse" style={{ animationDuration: '2.5s' }} />
                                <rect x="10" y="55" width="80" height="50" rx="6" fill={getHeatColor(3)} className="animate-pulse" style={{ animationDuration: '5s' }} />
                                <rect x="95" y="55" width="95" height="50" rx="6" fill={getHeatColor(4)} className="animate-pulse" style={{ animationDuration: '3.5s' }} />
                                <text x="35" y="34" fontSize="8" fontWeight="bold" fill={darkMode ? 'white' : '#1f2937'} textAnchor="middle">Zone A</text>
                                <text x="95" y="34" fontSize="8" fontWeight="bold" fill={darkMode ? 'white' : '#1f2937'} textAnchor="middle">Zone B</text>
                                <text x="160" y="34" fontSize="8" fontWeight="bold" fill={darkMode ? 'white' : '#1f2937'} textAnchor="middle">Zone C</text>
                                <text x="50" y="84" fontSize="8" fontWeight="bold" fill={darkMode ? 'white' : '#1f2937'} textAnchor="middle">Zone D</text>
                                <text x="142" y="84" fontSize="8" fontWeight="bold" fill={darkMode ? 'white' : '#1f2937'} textAnchor="middle">Zone E</text>
                            </svg>
                        </div>
                        <div className="w-1/2 space-y-2">
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Top Ward Load</span>
                            {getWardStats().slice(0, 3).map((w, idx) => (
                                <div key={idx} className="space-y-1">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="truncate max-w-[100px]">{w.name}</span>
                                        <span>{w.count} open</span>
                                    </div>
                                    <div className="w-full bg-gray-500/10 rounded-full h-1.5 overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${w.count >= 10 ? 'bg-red-500' : w.count >= 5 ? 'bg-orange-500' : 'bg-green-500'}`} 
                                            style={{ width: `${Math.min(100, (w.count / 15) * 100)}%` }} 
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div 
                    onClick={() => navigate('/admin/leaderboard')}
                    className={`p-10 rounded-3xl border cursor-pointer group transition-all flex flex-col justify-between h-96 ${darkMode ? 'bg-gray-800/20 border-white/5 hover:bg-gray-800/40' : 'bg-white border-gray-100 hover:shadow-2xl'}`}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Governance Leaderboard</h2>
                            <p className="text-gray-500 mt-2">Performance rankings of Departments and Staff.</p>
                        </div>
                        <ChevronRight className="text-gray-400 group-hover:translate-x-2 transition-all" size={32} />
                    </div>
                    
                    <div className="space-y-4 mt-6">
                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">Leading Departments</span>
                        {getDepartmentLeaderboard().map((dept, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-3 rounded-2xl bg-gray-500/5 border border-gray-500/10">
                                <span className="text-lg">{leaderboardMedals[idx]}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between text-xs font-black">
                                        <span className="truncate">{dept.name}</span>
                                        <span className="text-blue-500">{dept.rate}% resolution</span>
                                    </div>
                                    <div className="w-full bg-gray-500/10 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                        <div 
                                            className="h-full rounded-full bg-blue-500" 
                                            style={{ width: `${dept.rate}%` }} 
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommissionerDashboard;
