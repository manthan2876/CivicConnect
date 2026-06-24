import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, FileText, Map, Users,
    Settings, LogOut, Trophy, BrainCircuit,
    UserCog, ChevronRight, X, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

const Sidebar = ({ darkMode, isOpen, setIsOpen }) => {
    const location = useLocation();
    const { user, logout } = useAuth();
    const isActive = (path) => location.pathname === path;

    const isAdmin = user?.role === 'Admin' || user?.role === 'super_admin';
    const isSuperAdmin = user?.role === 'super_admin';
    const prefix = isSuperAdmin ? '/superadmin' : (isAdmin ? '/admin' : '/authority');

    const navItems = [
        { path: `${prefix}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
        { path: `${prefix}/issues`, label: 'Issues', icon: FileText },
        { path: `${prefix}/map`, label: 'Live Map', icon: Map },
        { path: `${prefix}/leaderboard`, label: 'Leaderboard', icon: Trophy },
        ...(isAdmin ? [{ path: `${prefix}/analytics`, label: 'Executive AI', icon: Sparkles }] : []),
        ...(isAdmin ? [{ path: '/admin/ai-retraining', label: 'AI Retraining', icon: BrainCircuit }] : []),
        ...(isAdmin ? [{ path: '/admin/departments', label: 'Departments', icon: Users }] : []),
        ...(isAdmin ? [{ path: '/admin/users', label: 'Users', icon: UserCog }] : []),
        { path: `${prefix}/settings`, label: 'Settings', icon: Settings },
    ];

    return (
        <aside className={`fixed md:relative inset-y-0 left-0 z-50 w-72 h-full flex flex-col px-6 py-8 border-r shadow-2xl transition-all duration-300 transform 
            ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
            ${darkMode ? 'bg-[#0f172a] border-white/5' : 'bg-white border-gray-100'}`}>
            
            {/* Close button for mobile */}
            <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 md:hidden text-gray-500 hover:bg-gray-500/10 rounded-lg transition-colors"
            >
                <X size={20} />
            </button>

            {/* Logo Section */}
            <div className="flex items-center gap-4 mb-10 px-2">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <div className={`relative p-2 rounded-xl border transition-colors ${darkMode ? 'bg-[#0f172a] border-white/10' : 'bg-white border-gray-100'}`}>
                        <img src={logo} className="w-7 h-7 object-contain brightness-110" alt="Logo" />
                    </div>
                </div>
                <div>
                    <h1 className={`text-lg font-black tracking-tight transition-colors ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Civic<span className="text-violet-500">Connect</span>
                    </h1>
                    <p className={`text-[9px] font-black tracking-[0.2em] uppercase ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>MUNICIPAL HUB</p>
                </div>
            </div>

            {/* Navigation Section */}
            <div className="flex flex-col justify-between flex-1 overflow-y-auto scrollbar-hide">
                <nav className="space-y-1">
                    {navItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsOpen(false)}
                                className={`group relative flex items-center px-4 py-3 transition-all duration-300 rounded-xl font-bold text-sm ${active
                                    ? 'bg-violet-600/10 text-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.05)]'
                                    : (darkMode ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200' : 'text-slate-500 hover:bg-gray-50 hover:text-gray-900')
                                    }`}
                            >
                                {active && (
                                    <div className="absolute left-0 w-1 h-5 bg-violet-500 rounded-r-full shadow-[0_0_15px_rgba(139,92,246,0.5)]"></div>
                                )}
                                <item.icon className={`w-4.5 h-4.5 mr-3 transition-colors ${active ? 'text-violet-500' : 'text-slate-500 group-hover:text-slate-600'}`} strokeWidth={active ? 2.5 : 2} />
                                <span className={active ? "translate-x-0.5 transition-transform" : ""}>{item.label}</span>
                                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-violet-500/50" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer Section */}
                <div className="mt-8 pb-4">
                    <button
                        onClick={logout}
                        className={`flex items-center w-full px-4 py-3.5 transition-all duration-300 rounded-xl font-black text-xs border border-transparent ${darkMode ? 'text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20' : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100'}`}
                    >
                        <LogOut className="w-4.5 h-4.5 mr-3" strokeWidth={2.5} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
