const os = require('os');
const fs = require('fs');
const path = require('path');

/**
 * CivicConnect Network Sync Utility
 * Automatically detects the current Wi-Fi/Local IP and updates all .env files.
 */

function getLocalIP() {
    const interfaces = os.networkInterfaces();

    // adapter categories
    const preferred = ['wi-fi', 'wireless', 'wifi', 'wlan'];
    const secondary = ['ethernet', 'en0', 'eth0'];
    const excluded = ['vethernet', 'wsl', 'virtualbox', 'vmware', 'pseudo'];

    // 1. Try Preferred Adapters (Physical Wi-Fi)
    for (const name of Object.keys(interfaces)) {
        const lowerName = name.toLowerCase();
        if (excluded.some(e => lowerName.includes(e))) continue;

        if (preferred.some(p => lowerName.includes(p))) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) return iface.address;
            }
        }
    }

    // 2. Try Secondary (Physical Ethernet)
    for (const name of Object.keys(interfaces)) {
        const lowerName = name.toLowerCase();
        if (excluded.some(e => lowerName.includes(e))) continue;

        if (secondary.some(s => lowerName.includes(s))) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) return iface.address;
            }
        }
    }

    // 3. Fallback to any non-internal IPv4 not in excluded list
    for (const name of Object.keys(interfaces)) {
        const lowerName = name.toLowerCase();
        if (excluded.some(e => lowerName.includes(e))) continue;

        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }

    return null;
}

const newIP = getLocalIP();

if (!newIP) {
    console.error('❌ Error: Could not detect a valid local IPv4 address.');
    process.exit(1);
}

console.log(`🌐 Detected Network IP: ${newIP}`);

const envFiles = [
    {
        name: 'Backend',
        path: path.join(__dirname, '..', 'backend', '.env'),
        rules: [
            { regex: /BASE_URL=http:\/\/[0-9.]+(:\d+)/g, replace: `BASE_URL=http://${newIP}$1` },
            { regex: /AWS_ENDPOINT=[0-9.]+/g, replace: `AWS_ENDPOINT=${newIP}` }
        ]
    },
    {
        name: 'Mobile',
        path: path.join(__dirname, '..', 'mobile', '.env'),
        rules: [
            { regex: /API_BASE_URL=http:\/\/[0-9.]+(:\d+\/api)/g, replace: `API_BASE_URL=http://${newIP}$1` }
        ]
    },
    {
        name: 'Admin Dashboard',
        path: path.join(__dirname, '..', 'admin-dashboard', '.env'),
        rules: [
            { regex: /VITE_API_URL=http:\/\/[0-9.]+(:\d+\/api)/g, replace: `VITE_API_URL=http://${newIP}$1` }
        ]
    }
];

let updatedCount = 0;

envFiles.forEach(file => {
    if (fs.existsSync(file.path)) {
        try {
            let content = fs.readFileSync(file.path, 'utf8');
            let originalContent = content;

            file.rules.forEach(rule => {
                content = content.replace(rule.regex, rule.replace);
            });

            if (content !== originalContent) {
                fs.writeFileSync(file.path, content);
                console.log(`✅ Updated ${file.name} environment at ${path.relative(process.cwd(), file.path)}`);
                updatedCount++;
            } else {
                console.log(`ℹ️ No changes needed for ${file.name} (already using ${newIP})`);
            }
        } catch (err) {
            console.error(`❌ Failed to update ${file.name}:`, err.message);
        }
    } else {
        console.warn(`⚠️ Warning: ${file.name} .env file not found at ${file.path}`);
    }
});

if (updatedCount > 0) {
    console.log(`\n✨ Successfully synchronized ${updatedCount} environment files!`);
} else {
    console.log('\n👍 All environments are already up to date.');
}
