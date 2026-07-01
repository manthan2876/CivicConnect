import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { usersApi } from '../../../services/usersApi';
import { adminApi } from '../../../services/adminApi';
import { supabase } from '../../../config/supabase';

export const useAdminSettings = () => {
    const { user, updateUser, logout, linkPhone, verifyLinkedPhone } = useAuth();
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [activeSection, setActiveSection] = useState('profile');

    const [profile, setProfile] = useState({
        name: user?.name || 'Administrator',
        email: user?.email || 'admin@civicconnect.gov',
        phone: user?.phone || '',
        role: user?.role || 'Administrator',
    });

    const [otpSent, setOtpSent] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationError, setVerificationError] = useState('');

    const handleSendPhoneOtp = async (newPhone) => {
        setVerificationError('');
        setSaving(true);
        try {
            await linkPhone(newPhone);
            setOtpSent(true);
        } catch (err) {
            setVerificationError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleVerifyPhoneOtp = async (newPhone, token) => {
        setVerificationError('');
        setIsVerifying(true);
        try {
            await verifyLinkedPhone(newPhone, token);
            updateUser({ phone: newPhone });
            setProfile(prev => ({ ...prev, phone: newPhone }));
            setOtpSent(false);
            setOtpCode('');
            alert('Phone number verified successfully!');
        } catch (err) {
            setVerificationError(err.message);
        } finally {
            setIsVerifying(false);
        }
    };

    const [notifications, setNotifications] = useState({
        systemAlerts: user?.user_metadata?.notification_preferences?.systemAlerts ?? true,
        emailNotifications: user?.user_metadata?.notification_preferences?.emailNotifications ?? true,
        issueUpdates: user?.user_metadata?.notification_preferences?.issueUpdates ?? true,
    });

    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingAvatar(true);
        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const data = await usersApi.uploadAvatar(formData);
            
            updateUser({
                ...user,
                userMetadata: {
                    ...(user?.userMetadata || {}),
                    avatar_url: data.avatar_url
                },
                user_metadata: {
                    ...(user?.user_metadata || {}),
                    avatar_url: data.avatar_url
                }
            });
            alert('Profile photo updated successfully!');
        } catch (err) {
            alert('Failed to upload avatar: ' + err.message);
        } finally {
            setUploadingAvatar(false);
        }
    };

    const [security, setSecurity] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [regional, setRegional] = useState({
        language: 'English (US)',
        timezone: 'GMT+05:30 IST',
    });

    const [system, setSystem] = useState({
        apiKey: 'sk_admin_live_v8...hidden',
        webhookUrl: 'https://api.civicconnect.gov/hooks/admin',
    });

    // Danger Zone state
    const [wipeConfirm, setWipeConfirm] = useState('');
    const [wiping, setWiping] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            if (activeSection === 'profile') {
                const updatedUserData = await usersApi.updateProfile(user.id, {
                    name: profile.name
                });
                updateUser(updatedUserData);
            } else if (activeSection === 'security' && security.newPassword) {
                if (security.newPassword !== security.confirmPassword) {
                    alert("Passwords do not match!");
                    setSaving(false);
                    return;
                }
                await usersApi.changePassword({
                    currentPassword: security.currentPassword,
                    newPassword: security.newPassword
                });
                setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else if (activeSection === 'notifications') {
                const { error } = await supabase.auth.updateUser({
                    data: {
                        ...(user?.user_metadata || {}),
                        notification_preferences: notifications
                    }
                });
                if (error) throw error;
                updateUser({
                    ...user,
                    user_metadata: {
                        ...(user?.user_metadata || {}),
                        notification_preferences: notifications
                    }
                });
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleWipeData = async () => {
        if (wipeConfirm !== 'WIPE ALL DATA') return;
        if (!window.confirm('WARNING: THIS IS YOUR FINAL CONFIRMATION. Are you absolutely sure you want to delete all municipal system data, departments, wards, and non-admin users?')) return;
        
        try {
            setWiping(true);
            await adminApi.wipeData();
            alert('System wiped successfully! Logging you out to reset administrative session.');
            logout();
        } catch (err) {
            alert('Wipe failed: ' + err.message);
        } finally {
            setWiping(false);
        }
    };

    return {
        profile,
        setProfile,
        notifications,
        setNotifications,
        security,
        setSecurity,
        regional,
        setRegional,
        system,
        setSystem,
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
        uploadingAvatar,
        handleAvatarChange
    };
};
