export interface ProcessStatus {
  target_cores: number[];
  sguard64_found: boolean;
  sguard64_restricted: boolean;
  sguardsvc64_found: boolean;
  sguardsvc64_restricted: boolean;
  message: string;
}

export interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
}

export interface SystemInfo {
  cpu_model: string;
  cpu_cores: number;
  cpu_logical_cores: number;
  os_name: string;
  os_version: string;
  is_admin: boolean;
  total_memory_gb: number;
  webview2_env: string;
}
export interface ProcessPerformance {
  pid:number;
  name:string;
  cpu_usage:number;
  memory_mb:number;
  disk_read_bytes: number;
  disk_write_bytes: number;
}
export interface PerfDataPoint{
  time: string;
  sguard_cpu: number | null;
  sguard_mem: number | null;
  sguardsvc_cpu: number | null;
  sguardsvc_mem: number | null;
  sguard_io:number | null;
  sguardsvc_io: number | null;
}
export interface RestrictionSettings {
  enableCpuAffinity:boolean;
  enableProcessPriority:boolean;
  enableEfficiencyMode:boolean;
  enableIoPriority:boolean;
  enableMemoryPriority:boolean;
  autoRestrict:boolean;
}

export type RestrictionSettingKey = keyof RestrictionSettings;

export interface MemoryCleanStatus {
  memory_percent: number;
  used_memory_gb: number;
  total_memory_gb: number;
}

export interface MemoryCleanResult {
  memory_freed_mb: number;
  processes_trimmed: number;
  processes_total: number;
  messages: string[];
}
