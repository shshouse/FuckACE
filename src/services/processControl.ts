import { invoke } from '@tauri-apps/api/core';
import type {
  MemoryCleanResult,
  MemoryCleanStatus,
  PerfDataPoint,
  ProcessPerformance,
  ProcessStatus,
  RestrictionSettings,
  SystemInfo,
} from '../types/app';

export interface LoggedCommandDefinition {
  command: string;
  startMessage: string;
  successMessage: string;
  errorMessage: string;
}

export interface GameOptimizationAction extends LoggedCommandDefinition {
  id: string;
  label: string;
}

type RestrictionExecutionOptions = Pick<
  RestrictionSettings,
  'enableCpuAffinity' | 'enableProcessPriority' | 'enableEfficiencyMode' | 'enableIoPriority' | 'enableMemoryPriority'
> & {
  affinityCores?: number[];
};

const aceProcessNames = ['sguard64.exe', 'sguardsvc64.exe', 'ace-tray.exe', 'ace-service64.exe'];

export const lowerAcePriorityCommand: LoggedCommandDefinition = {
  command: 'lower_ace_priority',
  startMessage: '开始降低ACE优先级...',
  successMessage: 'ACE优先级降低完成:',
  errorMessage: '降低ACE优先级失败',
};

export const checkRegistryPriorityCommand: LoggedCommandDefinition = {
  command: 'check_registry_priority',
  startMessage: '正在检查注册表状态...',
  successMessage: '注册表状态:',
  errorMessage: '检查注册表失败',
};

export const resetRegistryPriorityCommand: LoggedCommandDefinition = {
  command: 'reset_registry_priority',
  startMessage: '开始恢复注册表默认设置...',
  successMessage: '注册表恢复完成:',
  errorMessage: '恢复注册表失败',
};

export const gameOptimizationActions: GameOptimizationAction[] = [
  {
    id: 'delta',
    label: '三角洲优化',
    command: 'raise_delta_priority',
    startMessage: '开始提高三角洲优先级...',
    successMessage: '三角洲优先级提高完成:',
    errorMessage: '提高三角洲优先级失败',
  },
  {
    id: 'valorant',
    label: '瓦罗兰特优化',
    command: 'modify_valorant_registry_priority',
    startMessage: '开始修改瓦罗兰特注册表优先级...',
    successMessage: '瓦罗兰特注册表修改完成:',
    errorMessage: '修改瓦罗兰特注册表失败',
  },
  {
    id: 'league',
    label: '英雄联盟优化',
    command: 'raise_league_priority',
    startMessage: '开始提高英雄联盟优先级...',
    successMessage: '英雄联盟优先级修改完成:',
    errorMessage: '提高英雄联盟优先级失败',
  },
  {
    id: 'arena',
    label: '暗区突围优化',
    command: 'raise_arena_priority',
    startMessage: '开始提高暗区突围优先级...',
    successMessage: '暗区突围优先级修改完成:',
    errorMessage: '提高暗区突围优先级失败',
  },
  {
    id: 'finals',
    label: '终极角逐优化',
    command: 'raise_finals_priority',
    startMessage: '开始提高THE FINALS优先级...',
    successMessage: 'THE FINALS优先级修改完成:',
    errorMessage: '提高THE FINALS优先级失败',
  },
  {
    id: 'nzfuture',
    label: '逆战未来优化',
    command: 'raise_nzfuture_priority',
    startMessage: '开始提高逆战未来优先级...',
    successMessage: '逆战未来优先级修改完成:',
    errorMessage: '提高逆战未来优先级失败',
  },
  {
    id: 'crossfire',
    label: '穿越火线优化',
    command: 'raise_crossfire_priority',
    startMessage: '开始提高穿越火线优先级...',
    successMessage: '穿越火线优先级修改完成:',
    errorMessage: '提高穿越火线优先级失败',
  },
  {
    id: 'dnf',
    label: '地下城勇士优化',
    command: 'raise_dnf_priority',
    startMessage: '开始提高地下城与勇士优先级...',
    successMessage: '地下城与勇士优先级修改完成:',
    errorMessage: '提高地下城与勇士优先级失败',
  },
  {
    id: 'rocoworld',
    label: '洛克王国优化',
    command: 'raise_rocoworld_priority',
    startMessage: '开始提高洛克王国世界优先级...',
    successMessage: '洛克王国世界优先级修改完成:',
    errorMessage: '提高洛克王国世界优先级失败',
  },
  {
    id: 'wutheringwaves',
    label: '鸣潮优化',
    command: 'raise_wutheringwaves_priority',
    startMessage: '开始提高鸣潮优先级...',
    successMessage: '鸣潮优先级修改完成:',
    errorMessage: '提高鸣潮优先级失败',
  },
  {
    id: 'poe1',
    label: '流放之路1优化',
    command: 'raise_poe1_priority',
    startMessage: '开始提高流放之路1优先级...',
    successMessage: '流放之路1优先级修改完成:',
    errorMessage: '提高流放之路1优先级失败',
  },
  {
    id: 'poe2',
    label: '流放之路2优化',
    command: 'raise_poe2_priority',
    startMessage: '开始提高流放之路2优先级...',
    successMessage: '流放之路2优先级修改完成:',
    errorMessage: '提高流放之路2优先级失败',
  },
  {
    id: 'division2',
    label: '全境封锁2优化',
    command: 'raise_division2_priority',
    startMessage: '开始提高全境封锁2优先级...',
    successMessage: '全境封锁2优先级修改完成:',
    errorMessage: '提高全境封锁2优先级失败',
  },
  {
    id: 'endfield',
    label: '终末地优化',
    command: 'raise_endfield_priority',
    startMessage: '开始提高终末地优先级...',
    successMessage: '终末地优先级修改完成:',
    errorMessage: '提高终末地优先级失败',
  },
  {
    id: 'calabiyau',
    label: '卡拉比丘优化',
    command: 'raise_calabiyau_priority',
    startMessage: '开始提高卡拉比丘优先级...',
    successMessage: '卡拉比丘优先级修改完成:',
    errorMessage: '提高卡拉比丘优先级失败',
  },
];

