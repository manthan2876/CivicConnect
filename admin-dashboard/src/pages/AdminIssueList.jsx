import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, RefreshCcw } from 'lucide-react';
import { useIssueList } from '../features/issues/hooks/useIssueList';
import IssueFilters from '../features/issues/components/IssueFilters';
import IssueTable from '../features/issues/components/IssueTable';

const AdminIssueList = () => {
    const { darkMode } = useOutletContext();
    const { user } = useAuth();
    const navigate = useNavigate();

    const {
        filterStatus,
        setFilterStatus,
        filterCategory,
        setFilterCategory,
        searchTerm,
        setSearchTerm,
        filterZone,
        setFilterZone,
        filterWard,
        setFilterWard,
        zones,
        wards,
        loading,
        selectedIds,
        setSelectedIds,
        filteredIssues,
        categories,
        handleUpdateStatus,
        handleBulkAction,
        handleDelete,
        toggleSelection
    } = useIssueList(user);

    const isSuperAdmin = user?.role === 'super_admin';
    const isAuthority = user?.role === 'authority';

    const handleExport = () => {
        const headers = ["ID", "Title", "Category", "Status", "Date", "Description"];
        const rows = filteredIssues.map(issue => [
            issue.id,
            `"${issue.title}"`,
            issue.category,
            issue.status,
            issue.date,
            `"${issue.description}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "admin_issues_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in-up relative">
            {/* Bulk Action Bar */}
            {selectedIds.length > 0 && (
                <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-8 py-4 rounded-3xl shadow-2xl border flex items-center gap-6 animate-in slide-in-from-bottom-8 duration-500 ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-200'}`}>
                    <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Admin Operations</span>
                        <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedIds.length} Issues Selected</span>
                    </div>
                    <div className="h-8 w-px bg-slate-100 dark:bg-white/10 mx-2"></div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => handleBulkAction('Resolved')}
                            className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 shadow-xl shadow-emerald-600/20 transition-all flex items-center gap-2"
                        >
                            <CheckCircle size={14} /> Resolve All
                        </button>
                        <button 
                            onClick={() => handleBulkAction('In Progress')}
                            className="bg-amber-500 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 shadow-xl shadow-amber-500/20 transition-all flex items-center gap-2"
                        >
                            <RefreshCcw className="w-3.5 h-3.5" /> In-Progress
                        </button>
                        <button 
                            onClick={() => setSelectedIds([])}
                            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${darkMode ? 'text-slate-400 hover:bg-white/5' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {isSuperAdmin ? 'Global Control Center' : isAuthority ? 'Ward Command' : 'My Tasks'}
                    </h1>
                    <p className={`mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {isSuperAdmin ? 'Full oversight of city-wide municipal health.' : `Managing issues for ${user?.ward?.name || 'Assigned Area'}`}
                    </p>
                </div>

                <IssueFilters
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    filterCategory={filterCategory}
                    setFilterCategory={setFilterCategory}
                    filterStatus={filterStatus}
                    setFilterStatus={setFilterStatus}
                    filterZone={filterZone}
                    setFilterZone={setFilterZone}
                    filterWard={filterWard}
                    setFilterWard={setFilterWard}
                    zones={zones}
                    wards={wards}
                    categories={categories}
                    onExport={handleExport}
                    darkMode={darkMode}
                />
            </div>

            <IssueTable
                issues={filteredIssues}
                selectedIds={selectedIds}
                onSelectAll={(checked) => {
                    if (checked) setSelectedIds(filteredIssues.map(i => i.id));
                    else setSelectedIds([]);
                }}
                onToggleSelection={toggleSelection}
                onUpdateStatus={handleUpdateStatus}
                onNavigateDetails={(id) => navigate(`/admin/issues/${id}`)}
                onDelete={handleDelete}
                darkMode={darkMode}
            />
        </div>
    );
};

export default AdminIssueList;
