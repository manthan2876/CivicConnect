import { useState, useEffect, useCallback } from 'react';
import { Shield, Search, Filter, RefreshCw, Clock, User, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { auditApi } from '../services/auditApi';
import RoleGuard from '../components/RoleGuard';

const EVENT_LABELS = {
    'report.created': { label: 'Report Created', color: 'emerald' },
    'report.status_changed': { label: 'Status Changed', color: 'blue' },
    'report.assigned': { label: 'Assigned', color: 'violet' },
    'report.deleted': { label: 'Deleted', color: 'rose' },
    'report.bulk_updated': { label: 'Bulk Update', color: 'amber' },
    'report.resolution_proposed': { label: 'Resolution Proposed', color: 'cyan' },
    'report.resolution_confirmed': { label: 'Resolution Confirmed', color: 'emerald' },
    'report.resolution_rejected': { label: 'Resolution Rejected', color: 'rose' },
    'report.citizen_confirmed': { label: 'Citizen Verified', color: 'emerald' },
    'report.citizen_disputed': { label: 'Citizen Disputed', color: 'orange' },
    'user.role_changed': { label: 'Role Changed', color: 'purple' },
};

const colorMap = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

const EventBadge = ({ eventType }) => {
    const meta = EVENT_LABELS[eventType] || { label: eventType, color: 'blue' };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorMap[meta.color] || colorMap.blue}`}>
            {meta.label}
        </span>
    );
};

const DiffView = ({ oldVal, newVal }) => {
    if (!oldVal && !newVal) return null;
    return (
        <div className="mt-2 flex gap-3 text-xs font-mono">
            {oldVal && (
                <div className="flex-1 bg-rose-500/5 border border-rose-500/10 rounded-lg px-3 py-2">
                    <p className="text-rose-400 font-semibold mb-1 text-[10px] uppercase tracking-wide">Before</p>
                    <pre className="text-rose-300 whitespace-pre-wrap break-all">{JSON.stringify(oldVal, null, 2)}</pre>
                </div>
            )}
            {newVal && (
                <div className="flex-1 bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2">
                    <p className="text-emerald-400 font-semibold mb-1 text-[10px] uppercase tracking-wide">After</p>
                    <pre className="text-emerald-300 whitespace-pre-wrap break-all">{JSON.stringify(newVal, null, 2)}</pre>
                </div>
            )}
        </div>
    );
};

const LogRow = ({ log }) => {
    const [expanded, setExpanded] = useState(false);
    const hasDetails = log.old_value || log.new_value || log.payload;

    return (
        <div className="border border-white/5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
            <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                onClick={() => hasDetails && setExpanded(e => !e)}
            >
                {/* Icon */}
                <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <Activity className="w-3.5 h-3.5 text-violet-400" />
                </div>

                {/* Event + Resource */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <EventBadge eventType={log.event_type} />
                        {log.target_resource && (
                            <span className="text-xs text-slate-500">
                                {log.target_resource}
                                {log.target_resource_id && (
                                    <span className="ml-1 text-slate-600 font-mono">{log.target_resource_id.slice(0, 8)}…</span>
                                )}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actor */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0 flex-shrink-0">
                    <User className="w-3 h-3" />
                    <span className="font-mono truncate max-w-[120px]">{log.actor_id?.slice(0, 8)}…</span>
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                </div>

                {/* Expand toggle */}
                {hasDetails && (
                    <div className="text-slate-600 flex-shrink-0">
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                )}
            </div>

            {expanded && hasDetails && (
                <div className="px-5 pb-4 border-t border-white/5 pt-3">
                    <DiffView oldVal={log.old_value} newVal={log.new_value} />
                    {log.payload && Object.keys(log.payload).length > 0 && (
                        <div className="mt-2 text-xs font-mono bg-slate-800/50 rounded-lg px-3 py-2">
                            <p className="text-slate-400 font-semibold mb-1 text-[10px] uppercase tracking-wide">Payload</p>
                            <pre className="text-slate-300 whitespace-pre-wrap break-all">{JSON.stringify(log.payload, null, 2)}</pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const AuditLogViewer = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [filters, setFilters] = useState({
        resource: '',
        resource_id: '',
        event_type: '',
        from: '',
        to: '',
    });

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await auditApi.getAll({
                ...filters,
                limit: '200'
            });
            setLogs(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || 'Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    return (
        <RoleGuard roles={['super_admin', 'admin', 'mayor']} permission="audit:view" fallback={
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 font-semibold">Access Restricted</p>
                    <p className="text-slate-600 text-sm mt-1">You need admin privileges to view audit logs.</p>
                </div>
            </div>
        }>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Audit Trail</h1>
                            <p className="text-slate-500 text-sm">Track all state changes across the system</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors text-sm font-semibold"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <select
                            value={filters.resource}
                            onChange={e => setFilters(f => ({ ...f, resource: e.target.value }))}
                            className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm focus:outline-none focus:border-violet-500/50 appearance-none"
                        >
                            <option value="">All Resources</option>
                            <option value="issue">Issue</option>
                            <option value="user">User</option>
                        </select>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Resource ID (UUID)..."
                            value={filters.resource_id}
                            onChange={e => setFilters(f => ({ ...f, resource_id: e.target.value }))}
                            className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
                        />
                    </div>

                    <div className="relative">
                        <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <select
                            value={filters.event_type}
                            onChange={e => setFilters(f => ({ ...f, event_type: e.target.value }))}
                            className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm focus:outline-none focus:border-violet-500/50 appearance-none"
                        >
                            <option value="">All Events</option>
                            {Object.keys(EVENT_LABELS).map(k => (
                                <option key={k} value={k}>{EVENT_LABELS[k].label}</option>
                            ))}
                        </select>
                    </div>

                    <input
                        type="date"
                        value={filters.from}
                        onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
                        className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm focus:outline-none focus:border-violet-500/50"
                    />
                    <input
                        type="date"
                        value={filters.to}
                        onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
                        className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm focus:outline-none focus:border-violet-500/50"
                    />
                </div>

                {/* Stats bar */}
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="font-semibold text-violet-400">{logs.length}</span>
                    <span>entries found</span>
                    {(filters.resource || filters.resource_id || filters.event_type) && (
                        <button
                            onClick={() => setFilters({ resource: '', resource_id: '', event_type: '', from: '', to: '' })}
                            className="ml-2 text-xs text-rose-400 hover:text-rose-300 underline"
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                {/* Log list */}
                <div className="space-y-2">
                    {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-16 rounded-xl bg-white/[0.02] animate-pulse border border-white/5" />
                        ))
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-rose-400">{error}</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-16">
                            <Activity className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-500">No audit logs found for the selected filters.</p>
                        </div>
                    ) : (
                        logs.map(log => <LogRow key={log.id} log={log} />)
                    )}
                </div>
            </div>
        </RoleGuard>
    );
};

export default AuditLogViewer;
