import React from 'react';
import { Layers, Undo2, RotateCcw, Save, Pencil, Trash2, X } from 'lucide-react';

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
    darkMode,
    fetchingOSM,
    onImportFromOSM,
    selectedCountry,
    setSelectedCountry,
    editingItem,
    onStartEdit,
    onCancelEdit,
    onDelete
}) => {
    return (
        <div className={`p-8 rounded-3xl shadow-xl flex flex-col justify-between ${darkMode ? 'bg-gray-800/40 border border-white/5' : 'bg-white shadow-gray-200/50'}`}>
            <div>
                <h2 className={`text-2xl font-black mb-6 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    <Layers className="text-violet-500" />
                    {editingItem ? 'Edit' : 'Create'} {activeTab === 'wards' ? 'Ward' : activeTab === 'zones' ? 'Zone' : 'ULB'}
                </h2>

                <form onSubmit={onSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-black uppercase text-gray-500 mb-2">Boundary Name</label>
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder={
                                        activeTab === 'wards' ? 'e.g. Adajan' : 
                                        activeTab === 'zones' ? 'e.g. West Zone' : 
                                        'e.g. Surat Municipal Corporation'
                                    }
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={`flex-1 p-4 rounded-xl border-none ring-1 ring-gray-200 dark:ring-white/10 outline-none focus:ring-2 focus:ring-violet-500 ${darkMode ? 'bg-gray-700/50 text-white' : 'bg-gray-50 text-gray-900'}`}
                                    required
                                />
                                <select
                                    value={selectedCountry}
                                    onChange={(e) => setSelectedCountry(e.target.value)}
                                    className={`w-32 p-4 rounded-xl border-none ring-1 ring-gray-200 dark:ring-white/10 outline-none focus:ring-2 focus:ring-violet-500 text-sm ${darkMode ? 'bg-gray-700/50 text-white' : 'bg-gray-50 text-gray-900'}`}
                                    title="Select search country"
                                >
                                    <option value="IN">🇮🇳 India</option>
                                    <option value="US">🇺🇸 USA</option>
                                    <option value="GB">🇬🇧 UK</option>
                                    <option value="CA">🇨🇦 Canada</option>
                                    <option value="AU">🇦🇺 Australia</option>
                                    <option value="FR">🇫🇷 France</option>
                                    <option value="DE">🇩🇪 Germany</option>
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={onImportFromOSM}
                                disabled={fetchingOSM}
                                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex justify-center items-center gap-2 border border-violet-500/30 hover:bg-violet-500/10 transition-colors text-violet-500 disabled:opacity-50`}
                            >
                                {fetchingOSM ? 'Fetching Boundary from OSM...' : '🔍 Autofill Boundary from OpenStreetMap'}
                            </button>
                        </div>
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

                    <div className="flex gap-2">
                        {editingItem && (
                            <button
                                type="button"
                                onClick={onCancelEdit}
                                className={`flex-1 py-4 rounded-2xl font-black text-sm flex justify-center items-center gap-2 border border-gray-200 dark:border-white/10 hover:bg-gray-500/10 transition-colors ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}
                            >
                                <X size={16} />
                                Cancel
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={drawnPoints.length < 3}
                            className={`flex-1 py-4 rounded-2xl shadow-xl transition-all font-black text-sm flex justify-center items-center gap-2 ${drawnPoints.length >= 3 ? 'bg-violet-600 hover:bg-violet-700 text-white animate-pulse-subtle' : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'}`}
                        >
                            <Save size={16} />
                            {editingItem ? 'Update' : 'Save'} Jurisdiction
                        </button>
                    </div>
                </form>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-white/10">
                <h3 className="text-xs font-black uppercase text-gray-500 mb-3">Existing {activeTab === 'wards' ? 'Wards' : activeTab === 'zones' ? 'Zones' : 'ULBs'}</h3>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {activeTab === 'wards' ? (
                        wards.length > 0 ? (
                            wards.map(w => {
                                const isEditing = editingItem && editingItem.id === w.id && editingItem.type === 'wards';
                                const isPreviewing = previewItem && previewItem.id === w.id && previewItem.type === 'wards';
                                return (
                                    <div 
                                        key={w.id} 
                                        onClick={() => onTogglePreview(w, 'wards')}
                                        className={`p-3 rounded-xl flex justify-between items-center text-xs cursor-pointer border transition-all ${
                                            isEditing 
                                                ? 'bg-violet-500/10 border-violet-500/30 ring-2 ring-violet-500/30 text-violet-500' 
                                                : isPreviewing 
                                                ? 'bg-amber-500/10 border-amber-500/30 ring-2 ring-amber-500/30 text-amber-600 dark:text-amber-400' 
                                                : darkMode 
                                                ? 'bg-gray-900/40 hover:bg-gray-900/60 border-transparent text-gray-200' 
                                                : 'bg-gray-50 hover:bg-gray-100 border-transparent text-gray-700'
                                        }`}
                                    >
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold">{w.name}</span>
                                                {isEditing && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500 text-white font-extrabold tracking-wide uppercase">Editing</span>
                                                )}
                                                {isPreviewing && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-extrabold tracking-wide uppercase">Preview</span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-gray-500 font-bold">{w.department?.name || 'No Dept'}</span>
                                        </div>
                                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={() => onStartEdit(w, 'wards')}
                                                className="p-1.5 rounded-lg border border-transparent hover:bg-violet-500/10 text-violet-500 transition-colors"
                                                title="Edit Ward Boundary"
                                            >
                                                <Pencil size={12} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDelete(w.id, 'wards')}
                                                className="p-1.5 rounded-lg border border-transparent hover:bg-rose-500/10 text-rose-500 transition-colors"
                                                title="Delete Ward"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-xs text-gray-500 italic">No wards registered.</p>
                        )
                    ) : activeTab === 'zones' ? (
                        zones.length > 0 ? (
                            zones.map(z => {
                                const isEditing = editingItem && editingItem.id === z.id && editingItem.type === 'zones';
                                const isPreviewing = previewItem && previewItem.id === z.id && previewItem.type === 'zones';
                                return (
                                    <div 
                                        key={z.id} 
                                        onClick={() => onTogglePreview(z, 'zones')}
                                        className={`p-3 rounded-xl flex justify-between items-center text-xs cursor-pointer border transition-all ${
                                            isEditing 
                                                ? 'bg-violet-500/10 border-violet-500/30 ring-2 ring-violet-500/30 text-violet-500' 
                                                : isPreviewing 
                                                ? 'bg-amber-500/10 border-amber-500/30 ring-2 ring-amber-500/30 text-amber-600 dark:text-amber-400' 
                                                : darkMode 
                                                ? 'bg-gray-900/40 hover:bg-gray-900/60 border-transparent text-gray-200' 
                                                : 'bg-gray-50 hover:bg-gray-100 border-transparent text-gray-700'
                                        }`}
                                    >
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold">{z.name} ({z.code})</span>
                                                {isEditing && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500 text-white font-extrabold tracking-wide uppercase">Editing</span>
                                                )}
                                                {isPreviewing && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-extrabold tracking-wide uppercase">Preview</span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-gray-500 font-bold">ID: {z.id.slice(0, 8)}</span>
                                        </div>
                                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={() => onStartEdit(z, 'zones')}
                                                className="p-1.5 rounded-lg border border-transparent hover:bg-violet-500/10 text-violet-500 transition-colors"
                                                title="Edit Zone Boundary"
                                            >
                                                <Pencil size={12} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDelete(z.id, 'zones')}
                                                className="p-1.5 rounded-lg border border-transparent hover:bg-rose-500/10 text-rose-500 transition-colors"
                                                title="Delete Zone"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-xs text-gray-500 italic">No zones registered.</p>
                        )
                    ) : (
                        ulbs.length > 0 ? (
                            ulbs.map(u => {
                                const isEditing = editingItem && editingItem.id === u.id && editingItem.type === 'ulbs';
                                const isPreviewing = previewItem && previewItem.id === u.id && previewItem.type === 'ulbs';
                                return (
                                    <div 
                                        key={u.id} 
                                        onClick={() => onTogglePreview(u, 'ulbs')}
                                        className={`p-3 rounded-xl flex justify-between items-center text-xs cursor-pointer border transition-all ${
                                            isEditing 
                                                ? 'bg-violet-500/10 border-violet-500/30 ring-2 ring-violet-500/30 text-violet-500' 
                                                : isPreviewing 
                                                ? 'bg-amber-500/10 border-amber-500/30 ring-2 ring-amber-500/30 text-amber-600 dark:text-amber-400' 
                                                : darkMode 
                                                ? 'bg-gray-900/40 hover:bg-gray-900/60 border-transparent text-gray-200' 
                                                : 'bg-gray-50 hover:bg-gray-100 border-transparent text-gray-700'
                                        }`}
                                    >
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold">{u.name}</span>
                                                {isEditing && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500 text-white font-extrabold tracking-wide uppercase">Editing</span>
                                                )}
                                                {isPreviewing && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-extrabold tracking-wide uppercase">Preview</span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-gray-500 font-bold">ID: {u.id}</span>
                                        </div>
                                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={() => onStartEdit(u, 'ulbs')}
                                                className="p-1.5 rounded-lg border border-transparent hover:bg-violet-500/10 text-violet-500 transition-colors"
                                                title="Edit City Boundary"
                                            >
                                                <Pencil size={12} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDelete(u.id, 'ulbs')}
                                                className="p-1.5 rounded-lg border border-transparent hover:bg-rose-500/10 text-rose-500 transition-colors"
                                                title="Delete City"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
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
