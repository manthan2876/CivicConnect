const BASE_URL = 'https://civicconnect-ezaj.onrender.com';

async function runTests() {
    console.log(`=======================================================`);
    console.log(`   TESTING CIVICCONNECT LIVE DEPLOYMENT MODULES`);
    console.log(`   Target: ${BASE_URL}`);
    console.log(`=======================================================\n`);

    const results = [];

    async function test(name, fn) {
        try {
            process.stdout.write(`• ${name}... `);
            const res = await fn();
            console.log(`\x1b[32mPASSED\x1b[0m`, res ? `(${res})` : '');
            results.push({ name, status: 'PASSED', details: res });
        } catch (err) {
            console.log(`\x1b[31mFAILED\x1b[0m: ${err.message}`);
            results.push({ name, status: 'FAILED', error: err.message });
        }
    }

    // 1. Health check
    await test('System Health (/health)', async () => {
        const res = await fetch(`${BASE_URL}/health`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.status !== 'ok') throw new Error(`Status not ok: ${JSON.stringify(data)}`);
        return `status: ${data.status}`;
    });

    // 2. Auth: Check 401 when no token is passed
    await test('RBAC Guard: 401 on unauthenticated /api/reports', async () => {
        const res = await fetch(`${BASE_URL}/api/reports`);
        if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
        return `HTTP 401 received`;
    });

    await test('RBAC Guard: 401 on unauthenticated /api/users', async () => {
        const res = await fetch(`${BASE_URL}/api/users`);
        if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
        return `HTTP 401 received`;
    });

    // 3. Authenticate with Supabase Auth (Admin account)
    let adminToken = null;
    let adminUser = null;
    await test('Authentication: Admin Login (POST /api/auth/login)', async () => {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'controlroom@suratmunicipal.org',
                password: 'password123'
            })
        });
        if (!res.ok) {
            // If control room doesn't exist, try commissioner
            const res2 = await fetch(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'commissioner@suratmunicipal.org',
                    password: 'password123'
                })
            });
            if (!res2.ok) {
                const text = await res2.text();
                throw new Error(`Admin login failed: HTTP ${res2.status} - ${text}`);
            }
            const data2 = await res2.json();
            adminToken = data2.token;
            adminUser = data2.user;
            return `Logged in as ${adminUser.role || 'Admin'} (fallback)`;
        }
        const data = await res.json();
        adminToken = data.token;
        adminUser = data.user;
        return `Token acquired, role: ${adminUser.role || 'admin'}`;
    });

    // 4. Authenticate Staff account
    let staffToken = null;
    let staffUser = null;
    await test('Authentication: Staff Login (POST /api/auth/login)', async () => {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'staff.swm@suratmunicipal.org',
                password: 'password123'
            })
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Staff login failed: HTTP ${res.status} - ${text}`);
        }
        const data = await res.json();
        staffToken = data.token;
        staffUser = data.user;
        return `Token acquired, role: ${staffUser.role || 'staff'}`;
    });

    // 5. Test Profile & RBAC Permissions on /api/users/me
    if (adminToken) {
        await test('Profile & RBAC: Admin Profile (/api/users/me)', async () => {
            const res = await fetch(`${BASE_URL}/api/users/me`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const profile = await res.json();
            if (!Array.isArray(profile.permissions)) throw new Error('Missing permissions array');
            return `Permissions: ${profile.permissions.length}, Roles: ${profile.roles?.join(', ')}`;
        });
    }

    if (staffToken) {
        await test('Profile & RBAC: Staff Profile (/api/users/me)', async () => {
            const res = await fetch(`${BASE_URL}/api/users/me`, {
                headers: { 'Authorization': `Bearer ${staffToken}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const profile = await res.json();
            return `Permissions: ${profile.permissions?.length || 0}, Roles: ${profile.roles?.join(', ')}`;
        });
    }

    // 6. Test Reports module
    let firstIssueId = null;
    if (adminToken) {
        await test('Reports Module: Fetch all reports (/api/reports)', async () => {
            const res = await fetch(`${BASE_URL}/api/reports`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const reports = await res.json();
            if (!Array.isArray(reports)) throw new Error('Response is not an array');
            if (reports.length > 0) firstIssueId = reports[0].id;
            return `Fetched ${reports.length} reports`;
        });

        await test('Reports Module: Stats (/api/reports/stats)', async () => {
            const res = await fetch(`${BASE_URL}/api/reports/stats`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const stats = await res.json();
            return `Total: ${stats.total}, Resolved: ${stats.resolved}`;
        });

        await test('Reports Module: GeoJSON (/api/reports/geojson)', async () => {
            const res = await fetch(`${BASE_URL}/api/reports/geojson`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const geojson = await res.json();
            return `Type: ${geojson.type}, Features: ${geojson.features?.length || 0}`;
        });

        await test('Reports Module: Authority KPIs (/api/reports/kpi)', async () => {
            const res = await fetch(`${BASE_URL}/api/reports/kpi`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const kpi = await res.json();
            return `SLA: ${kpi.slaCompliance}%, Personnel: ${kpi.activePersonnel}`;
        });
    }

    // 7. Test Departments module
    if (adminToken) {
        await test('Departments Module (/api/departments)', async () => {
            const res = await fetch(`${BASE_URL}/api/departments`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const depts = await res.json();
            return `Found ${depts.length} departments`;
        });
    }

    // 8. Test Jurisdictions (Wards, Zones, ULB Boundaries)
    if (adminToken) {
        await test('Jurisdictions: Wards (/api/system/wards)', async () => {
            const res = await fetch(`${BASE_URL}/api/system/wards`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const wards = await res.json();
            return `Found ${wards.length} wards`;
        });

        await test('Jurisdictions: Zones (/api/system/zones)', async () => {
            const res = await fetch(`${BASE_URL}/api/system/zones`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const zones = await res.json();
            return `Found ${zones.length} zones`;
        });

        await test('Jurisdictions: ULB Boundaries (/api/system/ulb-boundaries)', async () => {
            const res = await fetch(`${BASE_URL}/api/system/ulb-boundaries`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const ulbs = await res.json();
            return `Found ${ulbs.length} ULBs`;
        });
    }

    // 9. Test Staff query & Leaderboard
    if (adminToken) {
        await test('Users: Staff Directory (/api/users/staff)', async () => {
            const res = await fetch(`${BASE_URL}/api/users/staff`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const staff = await res.json();
            return `Found ${staff.length} staff members`;
        });

        await test('Users: Leaderboard (/api/users/leaderboard)', async () => {
            const res = await fetch(`${BASE_URL}/api/users/leaderboard`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const leaders = await res.json();
            return `Found ${leaders.length} leaderboard entries`;
        });
    }

    // 10. Test Audit Logs (RBAC: Admin should succeed, Staff should be 403 Forbidden)
    if (adminToken) {
        await test('Audit Trail (Admin): GET /api/audit-logs', async () => {
            const res = await fetch(`${BASE_URL}/api/audit-logs?limit=10`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const logs = await res.json();
            return `Retrieved ${logs.length} audit log entries`;
        });
    }

    if (staffToken) {
        await test('Audit Trail (Staff): RBAC 403 Forbidden check', async () => {
            const res = await fetch(`${BASE_URL}/api/audit-logs`, {
                headers: { 'Authorization': `Bearer ${staffToken}` }
            });
            if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
            return `Correctly blocked with 403 Forbidden`;
        });
    }

    // 11. Test Issue Audit Logs (/api/reports/:id/audit)
    if (adminToken && firstIssueId) {
        await test(`Issue Audit Trail (/api/reports/${firstIssueId.slice(0,8)}/audit)`, async () => {
            const res = await fetch(`${BASE_URL}/api/reports/${firstIssueId}/audit`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const logs = await res.json();
            return `Retrieved ${logs.length} issue audit records`;
        });
    }

    // 12. Test Executive Analytics / RAG (The component that was crashing earlier)
    if (adminToken) {
        await test('Executive Analytics RAG: POST /api/analytics/query', async () => {
            const res = await fetch(`${BASE_URL}/api/analytics/query`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: 'waste and garbage issues in Surat' })
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`HTTP ${res.status} - ${text}`);
            }
            const data = await res.json();
            return `Summary generated (${data.summary ? data.summary.slice(0, 45) : 'N/A'}...), Sources: ${data.sources?.length || 0}`;
        });
    }

    // 13. Test AI Retraining Queue
    if (adminToken) {
        await test('AI Retraining: GET /api/reports/retraining-queue', async () => {
            const res = await fetch(`${BASE_URL}/api/reports/retraining-queue`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const queue = await res.json();
            return `Queue count: ${queue.length}`;
        });
    }

    console.log(`\n=======================================================`);
    const passed = results.filter(r => r.status === 'PASSED').length;
    const failed = results.filter(r => r.status === 'FAILED').length;
    console.log(`   TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`=======================================================`);
}

runTests().catch(err => {
    console.error('Test suite runner error:', err);
    process.exit(1);
});
