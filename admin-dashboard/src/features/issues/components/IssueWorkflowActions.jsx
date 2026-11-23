import React from 'react';
import { Zap, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const IssueWorkflowActions = ({
    report,
    currentUser,
    isRejecting,
    setIsRejecting,
    rejectionReason,
    setRejectionReason,
    onStatusAction,
    onUpdateStatus,
    proofFile,
    setProofFile,
    isSubmittingProof,
    onSubmitProof,
    darkMode
}) => {
    return (
        <div className={`rounded-2xl shadow-sm border p-6 space-y-6 ${darkMode ? 'bg-gray-800 border-white/5' : 'bg-white'}`}>
            <h2 className={`font-bold border-b pb-4 ${darkMode ? 'text-gray-200 border-white/5' : 'text-gray-800'}`}>Workflow Actions</h2>
            
            {/* Staff Specific Actions */}
            {(currentUser?.role === 'staff' || currentUser?.role === 'field_officer') && report.assigned_staff_id === currentUser.id && (
                <div className="space-y-4">
                    {report.status === 'Pending' && (
                        <button
                            onClick={() => onStatusAction('start_work')}
                            className="w-full flex items-center justify-center p-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            <Zap className="w-5 h-5 mr-3" />
                            Start Resolution
                        </button>
                    )}

                    {report.status === 'In Progress' && (
                        <form onSubmit={onSubmitProof} className="space-y-4">
                            <div className={`p-4 rounded-xl border-2 border-dashed ${darkMode ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                                <p className="text-[10px] font-black uppercase text-gray-500 mb-3 tracking-widest text-center">Attach Proof of Work</p>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => setProofFile(e.target.files[0])}
                                    className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-500/10 file:text-blue-500 hover:file:bg-blue-500/20"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmittingProof}
                                className={`w-full flex items-center justify-center p-4 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all ${isSubmittingProof ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <CheckCircle className="w-5 h-5 mr-3" />
                                {isSubmittingProof ? 'Uploading...' : 'Submit Fix for Review'}
                            </button>
                        </form>
                    )}
                </div>
            )}

            {/* Authority Specific Actions */}
            {['authority', 'dept_head', 'admin', 'super_admin'].includes(currentUser?.role) && (
                <div className="space-y-4">
                    {report.status === 'Pending Confirmation' ? (
                        <div className="space-y-3">
                            <button
                                onClick={() => onStatusAction('approve')}
                                className="w-full flex items-center justify-center p-4 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                <CheckCircle className="w-5 h-5 mr-3" />
                                Approve & Close Case
                            </button>
                            
                            {!isRejecting ? (
                                <button
                                    onClick={() => setIsRejecting(true)}
                                    className={`w-full flex items-center justify-center p-4 border rounded-xl font-bold transition-all ${darkMode ? 'text-red-400 border-red-500/30' : 'text-red-600 border-red-200'}`}
                                >
                                    <AlertCircle className="w-5 h-5 mr-3" />
                                    Reject - Needs Rework
                                </button>
                            ) : (
                                <div className="space-y-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Reason for rejection..."
                                        className={`w-full p-3 rounded-lg text-xs outline-none ring-1 ring-red-500/20 ${darkMode ? 'bg-black/40 text-white' : 'bg-white'}`}
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={() => onStatusAction('reject')} className="flex-1 py-2 bg-red-600 text-white text-xs font-bold rounded-lg">Confirm Reject</button>
                                        <button onClick={() => setIsRejecting(false)} className="px-4 py-2 text-xs font-bold text-gray-500">Cancel</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase text-gray-500 mb-4 tracking-widest border-b pb-2">Status Management</p>
                            <button
                                onClick={() => onUpdateStatus('Pending')}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${report.status === 'Pending' ? 'bg-red-500/10 border-red-500/30 text-red-500' : darkMode ? 'hover:bg-white/5 border-white/5 text-gray-400' : 'hover:bg-gray-50 border-gray-100'}`}
                            >
                                <div className="flex items-center">
                                    <AlertCircle className="w-5 h-5 mr-3" />
                                    <span className="font-medium">Force Pending</span>
                                </div>
                                {report.status === 'Pending' && <CheckCircle className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => onUpdateStatus('In Progress')}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${report.status === 'In Progress' ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' : darkMode ? 'hover:bg-white/5 border-white/5 text-gray-400' : 'hover:bg-gray-50 border-gray-100'}`}
                            >
                                <div className="flex items-center">
                                    <Clock className="w-5 h-5 mr-3" />
                                    <span className="font-medium">Force In-Progress</span>
                                </div>
                                {report.status === 'In Progress' && <CheckCircle className="w-4 h-4" />}
                            </button>
                        </div>
                    )}
                </div>
            )}

            <p className={`text-[10px] italic text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {(currentUser?.role === 'staff' || currentUser?.role === 'field_officer') ? 'Authorized as Field Staff' : 'Authorized as Municipal Authority'}
            </p>
        </div>
    );
};

export default IssueWorkflowActions;
