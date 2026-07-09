import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { TrendingUp, CheckCircle, Clock, AlertCircle, MapPin, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { reportsApi } from '../services/reportsApi';


const AuthorityDashboard = () => {
    const { darkMode } = useOutletContext();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [issues, setIssues] = useState([]);
    const [kpis, setKpis] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const params = {};
        if (user?.ward_id) {
            params.ward_id = user.ward_id;
        }
        if (user?.department_id) {
            params.department_id = user.department_id;
        }

        Promise.all([
            reportsApi.getAll(params),
            reportsApi.getKPIs(params)
        ])
            .then(([issuesData, kpiData]) => {
                setIssues(issuesData);
                setKpis(kpiData);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching authority data:', err);
                setLoading(false);
            });
    }, [user?.id, user?.ward_id, user?.department_id]);


    const stats = kpis ? [
        { title: 'SLA Compliance', value: `${kpis.slaCompliance || 0}%`, percentage: kpis.slaCompliance || 0, color: 'green', icon: CheckCircle },
        { title: 'Avg Satisfaction', value: `${kpis.satisfactionScore || 0}/5`, percentage: Math.round((kpis.satisfactionScore || 0) * 20), color: 'blue', icon: TrendingUp },
        { title: 'Total Tasks', value: kpis.totalIssues || 0, percentage: kpis.totalIssues > 0 ? Math.round((kpis.resolvedCount / kpis.totalIssues) * 100) : 0, color: 'yellow', icon: Clock },
    ] : [
        { title: 'SLA Compliance', value: '...', percentage: 0, color: 'green', icon: CheckCircle },
        { title: 'Avg Satisfaction', value: '...', percentage: 0, color: 'blue', icon: TrendingUp },
        { title: 'Total Tasks', value: '...', percentage: 0, color: 'yellow', icon: Clock },
    ];

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Authority Console</h1>
                    <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Manage and resolve issues assigned to your department.</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {stats.map((stat, i) => (
                    <div key={i} className={`p-6 rounded-2xl border transition-all duration-300 ${darkMode ? 'bg-white/5 border-white/5 hover:border-violet-500/50' : 'bg-white border-gray-200 hover:border-violet-200 shadow-sm'}`}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{stat.title}</p>
                                <h3 className={`text-4xl font-extrabold mt-2 tracking-tighter ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stat.value}</h3>
                            </div>
                            <div className={`p-3 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700 text-violet-400' : 'bg-violet-50 border-violet-100 text-violet-600'}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className={`h-full bg-violet-600 rounded-full`} style={{ width: `${stat.percentage}%` }}></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className={`p-6 border-b flex justify-between items-center ${darkMode ? 'border-white/5' : 'border-gray-100'}`}>
                    <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Operational Queue</h2>
                    <button
                        onClick={() => navigate('/authority/issues')}
                        className={`text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg border transition-all ${darkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                    >
                        Explore Full Registry
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className={`border-b ${darkMode ? 'bg-gray-700/50 border-gray-700' : 'bg-gray-50/50 border-gray-100'}`}>
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Issue</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Status</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Timestamp</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right text-gray-500">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {(issues || []).slice(0, 5).map((issue) => (
                                <tr key={issue.id} className={`transition-all duration-200 group ${darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}`}>
                                    <td className="px-6 py-4">
                                        <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{issue.category}</p>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>ID: {issue.id?.toString().slice(0, 8)}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-full border ${issue.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                            issue.status === 'In Progress' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                'bg-rose-100 text-rose-700 border-rose-200'
                                            }`}>
                                            {issue.status}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 text-xs font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {new Date(issue.createdAt || issue.reported_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => navigate(`/authority/issues/${issue.id}`)}
                                            className="text-gray-900 bg-gray-100 hover:bg-gray-200 dark:text-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 px-4 py-2 rounded-lg text-xs font-bold transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            Take Action
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AuthorityDashboard;
