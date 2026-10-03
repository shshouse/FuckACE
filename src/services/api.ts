import { useState, useEffect, useCallback, useRef } from 'react';

export interface Announcement {
    id: number;
    title: string;
    content: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    is_active: boolean;
    created_at: string;
    expires_at: string | null;
}

export interface AppVersion {
    id: number;
    version: string;
    download_url: string;
    changelog: string;
    is_critical: boolean;
    created_at: string;
}

interface InitialData {
    announcements: Announcement[];
    latestVersion: AppVersion | null;
    hasUpdate: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || '';
const API_KEY = import.meta.env.VITE_API_KEY || '';
const isConfigured = Boolean(API_URL && API_KEY);
const FETCH_RETRY_INTERVAL_MS = 60 * 1000;

async function query<T>(table: string, params: Record<string, string> = {}): Promise<T | null> {
    if (!isConfigured) return null;
    try {
        const url = new URL(`${API_URL}/rest/v1/${table}`);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        const res = await fetch(url.toString(), {
            headers: {
                'apikey': API_KEY,
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json',
            },
        });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

function compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }
    return 0;
}

export const useInitialData = (currentVersion: string) => {
    const [data, setData] = useState<InitialData>({
        announcements: [],
        latestVersion: null,
        hasUpdate: false,
    });
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fetchInitialDataRef = useRef<() => Promise<void>>(async () => {});

    const fetchInitialData = useCallback(async () => {
        if (!isConfigured) {
            setLoading(false);
            return;
        }

        // 新的获取开始时清掉待执行的重试，避免手动刷新与定时重试叠加
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }

        // 失败后每分钟重试一次，直到成功获取
        const scheduleRetry = () => {
            retryTimerRef.current = setTimeout(() => {
                void fetchInitialDataRef.current();
            }, FETCH_RETRY_INTERVAL_MS);
        };

        try {
            setLoading(true);
            setFetchError(false);
            const now = new Date().toISOString();
            const [announcements, versions] = await Promise.all([
                query<Announcement[]>('announcements', {
                    'is_active': 'eq.true',
                    'or': `(expires_at.is.null,expires_at.gt.${now})`,
                    'order': 'priority.desc,created_at.desc',
                    'select': '*',
                }),
                query<AppVersion[]>('app_versions', {
                    'order': 'created_at.desc',
                    'limit': '1',
                    'select': '*',
                }),
            ]);
            // 任一查询失败都视为整体失败：announcements 失败会丢公告，versions 失败会漏掉更新检测
            if (!announcements || !versions) {
                setFetchError(true);
                scheduleRetry();
                return;
            }
            const latestVersion = versions[0] || null;
            const hasUpdate = latestVersion
                ? compareVersions(latestVersion.version, currentVersion) > 0
                : false;
            setData({
                announcements,
                latestVersion,
                hasUpdate,
            });
        } catch (error) {
            console.error('Failed to fetch initial data:', error);
            setFetchError(true);
            scheduleRetry();
        } finally {
            setLoading(false);
        }
    }, [currentVersion]);

    fetchInitialDataRef.current = fetchInitialData;

    useEffect(() => {
        fetchInitialData();

        return () => {
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
            }
        };
    }, [fetchInitialData]);

    return {
        ...data,
        loading,
        fetchError,
        refresh: fetchInitialData,
    };
};
