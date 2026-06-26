import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAdminJurisdictions } from '../features/jurisdictions/hooks/useAdminJurisdictions';
import JurisdictionForm from '../features/jurisdictions/components/JurisdictionForm';
import JurisdictionMap from '../features/jurisdictions/components/JurisdictionMap';

const AdminJurisdictions = () => {
    const { darkMode } = useOutletContext();
    
    const {
        activeTab,
        setActiveTab,
        wards,
        zones,
        ulbs,
        departments,
        name,
        setName,
        code,
        setCode,
        selectedDept,
        setSelectedDept,
        selectedZone,
        setSelectedZone,
        selectedUlb,
        setSelectedUlb,
        drawnPoints,
        mapCenter,
        showHelp,
        setShowHelp,
        handleMapClick,
        handleUndo,
        handleClear,
        handleCreateJurisdiction
    } = useAdminJurisdictions();

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className={`text-4xl font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>Jurisdictions & Boundaries</h1>
                    <p className={`mt-2 text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Configure regional cities (ULBs), zones, and localized wards with interactive boundary drawing.</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 dark:border-white/10">
                <button
                    onClick={() => { setActiveTab('wards'); handleClear(); }}
                    className={`pb-4 px-6 font-bold text-sm border-b-2 transition-all ${activeTab === 'wards' ? 'border-violet-600 text-violet-500' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Wards (Sub-Zones)
                </button>
                <button
                    onClick={() => { setActiveTab('zones'); handleClear(); }}
                    className={`pb-4 px-6 font-bold text-sm border-b-2 transition-all ${activeTab === 'zones' ? 'border-violet-600 text-violet-500' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Zones (SMC Administrative Zones)
                </button>
                <button
                    onClick={() => { setActiveTab('ulbs'); handleClear(); }}
                    className={`pb-4 px-6 font-bold text-sm border-b-2 transition-all ${activeTab === 'ulbs' ? 'border-violet-600 text-violet-500' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    ULB Cities (Urban Local Bodies)
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Panel: Configuration Form */}
                <JurisdictionForm
                    activeTab={activeTab}
                    name={name}
                    setName={setName}
                    code={code}
                    setCode={setCode}
                    selectedDept={selectedDept}
                    setSelectedDept={setSelectedDept}
                    selectedZone={selectedZone}
                    setSelectedZone={setSelectedZone}
                    selectedUlb={selectedUlb}
                    setSelectedUlb={setSelectedUlb}
                    drawnPoints={drawnPoints}
                    onUndo={handleUndo}
                    onClear={handleClear}
                    onSubmit={handleCreateJurisdiction}
                    departments={departments}
                    zones={zones}
                    ulbs={ulbs}
                    wards={wards}
                    darkMode={darkMode}
                />

                {/* Right Panel: Interactive Drawing Map */}
                <JurisdictionMap
                    mapCenter={mapCenter}
                    drawnPoints={drawnPoints}
                    onMapClick={handleMapClick}
                    showHelp={showHelp}
                    onCloseHelp={() => setShowHelp(false)}
                    activeTab={activeTab}
                    selectedZone={selectedZone}
                    zones={zones}
                />
            </div>
        </div>
    );
};

export default AdminJurisdictions;
