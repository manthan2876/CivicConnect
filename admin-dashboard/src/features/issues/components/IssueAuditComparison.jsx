import React from 'react';
import { FileText, Clock, CheckCircle } from 'lucide-react';

const IssueAuditComparison = ({ report, repairData, darkMode }) => {
    return (
        <div className="space-y-6">
            <div className={`rounded-2xl shadow-sm border overflow-hidden ${darkMode ? 'bg-gray-800 border-white/5' : 'bg-white'}`}>
                <div className={`p-4 border-b flex items-center justify-between ${darkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50'}`}>
                    <h2 className={`font-bold flex items-center ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        <FileText className="w-5 h-5 mr-2 text-blue-500" />
                        {report.status === 'Pending Confirmation' || report.status === 'Resolved' ? 'Audit: Before vs After' : 'Evidence & Visuals'}
                    </h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        report.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                        report.status === 'Pending Confirmation' ? 'bg-amber-100 text-amber-700' :
                        report.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                    }`}>
                        {report.status}
                    </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1 p-1">
                    <div className="relative group">
                        <img
                            src={report.s3_pre_key || report.minio_pre_key || (report.s3_image_urls && report.s3_image_urls[0]) || (report.minio_image_urls && report.minio_image_urls[0]) || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=2069&auto=format&fit=crop'}
                            alt="Before"
                            className="w-full aspect-video object-cover rounded-l-xl"
                            onError={(e) => {
                                const currentSrc = e.target.src;
                                if (currentSrc.includes('192.168.1.20')) {
                                    e.target.src = currentSrc.replace('192.168.1.20', 'localhost');
                                }
                            }}
                        />
                        <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-[10px] font-bold rounded uppercase">Before</div>
                    </div>
                    
                    {(report.status === 'Pending Confirmation' || report.status === 'Resolved') ? (
                        <div className="relative group">
                            <img
                                src={repairData?.repair_image || 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=2070&auto=format&fit=crop'}
                                alt="After"
                                className="w-full aspect-video object-cover rounded-r-xl"
                            />
                            <div className="absolute top-2 left-2 px-2 py-1 bg-emerald-600/80 text-white text-[10px] font-bold rounded uppercase">After</div>
                        </div>
                    ) : (
                        <div className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-r-xl ${darkMode ? 'bg-black/20 border-white/5 text-gray-600' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                            <Clock size={40} className="mb-2 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-widest opacity-50">Awaiting Fix</p>
                        </div>
                    )}
                </div>
            </div>

            {(report.status === 'Pending Confirmation' || report.status === 'Resolved') && report.metadata?.resolution_image_url && (
                <div className={`rounded-2xl shadow-sm border overflow-hidden ${darkMode ? 'bg-gray-800 border-white/5' : 'bg-white'}`}>
                    <div className={`p-4 border-b flex items-center justify-between ${darkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50'}`}>
                        <h2 className={`font-bold flex items-center ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            <CheckCircle className="w-5 h-5 mr-2 text-emerald-500" />
                            Resolution Proof
                        </h2>
                        <span className="text-xs font-bold text-emerald-600 uppercase">Verification Required</span>
                    </div>
                    <div className={`p-1 min-h-[300px] flex items-center justify-center rounded-xl ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                        <img
                            src={report.metadata.resolution_image_url.startsWith('/uploads')
                                ? `http://localhost:5000${report.metadata.resolution_image_url}`
                                : report.metadata.resolution_image_url}
                            alt="Resolution Proof"
                            className="w-full aspect-video object-cover rounded-xl shadow-inner"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default IssueAuditComparison;
