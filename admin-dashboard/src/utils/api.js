import { supabase } from '../config/supabase';

const PRIMARY_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const LOCAL_API_URL = 'http://localhost:5000/api';

async function performFetch(url, options) {
    try {
        const response = await fetch(url, options);
        // Fall back to local if it's a proxy error (e.g., Render server spun down or crashing)
        if (!response.ok && response.status >= 502 && response.status <= 504 && !url.includes(LOCAL_API_URL)) {
            throw new Error(`Server error status ${response.status}`);
        }
        return response;
    } catch (err) {
        // If the primary request failed and it wasn't already local, try local
        if (!url.includes(LOCAL_API_URL)) {
            console.warn(`[API Fallback] Primary URL ${url} failed. Retrying with local API...`, err);
            const localUrl = url.replace(PRIMARY_API_URL, LOCAL_API_URL);
            try {
                return await fetch(localUrl, options);
            } catch (localErr) {
                console.error(`[API Fallback] Local API also failed:`, localErr);
                throw err; // Throw original error
            }
        }
        throw err;
    }
}

async function handleResponse(response) {
    if (!response.ok) {
        let errMsg = response.statusText;
        try {
            const data = await response.json();
            if (data && (data.message || data.error)) {
                errMsg = data.message || data.error;
            }
        } catch (_) {}
        throw new Error(errMsg);
    }
    return response.json();
}

export const api = {
    getBaseUrl() {
        return PRIMARY_API_URL;
    },
    async get(endpoint) {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
        };

        const response = await performFetch(`${PRIMARY_API_URL}${endpoint}`, { headers });
        return handleResponse(response);
    },

    async post(endpoint, body) {
        const { data: { session } } = await supabase.auth.getSession();
        const isFormData = body instanceof FormData;
        const headers = {
            'Authorization': `Bearer ${session?.access_token}`
        };
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await performFetch(`${PRIMARY_API_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: isFormData ? body : JSON.stringify(body)
        });
        return handleResponse(response);
    },

    async patch(endpoint, body) {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
        };

        const response = await performFetch(`${PRIMARY_API_URL}${endpoint}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(body)
        });
        return handleResponse(response);
    },

    async delete(endpoint) {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
        };

        const response = await performFetch(`${PRIMARY_API_URL}${endpoint}`, {
            method: 'DELETE',
            headers
        });
        return handleResponse(response);
    }
};
