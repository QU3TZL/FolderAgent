import { NextRequest } from 'next/server';

export class UpgradeAuthClient {
    private token: string | null = null;
    private baseUrl: string;
    private isRefreshing: boolean = false;
    private refreshPromise: Promise<boolean> | null = null;
    private maxRetries: number = 3;
    private retryCount: number = 0;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }

    setToken(token: string) {
        this.token = token;
        this.retryCount = 0; // Reset retry count when new token is set
    }

    private async refreshToken(): Promise<boolean> {
        if (!this.token) {
            console.log('[UpgradeAuth] No token available for refresh');
            return false;
        }

        // If already refreshing, return the existing promise
        if (this.isRefreshing && this.refreshPromise) {
            console.log('[UpgradeAuth] Reusing existing refresh promise');
            return this.refreshPromise;
        }

        this.isRefreshing = true;
        this.refreshPromise = (async () => {
            try {
                console.log('[UpgradeAuth] Starting token refresh');
                const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    mode: 'cors',
                    credentials: 'include'
                });

                console.log('[UpgradeAuth] Refresh response status:', response.status);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('[UpgradeAuth] Token refresh failed:', {
                        status: response.status,
                        error: errorText,
                        headers: Object.fromEntries(response.headers.entries())
                    });
                    return false;
                }

                const data = await response.json();
                if (!data.token) {
                    console.error('[UpgradeAuth] Refresh response missing token');
                    return false;
                }

                console.log('[UpgradeAuth] Token refresh successful');
                this.token = data.token;
                // Also update localStorage to keep it in sync
                if (typeof window !== 'undefined') {
                    localStorage.setItem('auth_token', data.token);
                }
                this.retryCount = 0; // Reset retry count on successful refresh
                return true;
            } catch (error) {
                console.error('[UpgradeAuth] Token refresh error:', error);
                return false;
            } finally {
                this.isRefreshing = false;
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
    }

    async authenticatedRequest(method: string, endpoint: string, options: RequestInit = {}): Promise<Response> {
        if (!this.token) {
            console.error('[UpgradeAuth] No token available for request');
            throw new Error('No token available');
        }

        // Add auth header
        const headers = new Headers(options.headers || {});
        headers.set('Authorization', `Bearer ${this.token}`);
        headers.set('Accept', 'application/json');
        headers.set('Content-Type', 'application/json');
        options.headers = headers;

        console.log(`[UpgradeAuth] Making ${method} request:`, {
            endpoint,
            baseUrl: this.baseUrl,
            fullUrl: `${this.baseUrl}${endpoint}`,
            token: this.token.substring(0, 20) + '...',
            headers: Object.fromEntries(headers.entries()),
            options: {
                ...options,
                headers: Object.fromEntries(headers.entries())
            }
        });

        // Make request
        let response = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            ...options,
            headers,
            mode: 'cors',
            credentials: 'include'
        });

        console.log(`[UpgradeAuth] Response:`, {
            status: response.status,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries()),
            url: response.url
        });

        // For auth endpoints, log the response body
        if (endpoint === '/api/auth/me') {
            const responseClone = response.clone();
            const responseBody = await responseClone.json();
            console.log('[UpgradeAuth] Auth response body:', {
                hasData: !!responseBody,
                id: responseBody?.id,
                email: responseBody?.email,
                hasDriveToken: !!responseBody?.drive_token,
                driveTokenType: typeof responseBody?.drive_token,
                driveTokenKeys: responseBody?.drive_token ? Object.keys(responseBody.drive_token) : [],
                driveTokenPreview: responseBody?.drive_token ?
                    (typeof responseBody.drive_token === 'string' ?
                        responseBody.drive_token.substring(0, 50) :
                        JSON.stringify(responseBody.drive_token).substring(0, 50)) + '...' : null,
                fullDriveToken: responseBody?.drive_token // Temporary for debugging
            });
        }

        // Handle 401 with token refresh
        if (response.status === 401 && this.retryCount < this.maxRetries) {
            console.log(`[UpgradeAuth] Got 401, attempting refresh:`, {
                attempt: this.retryCount + 1,
                maxRetries: this.maxRetries,
                token: this.token.substring(0, 20) + '...'
            });
            this.retryCount++;
            if (await this.refreshToken()) {
                // Update header with new token
                headers.set('Authorization', `Bearer ${this.token}`);
                // Retry original request
                console.log(`[UpgradeAuth] Retrying ${method} request with new token`);
                response = await fetch(`${this.baseUrl}${endpoint}`, {
                    method,
                    ...options,
                    headers,
                    mode: 'cors',
                    credentials: 'include'
                });
                console.log(`[UpgradeAuth] Retry response status: ${response.status}`);
            }
        }

        return response;
    }

    async getMe(): Promise<Response> {
        console.log('[UpgradeAuth] Making getMe request:', {
            hasToken: !!this.token,
            baseUrl: this.baseUrl,
            retryCount: this.retryCount,
            nodeEnv: process.env.NODE_ENV
        });
        return this.authenticatedRequest('GET', '/api/auth/me');
    }
}

// Create singleton instance
const upgradeUrl = process.env.NEXT_PUBLIC_UPGRADE_API_URL;
if (!upgradeUrl) {
    throw new Error('NEXT_PUBLIC_UPGRADE_API_URL not configured');
}

export const upgradeAuth = new UpgradeAuthClient(upgradeUrl); 