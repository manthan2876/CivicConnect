import React from 'react';
import { Search, Filter, Map as MapIcon, Download, Globe } from 'lucide-react';

const IssueFilters = ({
    searchTerm,
    setSearchTerm,
    filterCategory,
    setFilterCategory,
    filterStatus,
    setFilterStatus,
    filterZone,
    setFilterZone,
    filterWard,
    setFilterWard,
    zones = [],
    wards = [],
    categories,
    onExport,
    darkMode
}) => {
    // Filter wards list based on chosen zone
    const availableWards = filterZone === 'All'
        ? wards
        : wards.filter(w => w.zone_id === filterZone);

    return (
        <div className="flex flex-wrap items-center gap-3">
            <button
                onClick={onExport}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-all font-bold text-sm ${darkMode ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50'}`}
            >
                <Download size={16} />
                Export Data
            </button>

            <div className={`flex flex-wrap gap-4 w-full md:w-auto p-1.5 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-55 border-gray-200 bg-gray-50'}`}>
                {/* Search Bar */}
                <div className="relative flex-1 md:w-48">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search all issues..."
                        className={`w-full pl-10 pr-4 py-2 text-sm border-none rounded-md focus:ring-1 focus:ring-gray-400 transition-all outline-none ${darkMode ? 'bg-gray-900 text-white placeholder-gray-500' : 'bg-white text-gray-900'}`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Category Filter */}
                <div className="relative">
                    <select
                        className={`pl-4 pr-10 py-2 text-sm border-none rounded-md appearance-none focus:ring-1 focus:ring-gray-400 outline-none cursor-pointer font-bold ${darkMode ? 'bg-gray-900 text-gray-200' : 'bg-white text-gray-800'}`}
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
                    </select>
                    <MapIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>

                {/* Status Filter */}
                <div className="relative">
                    <select
                        className={`pl-4 pr-10 py-2 text-sm border-none rounded-md appearance-none focus:ring-1 focus:ring-gray-400 outline-none cursor-pointer font-bold ${darkMode ? 'bg-gray-900 text-gray-200' : 'bg-white text-gray-800'}`}
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="All">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                    </select>
                    <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>

                {/* Zone Filter */}
                <div className="relative">
                    <select
                        className={`pl-4 pr-10 py-2 text-sm border-none rounded-md appearance-none focus:ring-1 focus:ring-gray-400 outline-none cursor-pointer font-bold ${darkMode ? 'bg-gray-900 text-gray-200' : 'bg-white text-gray-800'}`}
                        value={filterZone}
                        onChange={(e) => {
                            setFilterZone(e.target.value);
                            setFilterWard('All'); // Reset ward when zone changes
                        }}
                    >
                        <option value="All">All Zones</option>
                        {zones.map(z => <option key={z.id} value={z.id}>{z.name} ({z.code})</option>)}
                    </select>
                    <Globe className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>

                {/* Ward Filter */}
                <div className="relative">
                    <select
                        className={`pl-4 pr-10 py-2 text-sm border-none rounded-md appearance-none focus:ring-1 focus:ring-gray-400 outline-none cursor-pointer font-bold ${darkMode ? 'bg-gray-900 text-gray-200' : 'bg-white text-gray-800'}`}
                        value={filterWard}
                        onChange={(e) => setFilterWard(e.target.value)}
                    >
                        <option value="All">All Wards</option>
                        {availableWards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    <MapIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>
            </div>
        </div>
    );
};

export default IssueFilters;
