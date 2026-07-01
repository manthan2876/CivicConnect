import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Bell, Search, Moon, Sun, Menu, X, Terminal, FileText, User as UserIcon, Building } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import { useUniversalSearch } from '../hooks/useUniversalSearch';


const DashboardLayout = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const {
        searchQuery,
        setSearchQuery,
        showSearchDropdown,
        setShowSearchDropdown,
        searchResults,
        activeIndex,
        setActiveIndex,
        prefetchSearchData,
        getFlattenedResults,
        handleSelectResult,
        searchRef
    } = useUniversalSearch(user);

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(/[\s@]/).map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    useEffect(() => {
        if (!user) return;

        const fetchNotifications = async () => {
            try {
                const { data, error } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('createdAt', { ascending: false })
                    .limit(20);

                if (error) throw error;
                setNotifications(data || []);
                setUnreadCount(data?.filter(n => !n.is_read).length || 0);
            } catch (error) {
                console.error('Error fetching notifications:', error);
            }
        };

        fetchNotifications();

        const subscription = supabase
            .channel(`user-notifications-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    const record = payload.new;
                    if (record) {
                        const normalizedNotif = {
                            id: record.id,
                            title: record.title || 'New Notification',
                            body: record.body || 'Details...',
                            createdAt: record.createdAt || record.created_at || new Date().toISOString(),
                            is_read: record.is_read || false
                        };
                        setNotifications(prev => [normalizedNotif, ...prev]);
                        setUnreadCount(prev => prev + 1);
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user]);

    const markAllAsRead = async () => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id);
            if (error) throw error;
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking all notifications as read:', err);
        }
    };

    const markAsRead = async (id) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);
            if (error) throw error;
            setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    return (
        <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 ${darkMode ? 'dark bg-gray-950 text-gray-100' : 'bg-white text-gray-900'}`}>
            
            {/* Sidebar with mobile state */}
            <Sidebar darkMode={darkMode} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            {/* Mobile Backdrop */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm animate-fade-in"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <div className="flex-1 flex flex-col overflow-hidden relative">
                <header className={`flex justify-between items-center py-4 px-4 md:px-8 border-b z-30 sticky top-0 transition-colors duration-300 ${darkMode ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 md:hidden hover:bg-gray-500/10 rounded-lg transition-colors"
                        >
                            <Menu size={24} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
                        </button>
                        
                        <div ref={searchRef} className="relative w-64 lg:w-96 hidden md:block">
                            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                            <input
                                type="text"
                                placeholder="Search system..."
                                value={searchQuery}
                                onFocus={() => {
                                    prefetchSearchData();
                                    setShowSearchDropdown(true);
                                }}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    const flattened = getFlattenedResults();
                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        setActiveIndex(prev => (prev + 1) % (flattened.length || 1));
                                    } else if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        setActiveIndex(prev => (prev - 1 + flattened.length) % (flattened.length || 1));
                                    } else if (e.key === 'Enter') {
                                        handleSelectResult(flattened[activeIndex]);
                                    } else if (e.key === 'Escape') {
                                        setShowSearchDropdown(false);
                                    }
                                }}
                                className={`w-full pl-10 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${darkMode ? 'bg-gray-900 border-gray-800 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                            />
                            
                            {showSearchDropdown && searchQuery && (
                                <div className={`absolute top-full left-0 right-0 mt-2 max-h-96 overflow-y-auto border shadow-2xl rounded-2xl z-50 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                                    {getFlattenedResults().length === 0 ? (
                                        <div className="p-6 text-center text-sm text-gray-500">
                                            No results found for "{searchQuery}"
                                        </div>
                                    ) : (
                                        <div className="p-2 space-y-3">
                                            {/* Render Navigation Jumps */}
                                            {searchResults.pages.length > 0 && (
                                                <div>
                                                    <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gray-400">Pages</div>
                                                    {searchResults.pages.map((p, idx) => {
                                                        const flatIdx = idx;
                                                        const isSelected = flatIdx === activeIndex;
                                                        return (
                                                            <div
                                                                key={p.path}
                                                                onClick={() => handleSelectResult({ type: 'page', data: p })}
                                                                className={`p-2.5 rounded-xl cursor-pointer transition-colors flex items-center gap-3 ${isSelected ? 'bg-blue-500 text-white' : darkMode ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-50 text-gray-800'}`}
                                                            >
                                                                <Terminal size={16} />
                                                                <div>
                                                                    <div className="text-xs font-bold">{p.title}</div>
                                                                    <div className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>{p.desc}</div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Render Issues */}
                                            {searchResults.issues.length > 0 && (
                                                <div>
                                                    <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gray-400">Reports / Issues</div>
                                                    {searchResults.issues.map((issue, idx) => {
                                                        const flatIdx = searchResults.pages.length + idx;
                                                        const isSelected = flatIdx === activeIndex;
                                                        return (
                                                            <div
                                                                key={issue.id}
                                                                onClick={() => handleSelectResult({ type: 'issue', data: issue })}
                                                                className={`p-2.5 rounded-xl cursor-pointer transition-colors flex items-center gap-3 ${isSelected ? 'bg-blue-500 text-white' : darkMode ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-50 text-gray-800'}`}
                                                            >
                                                                <FileText size={16} />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-xs font-bold truncate">{issue.title}</div>
                                                                    <div className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>{issue.category} • {issue.status}</div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Render Users */}
                                            {searchResults.users.length > 0 && (
                                                <div>
                                                    <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gray-400">Users & Staff</div>
                                                    {searchResults.users.map((u, idx) => {
                                                        const flatIdx = searchResults.pages.length + searchResults.issues.length + idx;
                                                        const isSelected = flatIdx === activeIndex;
                                                        return (
                                                            <div
                                                                key={u.id}
                                                                onClick={() => handleSelectResult({ type: 'user', data: u })}
                                                                className={`p-2.5 rounded-xl cursor-pointer transition-colors flex items-center gap-3 ${isSelected ? 'bg-blue-500 text-white' : darkMode ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-50 text-gray-800'}`}
                                                            >
                                                                <UserIcon size={16} />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-xs font-bold truncate">{u.name}</div>
                                                                    <div className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>{u.email} • {u.role}</div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Render Departments */}
                                            {searchResults.departments.length > 0 && (
                                                <div>
                                                    <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gray-400">Departments</div>
                                                    {searchResults.departments.map((d, idx) => {
                                                        const flatIdx = searchResults.pages.length + searchResults.issues.length + searchResults.users.length + idx;
                                                        const isSelected = flatIdx === activeIndex;
                                                        return (
                                                            <div
                                                                key={d.id}
                                                                onClick={() => handleSelectResult({ type: 'department', data: d })}
                                                                className={`p-2.5 rounded-xl cursor-pointer transition-colors flex items-center gap-3 ${isSelected ? 'bg-blue-500 text-white' : darkMode ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-50 text-gray-800'}`}
                                                            >
                                                                <Building size={16} />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-xs font-bold truncate">{d.name}</div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className={`p-2 transition-colors rounded-lg hover:bg-gray-500/10 ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                            title="Toggle Theme"
                        >
                            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative text-gray-500 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-gray-500/10"
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                                )}
                            </button>

                            {showNotifications && (
                                <div className={`absolute right-0 mt-4 w-72 md:w-80 border overflow-hidden shadow-2xl rounded-2xl z-50 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                                    <div className={`p-4 border-b flex justify-between items-center ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-gray-50'}`}>
                                        <h3 className="font-bold text-sm">Notifications</h3>
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-xs text-blue-500 font-bold hover:underline">Mark all as read</button>
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                        {notifications.length > 0 ? (
                                            notifications.map((notif) => (
                                                <div
                                                    key={notif.id}
                                                    onClick={() => !notif.is_read && markAsRead(notif.id)}
                                                    className={`p-4 border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer ${!notif.is_read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                                                >
                                                    <p className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{notif.title}</p>
                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notif.body}</p>
                                                    <p className="text-[10px] text-gray-400 mt-2">{new Date(notif.createdAt).toLocaleString()}</p>
                                                </div>
                                            ))

                                        ) : (
                                            <div className="p-8 text-center text-gray-500 text-sm font-medium">
                                                No notifications found
                                            </div>
                                        )}
                                    </div>
                                    <div className={`p-3 text-center border-t ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-gray-50'}`}>
                                        <button className="text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">View All Notifications</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 pl-2 border-l border-gray-200 dark:border-gray-800">
                            <div className="text-right hidden sm:block">
                                <p className={`text-sm font-bold leading-none ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{user?.name || user?.email?.split('@')[0] || 'User'}</p>
                                <div className="flex justify-end mt-1">
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${darkMode ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-gray-100 text-gray-600 border-gray-200'
                                        }`}>
                                        {user?.role || 'Observer'}
                                    </span>
                                </div>
                            </div>
                            <div className={`h-9 w-9 flex items-center justify-center text-xs font-bold rounded-xl border transition-all overflow-hidden cursor-pointer ${darkMode ? 'bg-gray-900 text-white border-gray-700 hover:border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300 hover:border-gray-400'
                                }`}>
                                {user?.avatar_url || user?.user_metadata?.avatar_url ? (
                                    <img
                                        src={user.avatar_url || user.user_metadata.avatar_url}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    getInitials(user?.name || user?.email)
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <main className={`flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 scroll-smooth relative transition-colors duration-300 ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
                    <Outlet context={{ darkMode }} />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
