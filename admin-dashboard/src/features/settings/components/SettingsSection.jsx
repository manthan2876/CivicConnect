import React from 'react';
import { Lock, AlertTriangle, Trash2, CheckCircle2, Phone, Loader2, Camera } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const SettingsSection = ({
    activeSection,
    profile,
    setProfile,
    security,
    setSecurity,
    system,
    wipeConfirm,
    setWipeConfirm,
    wiping,
    onWipe,
    darkMode,
    otpSent,
    setOtpSent,
    otpCode,
    setOtpCode,
    isVerifying,
    verificationError,
    handleSendPhoneOtp,
    handleVerifyPhoneOtp,
    notifications,
    setNotifications,
    uploadingAvatar,
    handleAvatarChange
}) => {
    const { user } = useAuth();

    switch (activeSection) {
        case 'profile':
            return (
                <div className="space-y-6">
                    <div className="flex flex-col items-center gap-4 border-b border-gray-200 dark:border-white/10 pb-6 mb-6">
                        <div className="relative group">
                            <div className={`h-24 w-24 flex items-center justify-center text-xl font-bold rounded-3xl border-2 transition-all overflow-hidden ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
                                {user?.user_metadata?.avatar_url ? (
                                    <img
                                        src={user.user_metadata.avatar_url}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    profile.name ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'A'
                                )}
                            </div>
                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 rounded-3xl cursor-pointer transition-opacity text-xs font-bold gap-1">
                                <Camera size={14} />
                                <span>Change</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    disabled={uploadingAvatar}
                                    className="hidden"
                                />
                            </label>
                        </div>
                        {uploadingAvatar && (
                            <span className="text-xs text-blue-500 font-bold animate-pulse">Uploading profile picture...</span>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black uppercase text-gray-500 mb-2">Admin Name</label>
                            <input
                                type="text"
                                value={profile.name}
                                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                className={`w-full p-4 rounded-xl border-none ring-1 ring-gray-200 dark:ring-white/10 outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700/50 text-white' : 'bg-gray-50 text-gray-900'}`}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase text-gray-500 mb-2">Email</label>
                            <input
                                type="email"
                                value={profile.email}
                                readOnly
                                className={`w-full p-4 rounded-xl border-none ring-1 ring-gray-200 dark:ring-white/10 opacity-60 ${darkMode ? 'bg-gray-700/50 text-white' : 'bg-gray-50 text-gray-900'}`}
                            />
                        </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-white/10 pt-6 mt-6">
                        <h3 className={`text-base font-black mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Phone Verification</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-500 mb-2">Phone Number</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Phone className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="tel"
                                        value={profile.phone || ''}
                                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                        disabled={otpSent}
                                        placeholder="+91 XXXXX XXXXX"
                                        className={`w-full pl-11 pr-4 py-4 rounded-xl border-none ring-1 ring-gray-200 dark:ring-white/10 outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700/50 text-white' : 'bg-gray-50 text-gray-900'}`}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                {profile.phone && profile.phone === user?.phone ? (
                                    <div className="flex items-center gap-2 px-4 py-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-sm font-bold w-full justify-center">
                                        <CheckCircle2 size={18} />
                                        <span>Verified Status</span>
                                    </div>
                                ) : (
                                    !otpSent && (
                                        <button
                                            type="button"
                                            onClick={() => handleSendPhoneOtp(profile.phone)}
                                            disabled={!profile.phone}
                                            className="w-full py-4 px-6 text-sm font-black uppercase tracking-widest rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            Send Verification OTP
                                        </button>
                                    )
                                )}
                            </div>
                        </div>

                        {otpSent && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 items-end p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 animate-fade-in">
                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-500 mb-2">Enter 6-Digit OTP</label>
                                    <input
                                        type="text"
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value)}
                                        placeholder="Enter code"
                                        className={`w-full p-4 rounded-xl border-none ring-1 ring-gray-200 dark:ring-white/10 outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700/50 text-white' : 'bg-gray-50 text-gray-900'}`}
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => handleVerifyPhoneOtp(profile.phone, otpCode)}
                                        disabled={isVerifying || !otpCode}
                                        className="flex-1 py-4 px-6 text-sm font-black uppercase tracking-widest rounded-xl text-white bg-green-600 hover:bg-green-700 shadow-md transition-all active:scale-95 flex items-center justify-center disabled:opacity-50"
                                    >
                                        {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Code'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOtpSent(false)}
                                        className={`px-6 py-4 rounded-xl text-sm font-bold border ${darkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {verificationError && (
                            <p className="text-red-500 text-xs mt-2 font-medium">{verificationError}</p>
                        )}
                    </div>
                </div>
            );
        case 'security':
            return (
                <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-4">
                        <Lock className="text-blue-500 shrink-0 mt-1" />
                        <div>
                            <h4 className="font-bold text-blue-500">Change Admin Password</h4>
                            <p className="text-xs text-blue-400 mt-1">Ensure your password is at least 12 characters and includes symbols.</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black uppercase text-gray-500 mb-2">Current Admin Password</label>
                            <input
                                type="password"
                                value={security.currentPassword}
                                onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                                className={`w-full p-4 rounded-xl border-none ring-1 ring-gray-200 dark:ring-white/10 outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700/50 text-white' : 'bg-gray-50 text-gray-900'}`}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-500 mb-2">New Password</label>
                                <input
                                    type="password"
                                    value={security.newPassword}
                                    onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                                    className={`w-full p-4 rounded-xl border-none ring-1 ring-gray-200 dark:ring-white/10 outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700/50 text-white' : 'bg-gray-50 text-gray-900'}`}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-500 mb-2">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={security.confirmPassword}
                                    onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                                    className={`w-full p-4 rounded-xl border-none ring-1 ring-gray-200 dark:ring-white/10 outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700/50 text-white' : 'bg-gray-50 text-gray-900'}`}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            );
        case 'system':
            return (
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-black uppercase text-gray-500 mb-2">Admin API Key</label>
                        <input
                            type="text"
                            value={system.apiKey}
                            readOnly
                            className={`w-full p-4 rounded-xl border-none ring-1 ring-gray-200 dark:ring-white/10 opacity-70 ${darkMode ? 'bg-gray-700/50 text-white' : 'bg-gray-50 text-gray-900'}`}
                        />
                    </div>
                </div>
            );
        case 'danger':
            return (
                <div className="space-y-6">
                    {/* Wiping Full-Screen Overlay */}
                    {wiping && (
                        <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-md flex flex-col items-center justify-center gap-6">
                            <div className="relative flex items-center justify-center">
                                <div className="w-20 h-20 rounded-full border-4 border-rose-500/20 border-t-rose-500 animate-spin" />
                                <div className="absolute w-12 h-12 rounded-full border-4 border-rose-400/20 border-t-rose-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.6s' }} />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-white text-xl font-black tracking-tight">Wiping System Data</h3>
                                <p className="text-rose-300 text-sm font-medium">Deleting all records, wards, departments and non-admin users…</p>
                                <p className="text-gray-500 text-xs">Do not close this window.</p>
                            </div>
                            <div className="flex gap-1.5 mt-2">
                                {[0, 1, 2, 3, 4].map(i => (
                                    <div
                                        key={i}
                                        className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-bounce"
                                        style={{ animationDelay: `${i * 0.1}s` }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-4 animate-pulse">
                        <AlertTriangle className="text-rose-500 shrink-0 mt-1" />
                        <div>
                            <h4 className="font-bold text-rose-500">Irreversible Administration Event</h4>
                            <p className="text-xs text-rose-400 mt-1">
                                Wiping out system data will delete <strong>all</strong> issues, repairs, notifications, departments, wards, cities (ULBs), and all non-admin user accounts.
                                Once executed, the platform will require re-configuring city boundaries and departments from scratch.
                            </p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black uppercase text-gray-500 mb-2">Confirmation Verification</label>
                            <p className="text-xs text-gray-400 mb-3">To proceed, please type <code className="font-mono bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-black">WIPE ALL DATA</code> below:</p>
                            <input
                                type="text"
                                value={wipeConfirm}
                                onChange={(e) => setWipeConfirm(e.target.value)}
                                disabled={wiping}
                                placeholder="Type 'WIPE ALL DATA'"
                                className={`w-full p-4 rounded-xl border-none ring-1 ring-rose-500/30 outline-none focus:ring-2 focus:ring-rose-500 font-bold transition-opacity ${wiping ? 'opacity-40 cursor-not-allowed' : ''} ${darkMode ? 'bg-gray-700/50 text-white' : 'bg-rose-50 text-gray-900'}`}
                            />
                        </div>
                        <button
                            type="button"
                            disabled={wipeConfirm !== 'WIPE ALL DATA' || wiping}
                            onClick={onWipe}
                            className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                                wiping
                                    ? 'bg-rose-900/50 text-rose-300 cursor-not-allowed'
                                    : wipeConfirm === 'WIPE ALL DATA'
                                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-500/20 active:scale-95'
                                        : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {wiping ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-rose-300/40 border-t-rose-300 rounded-full animate-spin" />
                                    Wiping System…
                                </>
                            ) : (
                                <>
                                    <Trash2 size={16} />
                                    Wipe Out System Data
                                </>
                            )}
                        </button>
                    </div>
                </div>
            );
        case 'notifications':
            return (
                <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/10">
                        <div>
                            <h4 className="font-bold text-sm">System Alerts</h4>
                            <p className="text-xs text-gray-500 mt-1">Get notified on key administrative events, backups, and error limits.</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={notifications?.systemAlerts ?? true}
                            onChange={(e) => setNotifications({ ...notifications, systemAlerts: e.target.checked })}
                            className="w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500 cursor-pointer"
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/10">
                        <div>
                            <h4 className="font-bold text-sm">Email Alerts</h4>
                            <p className="text-xs text-gray-500 mt-1">Receive daily automated digests of unresolved municipal reports directly to your inbox.</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={notifications?.emailNotifications ?? true}
                            onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
                            className="w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500 cursor-pointer"
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/10">
                        <div>
                            <h4 className="font-bold text-sm">Issue Updates</h4>
                            <p className="text-xs text-gray-500 mt-1">Get notified when issues are escalated or resolution statuses are updated by staff.</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={notifications?.issueUpdates ?? true}
                            onChange={(e) => setNotifications({ ...notifications, issueUpdates: e.target.checked })}
                            className="w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500 cursor-pointer"
                        />
                    </div>
                </div>
            );
        default:
            return <div className="p-8 text-center text-gray-500">Coming soon...</div>;
    }
};

export default SettingsSection;
