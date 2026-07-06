import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportsApi } from '../services/reportsApi';
import { usersApi } from '../services/usersApi';
import { departmentsApi } from '../services/departmentsApi';

export const useUniversalSearch = (user) => {
    const navigate = useNavigate();
    const searchRef = useRef(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [allIssues, setAllIssues] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [allDepartments, setAllDepartments] = useState([]);
    const [searchResults, setSearchResults] = useState({
        pages: [],
        issues: [],
        users: [],
        departments: []
    });
    const [activeIndex, setActiveIndex] = useState(0);

    const getRolePrefix = () => {
        const role = (user?.role || '').toLowerCase();
        if (role === 'authority' || role === 'dept_head') return '/authority';
        if (role === 'staff' || role === 'field_officer') return '/staff';
        if (role === 'mayor') return '/mayor';
        if (role === 'councilor') return '/councilor';
        if (role === 'super_admin') return '/superadmin';
        return '/admin';
    };

    const getAccessiblePages = () => {
        const role = (user?.role || '').toLowerCase();
        const prefix = getRolePrefix();
        
        const pages = [
            { title: 'Dashboard', path: `${prefix}/dashboard`, desc: 'Main control center overview' },
            { title: 'Personal Settings', path: `${prefix}/settings`, desc: 'Manage profile and preferences' }
        ];

        if (role === 'admin' || role === 'super_admin' || role === 'hq_staff') {
            pages.push(
                { title: 'Issues / Reports', path: '/admin/issues', desc: 'Browse all municipal issues list' },
                { title: 'Live Map', path: '/admin/map', desc: 'GIS Map visualization of reports' },
                { title: 'Leaderboard', path: '/admin/leaderboard', desc: 'Department and staff performance metrics' },
                { title: 'Executive Analytics', path: '/admin/analytics', desc: 'High-level city-wide insights' }
            );
        } else if (role === 'authority' || role === 'dept_head') {
            pages.push(
                { title: 'Issues / Reports', path: '/authority/issues', desc: 'Browse all municipal issues list' },
                { title: 'Live Map', path: '/authority/map', desc: 'GIS Map visualization of reports' },
                { title: 'Leaderboard', path: '/authority/leaderboard', desc: 'Department and staff performance metrics' }
            );
        } else if (role === 'staff' || role === 'field_officer') {
            pages.push(
                { title: 'Issues / Reports', path: '/staff/issues', desc: 'Browse all municipal issues list' }
            );
        }

        if (role === 'admin' || role === 'super_admin') {
            pages.push(
                { title: 'Jurisdictions / Wards', path: `${prefix}/jurisdictions`, desc: 'Manage city sectors and boundary regions' },
                { title: 'Users & Staff', path: `${prefix}/users`, desc: 'Manage user and staff directory' }
            );
        }
        
        if (role === 'admin') {
            pages.push(
                { title: 'Departments', path: '/admin/departments', desc: 'Manage city administrative departments' },
                { title: 'AI Retraining Queue', path: '/admin/ai-retraining', desc: 'Audit and retrain automated report classifier' },
                { title: 'Audit Logs', path: '/admin/audit-logs', desc: 'System actions activity ledger' }
            );
        }

        if (role === 'super_admin') {
            pages.push(
                { title: 'Executive Analytics', path: '/superadmin/analytics', desc: 'High-level city-wide insights' }
            );
        }

        return pages;
    };

    const prefetchSearchData = async () => {
        try {
            const reports = await reportsApi.getAll();
            setAllIssues(reports || []);

            const depts = await departmentsApi.getAll();
            setAllDepartments(depts || []);

            const role = (user?.role || '').toLowerCase();
            if (role === 'admin' || role === 'super_admin' || role === 'hq_staff') {
                const usersList = await usersApi.getAll();
                setAllUsers(usersList || []);
            }
        } catch (err) {
            console.error('Failed to prefetch search data:', err);
        }
    };

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults({ pages: [], issues: [], users: [], departments: [] });
            setActiveIndex(0);
            return;
        }

        const query = searchQuery.toLowerCase();

        const filteredPages = getAccessiblePages().filter(p => 
            p.title.toLowerCase().includes(query) || p.desc.toLowerCase().includes(query)
        );

        const filteredIssues = allIssues.filter(i => 
            (i.title && i.title.toLowerCase().includes(query)) ||
            (i.category && i.category.toLowerCase().includes(query)) ||
            (i.id && i.id.toLowerCase().includes(query)) ||
            (i.description && i.description.toLowerCase().includes(query))
        ).slice(0, 5);

        const filteredUsers = allUsers.filter(u => 
            (u.name && u.name.toLowerCase().includes(query)) ||
            (u.email && u.email.toLowerCase().includes(query)) ||
            (u.role && u.role.toLowerCase().includes(query))
        ).slice(0, 4);

        const filteredDepartments = allDepartments.filter(d => 
            d.name && d.name.toLowerCase().includes(query)
        ).slice(0, 4);

        setSearchResults({
            pages: filteredPages,
            issues: filteredIssues,
            users: filteredUsers,
            departments: filteredDepartments
        });
        setActiveIndex(0);
    }, [searchQuery, allIssues, allUsers, allDepartments]);

    const getFlattenedResults = () => {
        const list = [];
        searchResults.pages.forEach(p => list.push({ type: 'page', data: p }));
        searchResults.issues.forEach(i => list.push({ type: 'issue', data: i }));
        searchResults.users.forEach(u => list.push({ type: 'user', data: u }));
        searchResults.departments.forEach(d => list.push({ type: 'department', data: d }));
        return list;
    };

    const handleSelectResult = (item) => {
        if (!item) return;

        setSearchQuery('');
        setShowSearchDropdown(false);

        if (item.type === 'page') {
            navigate(item.data.path);
        } else if (item.type === 'issue') {
            const role = (user?.role || '').toLowerCase();
            const pathPrefix = (role === 'authority' || role === 'dept_head') ? '/authority' : 
                               (role === 'staff' || role === 'field_officer') ? '/staff' : '/admin';
            navigate(`${pathPrefix}/issues/${item.data.id}`);
        } else if (item.type === 'user') {
            const rolePrefix = getRolePrefix();
            if (rolePrefix === '/admin' || rolePrefix === '/superadmin') {
                navigate(`${rolePrefix}/users`);
            }
        } else if (item.type === 'department') {
            const role = (user?.role || '').toLowerCase();
            if (role === 'admin') {
                navigate('/admin/departments');
            }
        }
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowSearchDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return {
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
    };
};
