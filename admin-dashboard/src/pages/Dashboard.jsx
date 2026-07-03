import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

import { TrendingUp, CheckCircle, Clock, AlertCircle, MoreHorizontal } from 'lucide-react';
import { reportsApi } from '../services/reportsApi';
import { useTranslation } from 'react-i18next';


const Dashboard = () => {
    const { t } = useTranslation();
    const { darkMode } = useOutletContext();
    const navigate = useNavigate();
    const COLORS = ['#10B981', '#06B6D4', '#F59E0B', '#EF4444', '#8B5CF6']; // Emerald, Cyan, Amber, Rose, Violet
    const [stats, setStats] = useState({ summary: [], categoryData: [] });
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            reportsApi.getStats(),
            reportsApi.getAll()
        ])
            .then(([statsData, issuesData]) => {
                setStats(statsData);
                setIssues(issuesData);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching dashboard data:', err);
                setLoading(false);
            });
    }, []);


    const StatCard = ({ title, value, color, icon: Icon, trend }) => {
        const statKeyMap = {
            'Total Reports': 'dashboard.stats.total_issues',
            'Total Issues': 'dashboard.stats.total_issues',
            'Resolved': 'dashboard.stats.resolved',
            'Pending': 'dashboard.stats.pending',
            'In Progress': 'dashboard.stats.under_review',
            'Under Review': 'dashboard.stats.under_review'
        };
        return (
            <div className={`p-6 rounded-2xl border transition-all duration-200 ${darkMode ? 'bg-gray-900 border-gray-800 hover:border-gray-700' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t(statKeyMap[title] || title, { defaultValue: title })}</p>
                        <h3 className={`text-4xl font-extrabold mt-2 tracking-tighter ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</h3>
                    </div>
                    <div className={`p-3 rounded-xl ${darkMode ? `bg-gray-800 text-${color}-400` : `bg-gray-100 text-${color}-600`}`}>
                        <Icon className="w-6 h-6" />
                    </div>
                </div>
                <div className="flex items-center text-xs font-semibold text-gray-500">
                    <span className={`flex items-center px-2 py-1 rounded-md mr-2 ${darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                        <TrendingUp className="w-3.5 h-3.5 mr-1" /> {trend}%
                    </span>
                    <span>{t('dashboard.stats.vs_last_month', { defaultValue: 'vs last month' })}</span>
                </div>
            </div>
        );
    };

    const handleDownloadReport = () => {
        if (!issues || issues.length === 0) {
            alert("No issues to download.");
            return;
        }

        // CSV Header
        const headers = ["Report ID", "Category", "Subcategory", "Status", "Priority", "Timestamp", "Location"];

        // CSV Rows
        const rows = issues.map(issue => [
            issue.id,
            issue.category,
            issue.subcategory || 'N/A',
            issue.status,
            issue.priority || 'Medium',
            new Date(issue.reported_at).toLocaleString(),
            `"${issue.location?.latitude}, ${issue.location?.longitude}"`
        ]);


        // Combine into CSV string
        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `civic_connect_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('dashboard.title', { defaultValue: 'Dashboard Overview' })}</h1>
                    <p className={`mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('dashboard.subtitle', { defaultValue: "Welcome back, Admin. Here's what's happening in your city." })}</p>
                </div>
                <button
                    onClick={handleDownloadReport}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all border ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white border-gray-700' : 'bg-white hover:bg-gray-50 text-gray-900 border-gray-200 shadow-sm'}`}>
                    {t('dashboard.download_report', { defaultValue: 'Download Report' })}
                </button>
            </div>

            {/* Loading state */}
            {loading && <div className="p-8 text-center">{t('dashboard.loading', { defaultValue: 'Loading dashboard...' })}</div>}

            {/* Stats Grid */}
            {!loading && stats.summary && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {stats.summary.map((stat, i) => (
                        <StatCard
                            key={i}
                            title={stat.title}
                            value={stat.value}
                            color={stat.color}
                            icon={stat.title === 'Resolved' ? CheckCircle : stat.title === 'Pending' ? AlertCircle : stat.title === 'In Progress' ? Clock : TrendingUp}
                            trend={stat.trend}
                        />
                    ))}
                </div>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Bar Chart */}
                <div className={`lg:col-span-2 p-8 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{t('dashboard.charts.categories', { defaultValue: 'Issues by Category' })}</h2>
                        <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal /></button>
                    </div>
                    <div className="h-80">
                        {stats.categoryData && stats.categoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.categoryData} barSize={40}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#374151' : '#E5E7EB'} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                    <Tooltip
                                        cursor={{ fill: darkMode ? '#1F2937' : '#F9FAFB' }}
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: darkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                                            boxShadow: 'none',
                                            backgroundColor: darkMode ? '#111827' : '#FFFFFF',
                                            color: darkMode ? '#FFFFFF' : '#111827',
                                            fontSize: '12px',
                                            fontWeight: '600'
                                        }}
                                    />
                                    <Bar dataKey="value" fill="#3B82F6" radius={[6, 6, 0, 0]}>
                                        {(stats.categoryData || []).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500 italic text-sm">{t('dashboard.charts.sync_data', { defaultValue: 'Synchronizing data streams...' })}</div>
                        )}
                    </div>
                </div>

                {/* Pie Chart */}
                <div className={`p-8 rounded-2xl border flex flex-col justify-between ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <h2 className={`mb-6 text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{t('dashboard.charts.trends', { defaultValue: 'Resolution Status' })}</h2>
                    <div className="h-64 flex justify-center relative">
                        {stats.categoryData && stats.categoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.categoryData || []}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {(stats.categoryData || []).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '8px',
                                            backgroundColor: darkMode ? '#111827' : '#FFFFFF',
                                            border: darkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                                            boxShadow: 'none',
                                            fontSize: '12px',
                                            fontWeight: '600'
                                        }}
                                    />
                                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ color: '#9CA3AF' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                             <div className="h-full flex items-center justify-center text-gray-500 italic text-sm">{t('dashboard.charts.mapping_metrics', { defaultValue: 'Mapping resolution metrics...' })}</div>
                        )}
                        {stats.summary && stats.summary[0] && (
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
                                <span className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{stats.summary[0].value}</span>
                                <p className="text-xs text-gray-500">{t('dashboard.total', { defaultValue: 'Total' })}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className={`p-8 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{t('dashboard.recent_reports.title', { defaultValue: 'Recent Activity' })}</h2>
                    <button
                        onClick={() => navigate('/admin/issues')}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                        {t('dashboard.recent_reports.view', { defaultValue: 'View All' })}
                    </button>
                </div>
                <div className="space-y-4">
                    {issues.slice(0, 5).map((issue) => (
                        <div
                            key={issue.id}
                            onClick={() => navigate(`/admin/issues/${issue.id}`)}
                            className={`flex items-center justify-between p-4 rounded-xl transition-all duration-200 border cursor-pointer ${darkMode ? 'bg-gray-800/30 hover:bg-gray-800 border-transparent hover:border-gray-700' : 'bg-gray-50/50 hover:bg-gray-50 border-transparent hover:border-gray-200'}`}
                        >
                            <div className="flex items-center">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                                    <Clock size={16} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <p className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{t('dashboard.new_report', { defaultValue: 'New Report' })}: {issue.category}</p>
                                    <p className="text-sm text-gray-500 truncate max-w-xs">ID: {issue.id.slice(0, 8)}...</p>
                                </div>
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded-md shadow-sm ${darkMode ? 'text-gray-300 bg-gray-600' : 'text-gray-400 bg-white'}`}>
                                {new Date(issue.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    ))}

                    {issues.length === 0 && <p className="text-center text-gray-500 py-4">{t('dashboard.no_recent_activity', { defaultValue: 'No recent activity found.' })}</p>}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