export async function getSystemInfo() {
  return invoke<SystemInfo>('get_system_info');
}

export async function getProcessPerformance() {
  return invoke<ProcessPerformance[]>('get_process_performance');
}

export async function restrictProcesses(options: RestrictionExecutionOptions) {
  return invoke<ProcessStatus>('restrict_processes', options);
}

export async function checkAutoStartStatus() {
  return invoke<boolean>('check_autostart');
}

export async function setAutoStartState(enabled: boolean) {
  const command = enabled ? 'enable_autostart' : 'disable_autostart';
  return invoke<string>(command);
}

export async function executeTextCommand(command: LoggedCommandDefinition) {
  const output = await invoke<string>(command.command);
  return output.split('\n');
}

export async function getMemoryCleanStatus() {
  return invoke<MemoryCleanStatus>('get_memory_clean_status');
}

export async function cleanMemoryAndTemp() {
  return invoke<MemoryCleanResult>('clean_memory_and_temp');
}

export function hasAceProcess(performance: ProcessPerformance[]) {
  return performance.some((process) => {
    const normalizedName = process.name.toLowerCase();
    return aceProcessNames.some((aceProcessName) => normalizedName.includes(aceProcessName));
  });
}

export interface IoSample {
  totalBytes: number;
  timeMs: number;
}

// 按进程 PID 记录上一次采样的磁盘累计字节数,用于跨采样差分计算真实速率
export type IoSampleMap = Map<number, IoSample>;

function computeIoRateKbPerSec(
  process: ProcessPerformance | undefined,
  prevIoSamples: IoSampleMap,
  nowMs: number,
): number | null {
  if (!process) return null;

  const totalBytes = process.disk_total_read_bytes + process.disk_total_write_bytes;
  const previous = prevIoSamples.get(process.pid);
  prevIoSamples.set(process.pid, { totalBytes, timeMs: nowMs });

  if (!previous) return null;

  const elapsedSeconds = (nowMs - previous.timeMs) / 1000;
  const deltaBytes = totalBytes - previous.totalBytes;
  // 进程重启或 PID 复用会使计数器复位(差值为负),该采样点无法计算速率
  if (elapsedSeconds <= 0 || deltaBytes < 0) return null;

  return parseFloat((deltaBytes / 1024 / elapsedSeconds).toFixed(1));
}

export function buildPerformancePoint(
  performance: ProcessPerformance[],
  prevIoSamples: IoSampleMap,
): PerfDataPoint {
  const sguardProcess = performance.find((process) => process.name.toLowerCase().includes('sguard64.exe'));
  const sguardServiceProcess = performance.find((process) => process.name.toLowerCase().includes('sguardsvc64.exe'));
  const aceTrayProcess = performance.find((process) => process.name.toLowerCase().includes('ace-tray.exe'));
  const aceServiceProcess = performance.find((process) => process.name.toLowerCase().includes('ace-service64.exe'));
  const nowMs = Date.now();

  // 进程消失后清掉旧采样,避免跨越无数据的时间段算出一个失真平均速率
  const activePids = new Set(performance.map((process) => process.pid));
  for (const pid of [...prevIoSamples.keys()]) {
    if (!activePids.has(pid)) {
      prevIoSamples.delete(pid);
    }
  }

  return {
    time: new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    sguard_cpu: sguardProcess ? parseFloat(sguardProcess.cpu_usage.toFixed(1)) : null,
    sguard_mem: sguardProcess ? parseFloat(sguardProcess.memory_mb.toFixed(1)) : null,
    sguardsvc_cpu: sguardServiceProcess ? parseFloat(sguardServiceProcess.cpu_usage.toFixed(1)) : null,
    sguardsvc_mem: sguardServiceProcess ? parseFloat(sguardServiceProcess.memory_mb.toFixed(1)) : null,
    sguard_io: computeIoRateKbPerSec(sguardProcess, prevIoSamples, nowMs),
    sguardsvc_io: computeIoRateKbPerSec(sguardServiceProcess, prevIoSamples, nowMs),
    acetray_cpu: aceTrayProcess ? parseFloat(aceTrayProcess.cpu_usage.toFixed(1)) : null,
    acetray_mem: aceTrayProcess ? parseFloat(aceTrayProcess.memory_mb.toFixed(1)) : null,
    acetray_io: computeIoRateKbPerSec(aceTrayProcess, prevIoSamples, nowMs),
    aceservice_cpu: aceServiceProcess ? parseFloat(aceServiceProcess.cpu_usage.toFixed(1)) : null,
    aceservice_mem: aceServiceProcess ? parseFloat(aceServiceProcess.memory_mb.toFixed(1)) : null,
    aceservice_io: computeIoRateKbPerSec(aceServiceProcess, prevIoSamples, nowMs),
  };
}
