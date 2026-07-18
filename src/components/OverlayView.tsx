import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { ProcessPerformance } from '../types/app';

export function OverlayView() {
  const [performance, setPerformance] = useState<ProcessPerformance[]>([]);

  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    const root = document.getElementById('root');
    if (root) root.style.background = 'transparent';
  }, []);

  const fetchPerformance = useCallback(async () => {
    try {
      const data = await invoke<ProcessPerformance[]>('get_process_performance');
      setPerformance(data);
    } catch (e) {
      console.error('获取性能数据失败:', e);
    }
  }, []);

  useEffect(() => {
    void fetchPerformance();
    const interval = setInterval(() => void fetchPerformance(), 3000);
    return () => clearInterval(interval);
  }, [fetchPerformance]);

  const aceProcesses = performance.filter(p =>
    p.name.toLowerCase().includes('sguard')
  );

  const handleClose = async () => {
    await getCurrentWindow().hide();
    await emit('overlay-closed');
  };

  return (
    <div
      data-tauri-drag-region
      style={{
        background: 'transparent',
        padding: '6px 8px',
        color: '#e0e0e0',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 12,
        height: '100vh',
        boxSizing: 'border-box',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        textShadow: '0 1px 3px rgba(0,0,0,0.8)',
      }}
    >
      <div
        data-tauri-drag-region
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <span data-tauri-drag-region style={{ fontWeight: 600, fontSize: 13, letterSpacing: 0.5 }}>
          FuckACE
        </span>
        <button
          onClick={handleClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#999',
            cursor: 'pointer',
            fontSize: 14,
            lineHeight: '20px',
            textAlign: 'center',
            padding: 0,
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          }}
        >
          x
        </button>
      </div>

      {aceProcesses.length === 0 ? (
        <div style={{ opacity: 0.5, textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
          ACE进程未检测到
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {aceProcesses.map(p => (
            <div key={p.pid}>
              <div style={{ opacity: 0.6, fontSize: 10, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                <span>
                  CPU <span style={{ color: p.cpu_usage > 5 ? '#ff6b6b' : '#69db7c', fontWeight: 600 }}>{p.cpu_usage.toFixed(1)}%</span>
                </span>
                <span>
                  MEM <span style={{ color: '#74c0fc', fontWeight: 600 }}>{p.memory_mb.toFixed(0)}MB</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
