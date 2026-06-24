import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Hexagon, Mail, Lock, Phone, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import logo from '../assets/logo.png';

const Login = () => {
    const navigate = useNavigate();
    const { login, signInWithPhone, verifyPhoneOtp } = useAuth();
    const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [phoneData, setPhoneData] = useState({ phone: '', otp: '' });
    const [otpSent, setOtpSent] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isShaking, setIsShaking] = useState(false);

    useEffect(() => {
        const isDark = localStorage.getItem('theme') === 'dark';
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const handleChange = (e) => {
        setError('');
        setIsShaking(false);
        if (loginMethod === 'email') {
            setCredentials({ ...credentials, [e.target.name]: e.target.value });
        } else {
            setPhoneData({ ...phoneData, [e.target.name]: e.target.value });
        }
    };

    const handleSendOtp = async () => {
        setError('');
        setIsLoading(true);
        try {
            console.log('--- Initiating Phone OTP Sign-in ---');
            await signInWithPhone(phoneData.phone);
            setOtpSent(true);
            setIsLoading(false);
        } catch (error) {
            console.error('[Dashboard Login] Phone OTP Send Error:', error);
            setError(error.message || 'Failed to send OTP.');
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            let user;
            if (loginMethod === 'email') {
                console.log('--- Initiating Email Sign-in ---');
                const data = await login(credentials.email, credentials.password);
                user = data.user;
            } else {
                console.log('--- Initiating Phone OTP Verification ---');
                const data = await verifyPhoneOtp(phoneData.phone, phoneData.otp);
                user = data.user;
            }

            console.log('[Dashboard Login] Success:', user.email || user.phone);
            
            let userRole = 'citizen';
            try {
                const profile = await api.get('/users/me');
                userRole = (profile.role || user.user_metadata?.role || user.role || 'citizen').toLowerCase();
            } catch (profileErr) {
                console.warn('[Dashboard Login] Could not fetch profile, falling back to metadata:', profileErr);
                userRole = (user.user_metadata?.role || user.role || 'citizen').toLowerCase();
            }

            if (userRole === 'super_admin') {
                navigate('/superadmin/dashboard');
            } else if (userRole === 'admin') {
                navigate('/admin/dashboard');
            } else if (userRole === 'authority') {
                navigate('/authority/dashboard');
            } else if (userRole === 'staff') {
                navigate('/staff/dashboard');
            } else {
                console.error('[Dashboard Login] Access Denied: Role is', userRole);
                setError('Access denied: Citizens must use the mobile app.');
                setIsShaking(true);
                setIsLoading(false);
            }
        } catch (error) {
            console.error('[Dashboard Login] General Authentication Error:', error);
            setError(error.message || 'Authentication failed.');
            setIsShaking(true);
            setIsLoading(false);
        }
    };


    return (
        <div className="flex min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
            {/* Left Side - Hero / Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900 justify-center items-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-900 opacity-90 z-10" />
                <img
                    src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
                    alt="City Background"
                    className="absolute inset-0 w-full h-full object-cover"
                />

                <div className="relative z-20 text-white max-w-lg px-8">
                    <div className="mb-6 flex items-center gap-2">
                        <div className="p-2 bg-white rounded-2xl shadow-xl">
                            <img src={logo} className="w-12 h-12 object-contain" alt="Logo" />
                        </div>
                        <h1 className="text-4xl font-extrabold mb-2 text-white">
                            Civic Connect
                        </h1>
                    </div>
                    <p className="text-gray-300 mb-8 font-medium">Dashboard Access Control</p>
                    <p className="text-blue-100 text-lg leading-relaxed">
                        Securely manage your city's infrastructure reports and administrative tasks.
                    </p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 relative">
                <div className={`w-full max-w-md space-y-8 transition-all duration-500 ${isShaking ? 'animate-shake' : ''}`}>
                    <div className="text-center lg:text-left">
                        <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Access Portal</h2>
                        <p className="mt-2 text-gray-500 dark:text-gray-400 font-medium">Municipal Administrative & Field Control</p>
                        <div className="mt-8 flex p-1.5 bg-gray-100 dark:bg-gray-800/80 rounded-2xl backdrop-blur-sm border border-gray-200/50 dark:border-white/5">
                            <button
                                onClick={() => { setLoginMethod('email'); setError(''); setOtpSent(false); setIsShaking(false); }}
                                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${loginMethod === 'email' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-md ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                Admin ID
                            </button>
                            <button
                                onClick={() => { setLoginMethod('phone'); setError(''); setIsShaking(false); }}
                                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${loginMethod === 'phone' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-md ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                Field Mobile
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                        {error && (
                            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-500 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 backdrop-blur-md">
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Entry Restricted</p>
                                    <p className="opacity-90 mt-0.5 text-xs font-medium">{error}</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            {loginMethod === 'email' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Mail className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="email"
                                                name="email"
                                                value={credentials.email}
                                                onChange={handleChange}
                                                className="block w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                                placeholder="admin@civicconnect.gov"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="password"
                                                name="password"
                                                value={credentials.password}
                                                onChange={handleChange}
                                                className="block w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                                placeholder="••••••••"
                                                required={loginMethod === 'email'}
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Phone className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={phoneData.phone}
                                                onChange={handleChange}
                                                className="block w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                                placeholder="+91 XXXXX XXXXX"
                                                required={loginMethod === 'phone'}
                                                disabled={otpSent}
                                            />
                                        </div>
                                    </div>
                                    {otpSent && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Verification Code</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <MessageSquare className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    name="otp"
                                                    value={phoneData.otp}
                                                    onChange={handleChange}
                                                    className="block w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                                    placeholder="6-digit code"
                                                    required={otpSent}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {!otpSent && loginMethod === 'phone' ? (
                            <button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={isLoading || !phoneData.phone}
                                className="w-full flex items-center justify-center px-4 py-4 border border-transparent text-sm font-black uppercase tracking-widest rounded-2xl text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    'Initialize Secure Link'
                                )}
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex items-center justify-center px-4 py-4 border border-transparent text-sm font-black uppercase tracking-widest rounded-2xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    loginMethod === 'email' ? 'Authorize Access' : 'Confirm Identity'
                                )}
                            </button>
                        )}

                        {otpSent && (
                            <button
                                type="button"
                                onClick={() => setOtpSent(false)}
                                className="w-full text-center text-xs text-blue-500 font-medium hover:underline"
                            >
                                Edit Phone Number
                            </button>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
