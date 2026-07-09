import React from 'react';
import { FileText, CheckCircle } from 'lucide-react';

const IssueVisuals = ({ report, darkMode }) => {
    return (
        <div className="space-y-6">
            <div className={`rounded-2xl shadow-sm border overflow-hidden ${darkMode ? 'bg-gray-800 border-white/5' : 'bg-white'}`}>
                <div className={`p-4 border-b flex items-center justify-between ${darkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50'}`}>
                    <h2 className={`font-bold flex items-center ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        <FileText className="w-5 h-5 mr-2 text-indigo-500" />
                        Evidence & Visuals
                    </h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        report.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                        report.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                    }`}>
                        {report.status}
                    </span>
                </div>
                <div className={`p-1 min-h-[300px] flex items-center justify-center rounded-xl ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                    <img
                        src={report.s3_pre_key || report.minio_pre_key || (report.s3_image_urls && report.s3_image_urls[0]) || (report.minio_image_urls && report.minio_image_urls[0]) || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=2069&auto=format&fit=crop'}
                        alt="Report Evidence"
                        className="w-full aspect-video object-cover rounded-xl shadow-inner"
                        onError={(e) => {
                            const currentSrc = e.target.src;
                            if (currentSrc.includes('192.168.1.20')) {
                                e.target.src = currentSrc.replace('192.168.1.20', 'localhost');
                            }
                        }}
                    />
                </div>
            </div>

            {report.resolution_image_url && (
                <div className={`rounded-2xl shadow-sm border overflow-hidden ${darkMode ? 'bg-gray-800 border-white/5' : 'bg-white'}`}>
                    <div className={`p-4 border-b flex items-center justify-between ${darkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50'}`}>
                        <h2 className={`font-bold flex items-center ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            <CheckCircle className="w-5 h-5 mr-2 text-emerald-500" />
                            Resolution Evidence (After Fix)
                        </h2>
                    </div>
                    <div className={`p-1 min-h-[300px] flex items-center justify-center rounded-xl ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                        <img
                            src={report.resolution_image_url}
                            alt="Resolution Evidence"
                            className="w-full aspect-video object-cover rounded-xl shadow-inner"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default IssueVisuals;
