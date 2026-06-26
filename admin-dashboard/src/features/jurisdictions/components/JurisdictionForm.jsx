import React from 'react';
import { Layers, Undo2, RotateCcw, Save } from 'lucide-react';

const JurisdictionForm = ({
    activeTab,
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
    onUndo,
    onClear,
    onSubmit,
    departments,
    zones = [],
    ulbs,
    wards,
    darkMode
}) => {
    return (
        <div className={`p-8 rounded-3xl shadow-xl flex flex-col justify-between ${darkMode ? 'bg-gray-800/40 border border-white/5' : 'bg-white shadow-gray-200/50'}`}>
            <div>
                <h2 className={`text-2xl font-black mb-6 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    <Layers className="text-violet-500" />
                    Create {activeTab === 'wards' ? 'New Ward' : activeTab === 'zones' ? 'New Zone' : 'New ULB'}
                </h2>

                <form onSubmit={onSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-black uppercase text-gray-500 mb-2">Boundary Name</label>
                        <input
                            type="text"
                            placeholder={
                                activeTab === 'wards' ? 'e.g. Adajan' : 
                                activeTab === 'zones' ? 'e.g. West Zone' : 
                                'e.g. Surat Municipal Corporation'
                            }
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={`w-full p-4 rounded-xl border-none ring-1 ring-gray-200 dark:ring-white/10 outline-none focus:ring-2 focus:ring-violet-500 ${darkMode ? 'bg-gray-700/50 text-white' : 'bg-gray-50 text-gray-900'}`}
                            required
                        />
                    </div>

                    {activeTab === 'zones' && (
                        <div>
                            <label className="block text-xs font-black uppercase text-gray-500 mb-2">Zone Code</label>
                            <input
                                type="text"
                                placeholder="e.g. WZ"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className={`w-full p-4 rounded-xl border-none ring-1 ring-gray-200 dark:ring-white/10 outline-none focus:ring-2 focus:ring-violet-500 ${darkMode ? 'bg-gray-700/50 text-white' : 'bg-gray-50 text-gray-900'}`}
                                required
                            />
                        </div>
                    )}

                    {activeTab === 'wards' && (
                        <>
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-500 mb-2">Responsible Department</label>
                                <select
                                    value={selectedDept}
                                    onChange={(e) => setSelectedDept(e.target.value)}
                                    className={`w-full p-4 rounded-xl border-none ring-1 ring-gray-200 dark:ring-white/10 outline-none focus:ring-2 focus:ring-violet-500 ${darkMode ? 'bg-gray-700/50 text-white' : 'bg-gray-50 text-gray-900'}`}
                                    required
                                >
                                    <option value="">-- Select Department --</option>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase text-gray-500 mb-2">Associated Zone (Required for containment check)</label>
                                <select
                                    value={selectedZone}
                                    onChange={(e) => setSelectedZone(e.target.value)}
                                    className={`w-full p-4 rounded-xl border-none ring-1 ring-gray-200 dark:ring-white/10 outline-none focus:ring-2 focus:ring-violet-500 ${darkMode ? 'bg-gray-700/50 text-white' : 'bg-gray-50 text-gray-900'}`}
                                    required
                                >
                                    <option value="">-- Select Zone --</option>
                                    {zones.map(z => (
                                        <option key={z.id} value={z.id}>{z.name} ({z.code})</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {(activeTab === 'wards' || activeTab === 'zones') && (
                        <div>
                            <label className="block text-xs font-black uppercase text-gray-500 mb-2">Associated City (ULB)</label>
                            <select
                                value={selectedUlb}
                                onChange={(e) => setSelectedUlb(e.target.value)}
                                className={`w-full p-4 rounded-xl border-none ring-1 ring-gray-200 dark:ring-white/10 outline-none focus:ring-2 focus:ring-violet-500 ${darkMode ? 'bg-gray-700/50 text-white' : 'bg-gray-50 text-gray-900'}`}
                            >
                                <option value="">-- None --</option>
                                {ulbs.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <h3 className="text-xs font-black uppercase text-gray-500 mb-3">Drawn Boundary Properties</h3>
                        <div className={`p-4 rounded-2xl flex flex-col gap-2 ${darkMode ? 'bg-gray-900/60' : 'bg-gray-50'}`}>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400 font-medium">Placed Vertices:</span>
                                <span className="font-black text-violet-500">{drawnPoints.length}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400 font-medium">Valid Shape:</span>
                                <span className={`font-black ${drawnPoints.length >= 3 ? 'text-green-500' : 'text-amber-500'}`}>
                                    {drawnPoints.length >= 3 ? 'Yes (Closed Polygon)' : 'No (Needs ≥ 3 points)'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {drawnPoints.length > 0 && (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onUndo}
                                className={`flex-1 py-3 rounded-xl font-bold text-xs flex justify-center items-center gap-2 border border-gray-200 dark:border-white/10 hover:bg-gray-500/10 transition-colors ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}
                            >
                                <Undo2 size={14} />
                                Undo Point
                            </button>
                            <button
                                type="button"
                                onClick={onClear}
                                className="flex-1 py-3 rounded-xl font-bold text-xs flex justify-center items-center gap-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
                            >
                                <RotateCcw size={14} />
                                Reset Map
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={drawnPoints.length < 3}
                        className={`w-full py-4 rounded-2xl shadow-xl transition-all font-black text-sm flex justify-center items-center gap-2 ${drawnPoints.length >= 3 ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'}`}
                    >
                        <Save size={16} />
                        Save Jurisdiction
                    </button>
                </form>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-white/10">
                <h3 className="text-xs font-black uppercase text-gray-500 mb-3">Existing {activeTab === 'wards' ? 'Wards' : activeTab === 'zones' ? 'Zones' : 'ULBs'}</h3>
                <div className="max-h-48 overflow-y-auto space-y-2">
                    {activeTab === 'wards' ? (
                        wards.length > 0 ? (
                            wards.map(w => (
                                <div key={w.id} className={`p-3 rounded-xl flex justify-between items-center text-xs ${darkMode ? 'bg-gray-900/40 hover:bg-gray-900/60' : 'bg-gray-50 hover:bg-gray-100'}`}>
                                    <span className="font-bold">{w.name}</span>
                                    <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-500 font-bold">{w.department?.name || 'No Dept'}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-gray-500 italic">No wards registered.</p>
                        )
                    ) : activeTab === 'zones' ? (
                        zones.length > 0 ? (
                            zones.map(z => (
                                <div key={z.id} className={`p-3 rounded-xl flex justify-between items-center text-xs ${darkMode ? 'bg-gray-900/40 hover:bg-gray-900/60' : 'bg-gray-50 hover:bg-gray-100'}`}>
                                    <span className="font-bold">{z.name} ({z.code})</span>
                                    <span className="text-gray-500">ID: {z.id.slice(0, 8)}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-gray-500 italic">No zones registered.</p>
                        )
                    ) : (
                        ulbs.length > 0 ? (
                            ulbs.map(u => (
                                <div key={u.id} className={`p-3 rounded-xl flex justify-between items-center text-xs ${darkMode ? 'bg-gray-900/40 hover:bg-gray-900/60' : 'bg-gray-50 hover:bg-gray-100'}`}>
                                    <span className="font-bold">{u.name}</span>
                                    <span className="text-gray-500">ID: {u.id}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-gray-500 italic">No Cities (ULBs) registered.</p>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default JurisdictionForm;
