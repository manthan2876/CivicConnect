import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { usersApi } from '../services/usersApi';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const determineRole = (supabaseUser, profile) => {
        let role = 'citizen';
        if (profile?.roles && profile.roles.length > 0) role = profile.roles[0];
        else if (profile?.role) role = profile.role;
        else if (supabaseUser?.user_metadata?.role) role = supabaseUser.user_metadata.role;

        return role.toLowerCase();
    };

    useEffect(() => {
        // 1. Initial Session Check
        supabase.auth.getSession().then(({ data, error }) => {
            if (error) {
                console.error("Session verification error:", error.message);
                supabase.auth.signOut().catch(() => {});
                setInitialLoading(false);
                return;
            }
            const session = data?.session;
            if (session) {
                // Fetch profile and determine role
                usersApi.getMe()
                    .then(profile => {
                        setUser({
                            ...session.user,
                            ...profile,
                            name: profile?.name || session.user?.user_metadata?.name || '',
                            avatar_url: profile?.avatar_url || session.user?.user_metadata?.avatar_url || '',
                            role: determineRole(session.user, profile),
                            token: session.access_token
                        });
                        setInitialLoading(false);
                    })
                    .catch(err => {
                        setUser({
                            ...session.user,
                            name: session.user?.user_metadata?.name || '',
                            avatar_url: session.user?.user_metadata?.avatar_url || '',
                            role: determineRole(session.user, null),
                            token: session.access_token
                        });
                        setInitialLoading(false);
                    });
            } else {
                setInitialLoading(false);
            }
        }).catch(err => {
            console.error("Fatal getSession error:", err);
            supabase.auth.signOut().catch(() => {});
            setInitialLoading(false);
        });

        // 2. Listen for Auth Changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                setLoading(true); // Ensure app knows a profile is loading
                usersApi.getMe()
                    .then(profile => {
                        setUser({
                            ...session.user,
                            ...profile,
                            name: profile?.name || session.user?.user_metadata?.name || '',
                            avatar_url: profile?.avatar_url || session.user?.user_metadata?.avatar_url || '',
                            role: determineRole(session.user, profile),
                            token: session.access_token
                        });
                        setLoading(false);
                    })
                    .catch(err => {
                        setUser({
                            ...session.user,
                            name: session.user?.user_metadata?.name || '',
                            avatar_url: session.user?.user_metadata?.avatar_url || '',
                            role: determineRole(session.user, null),
                            token: session.access_token
                        });
                        setLoading(false);
                    });
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            throw error;
        }
        return data;
    };

    const signInWithPhone = async (phone) => {
        const { data, error } = await supabase.auth.signInWithOtp({
            phone,
        });
        if (error) {
            throw error;
        }
        return data;
    };

    const verifyPhoneOtp = async (phone, token) => {
        const { data, error } = await supabase.auth.verifyOtp({
            phone,
            token,
            type: 'sms',
        });
        if (error) {
            throw error;
        }
        return data;
    };

    const linkPhone = async (phone) => {
        const { data, error } = await supabase.auth.updateUser({
            phone,
        });
        if (error) {
            throw error;
        }
        return data;
    };

    const verifyLinkedPhone = async (phone, token) => {
        const { data, error } = await supabase.auth.verifyOtp({
            phone,
            token,
            type: 'phone_change',
        });
        if (error) {
            throw error;
        }
        return data;
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    const updateUser = (data) => {
        setUser(prev => ({ ...prev, ...data }));
    };

    const can = (permission) => {
        if (!user || !user.permissions) return false;
        return user.permissions.includes(permission);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading: loading || initialLoading, signInWithPhone, verifyPhoneOtp, linkPhone, verifyLinkedPhone, updateUser, determineRole, can }}>
            {initialLoading ? (
                <div className="flex h-screen w-screen items-center justify-center bg-gray-900">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-white font-bold">Verifying Identity Configuration...</p>
                    </div>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
