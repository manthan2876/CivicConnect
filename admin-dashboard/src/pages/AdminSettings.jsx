import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAdminSettings } from '../features/settings/hooks/useAdminSettings';
import { SETTINGS_SECTIONS } from '../features/settings/constants/settingsSections';
import SettingsSection from '../features/settings/components/SettingsSection';

const AdminSettings = () => {
    const { darkMode } = useOutletContext();
    const {
        profile,
        setProfile,
        security,
        setSecurity,
        system,
        wipeConfirm,
        setWipeConfirm,
        wiping,
        saving,
        saved,
        activeSection,
        setActiveSection,
        handleSave,
        handleWipeData,
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
    } = useAdminSettings();

    const activeInfo = SETTINGS_SECTIONS.find(s => s.id === activeSection);

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div>
                <h1 className={`text-4xl font-extrabold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Admin Settings</h1>
                <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Manage system-wide parameters and admin security.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-3">
                    {SETTINGS_SECTIONS.map((section) => {
                        const Icon = section.icon;
                        const isActive = activeSection === section.id;
                        return (
                            <div
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`p-4 rounded-2xl border cursor-pointer transition-all ${isActive
                                    ? 'bg-violet-600 border-violet-600 text-white shadow-lg'
                                    : darkMode ? 'bg-gray-800/50 border-white/5 hover:border-violet-500/50' : 'bg-white border-gray-100 hover:border-violet-500/50 shadow-sm'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20' : 'bg-violet-500/10 text-violet-500'}`}>
                                        <Icon size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm">{section.title}</h3>
                                        <p className={`text-[10px] ${isActive ? 'text-violet-100' : 'text-gray-500'}`}>{section.desc}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className={`lg:col-span-2 p-8 rounded-3xl shadow-xl border-none flex flex-col ${darkMode ? 'bg-gray-800/50' : 'bg-white shadow-gray-200/50'}`}>
                    <h2 className={`text-xl font-black mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {activeInfo?.title}
                    </h2>
                    <div className="flex-1">
                        <SettingsSection
                            activeSection={activeSection}
                            profile={profile}
                            setProfile={setProfile}
                            security={security}
                            setSecurity={setSecurity}
                            system={system}
                            wipeConfirm={wipeConfirm}
                            setWipeConfirm={setWipeConfirm}
                            wiping={wiping}
                            onWipe={handleWipeData}
                            darkMode={darkMode}
                            otpSent={otpSent}
                            setOtpSent={setOtpSent}
                            otpCode={otpCode}
                            setOtpCode={setOtpCode}
                            isVerifying={isVerifying}
                            verificationError={verificationError}
                            handleSendPhoneOtp={handleSendPhoneOtp}
                            handleVerifyPhoneOtp={handleVerifyPhoneOtp}
                            notifications={notifications}
                            setNotifications={setNotifications}
                            uploadingAvatar={uploadingAvatar}
                            handleAvatarChange={handleAvatarChange}
                        />
                    </div>
                    {activeSection !== 'danger' && (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`mt-8 py-4 rounded-2xl shadow-xl transition-all font-black ${saved ? 'bg-green-500 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white'}`}
                        >
                            {saving ? 'Processing...' : saved ? 'Admin Config Updated!' : 'Save Admin Settings'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
