use serde::{Deserialize, Serialize};
use sysinfo::{Pid, ProcessesToUpdate, System};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, State, WindowEvent};
use winreg::enums::*;
use winreg::RegKey;

#[derive(Debug, Serialize, Deserialize)]
struct RestrictResult {
    target_cores: Vec<u32>,
    sguard64_found: bool,
    sguard64_restricted: bool,
    sguardsvc64_found: bool,
    sguardsvc64_restricted: bool,
    message: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct SystemInfo {
    cpu_model: String,
    cpu_cores: usize,
    cpu_logical_cores: usize,
    os_name: String,
    os_version: String,
    is_admin: bool,
    total_memory_gb: f64,
    webview2_env: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ProcessPerformance {
    pid: u32,
    name: String,
    cpu_usage: f32,
    memory_mb: f64,
    disk_read_bytes: u64,
    disk_write_bytes: u64,
}

struct AppState;

const TASK_NAME: &str = "FuckACE_AutoStart";
const MEMORY_CLEAN_PROTECTED_PROCESS_NAMES: &[&str] = &[
    "system",
    "registry",
    "smss.exe",
    "csrss.exe",
    "wininit.exe",
    "winlogon.exe",
    "services.exe",
    "lsass.exe",
    "svchost.exe",
    "fontdrvhost.exe",
    "dwm.exe",
    "explorer.exe",
    "fuckace.exe",
    "sguard64.exe",
    "sguardsvc64.exe",
    "deltaforceclient-win64-shipping.exe",
    "valorant-win64-shipping.exe",
    "league of legends.exe",
    "abinfinite-win64-shipping.exe",
    "discovery.exe",
    "nzfuture-win64-shipping.exe",
    "crossfire.exe",
    "dnf.exe",
    "nrc-win64-shipping.exe",
    "client-win64-shipping.exe",
    "pathofexilesteam.exe",
    "thedivision2.exe",
    "endfield.exe",
    "calabiyau-win64-shipping.exe",
];

#[derive(Debug)]
struct WorkingSetCleanStats {
    processes_total: usize,
    protected_skipped: usize,
    processes_attempted: usize,
    processes_trimmed: usize,
}

const ALL_MONITORED_EXE_NAMES: &[&str] = &[
    "DeltaForceClient-Win64-Shipping.exe",
    "SGuard64.exe",
    "SGuardSvc64.exe",
    "VALORANT-Win64-Shipping.exe",
    "League of Legends.exe",
    "ABInfinite-Win64-Shipping.exe",
    "discovery.exe",
    "NZFuture-Win64-Shipping.exe",
    "crossfire.exe",
    "DNF.exe",
    "NRC-Win64-Shipping.exe",
    "Client-Win64-Shipping.exe",
    "PathOfExileSteam.exe",
    "TheDivision2.exe",
    "Endfield.exe",
    "Calabiyau-Win64-Shipping.exe",
];

fn set_game_registry_priority(exe_name: &str, cpu: u32, io: u32) -> Result<String, String> {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let base_path = r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options";
    let key_path = format!(r"{}\{}\PerfOptions", base_path, exe_name);

    match hklm.create_subkey(&key_path) {
        Ok((key, _)) => {
            key.set_value("CpuPriorityClass", &cpu)
                .map_err(|e| format!("{}:设置CPU优先级失败:{}", exe_name, e))?;
            key.set_value("IoPriority", &io)
                .map_err(|e| format!("{}:设置I/O优先级失败:{}", exe_name, e))?;
            Ok(format!("{}:设置成功(CPU:{},I/O:{})", exe_name, cpu, io))
        }
        Err(e) => Err(format!("{}:创建注册表项失败:{}", exe_name, e)),
    }
}

fn resolve_affinity(custom_cores: Option<Vec<u32>>) -> (Vec<u32>, u64, bool, bool) {
    let mut system = System::new();
    system.refresh_cpu_all();
    let total_cores = system.cpus().len() as u32;

    if let Some(cores) = custom_cores {
        let mut valid: Vec<u32> = cores
            .into_iter()
            .filter(|core| *core < total_cores && *core < 64)
            .collect();
        valid.sort_unstable();
        valid.dedup();
        if !valid.is_empty() {
            let core_mask = valid.iter().fold(0u64, |mask, core| mask | (1u64 << core));
            return (valid, core_mask, false, true);
        }
    }

    let target_core = if total_cores > 0 { total_cores - 1 } else { 0 };
    (vec![target_core], 1u64 << target_core, false, false)
}

fn format_core_mask(core_mask: u64) -> String {
    (0..64)
        .filter(|core| core_mask & (1u64 << core) != 0)
        .map(|core| core.to_string())
        .collect::<Vec<String>>()
        .join(",")
}

fn set_process_affinity(pid: Pid, core_mask: u64) -> (bool, Option<String>) {
    unsafe {
        use windows::Win32::Foundation::CloseHandle;
        use windows::Win32::System::Threading::{
            OpenProcess, SetProcessAffinityMask, PROCESS_QUERY_INFORMATION, PROCESS_SET_INFORMATION,
        };

        let process_handle = OpenProcess(
            PROCESS_SET_INFORMATION | PROCESS_QUERY_INFORMATION,
            false,
            pid.as_u32(),
        );

        let handle = match process_handle {
            Ok(h) => h,
            Err(e) => {
                eprintln!("[进程亲和性] PID {} OpenProcess失败: {:?}", pid, e);
                return (false, Some(format!("打开进程失败: {:?}", e)));
            }
        };

        if handle.is_invalid() {
            eprintln!("进程亲和性PID {} 进程句柄无效", pid);
            return (false, Some("进程句柄无效".to_string()));
        }

        let result = SetProcessAffinityMask(handle, core_mask as usize);

        let _ = CloseHandle(handle);

        if let Err(e) = &result {
            eprintln!("进程亲和性PID {} SetProcessAffinityMask失败: {:?}", pid, e);
            return (false, Some(format!("设置亲和性失败: {:?}", e)));
        }

        (true, None)
    }
}

fn set_process_affinity_with_fallback(
    pid: Pid,
    primary_core_mask: u64,
    is_e_core: bool,
) -> (bool, Option<String>, u64) {
    let (success, error) = set_process_affinity(pid, primary_core_mask);

    if success || !is_e_core {
        return (success, error, primary_core_mask);
    }

    eprintln!("进程亲和性PID {} E-Core绑定失败，尝试备用方案", pid);
    let mut system = System::new();
    system.refresh_cpu_all();
    let total_cores = system.cpus().len() as u32;
    let fallback_core = if total_cores > 0 { total_cores - 1 } else { 0 };
    let fallback_mask = 1u64 << fallback_core;

    let (fallback_success, fallback_error) = set_process_affinity(pid, fallback_mask);

    if fallback_success {
        eprintln!(
            "[进程亲和性] PID {} 备用方案成功，已绑定到核心 {}",
            pid, fallback_core
        );
        (true, None, fallback_mask)
    } else {
        (false, fallback_error, fallback_mask)
    }
}

fn set_process_priority(pid: Pid) -> bool {
    unsafe {
        use windows::Win32::Foundation::CloseHandle;
        use windows::Win32::System::Threading::{
            OpenProcess, SetPriorityClass, IDLE_PRIORITY_CLASS, PROCESS_QUERY_INFORMATION,
            PROCESS_SET_INFORMATION,
        };

        let process_handle = match OpenProcess(
            PROCESS_SET_INFORMATION | PROCESS_QUERY_INFORMATION,
            false,
            pid.as_u32(),
        ) {
            Ok(handle) => handle,
            Err(e) => {
                eprintln!("[进程优先级] PID {} OpenProcess失败: {:?}", pid, e);
                return false;
            }
        };

        if process_handle.is_invalid() {
            eprintln!("[进程优先级] PID {} 进程句柄无效", pid);
            return false;
        }

        let result = SetPriorityClass(process_handle, IDLE_PRIORITY_CLASS);

        let _ = CloseHandle(process_handle);

        if let Err(e) = &result {
            eprintln!("[进程优先级] PID {} SetPriorityClass失败: {:?}", pid, e);
        }

        result.is_ok()
    }
}

fn set_process_efficiency_mode(pid: Pid) -> (bool, Option<String>) {
    unsafe {
        use windows::Win32::Foundation::CloseHandle;
        use windows::Win32::System::Threading::{
            OpenProcess, ProcessPowerThrottling, SetProcessInformation,
            PROCESS_POWER_THROTTLING_EXECUTION_SPEED,
            PROCESS_POWER_THROTTLING_IGNORE_TIMER_RESOLUTION, PROCESS_POWER_THROTTLING_STATE,
            PROCESS_QUERY_INFORMATION, PROCESS_SET_INFORMATION,
        };

        let process_handle = match OpenProcess(
            PROCESS_SET_INFORMATION | PROCESS_QUERY_INFORMATION,
            false,
            pid.as_u32(),
        ) {
            Ok(handle) => handle,
            Err(e) => {
                eprintln!("[效率模式] PID {} OpenProcess失败: {:?}", pid, e);
                return (false, Some(format!("打开进程失败: {:?}", e)));
            }
        };

        if process_handle.is_invalid() {
            eprintln!("[效率模式] PID {} 进程句柄无效", pid);
            return (false, Some("进程句柄无效".to_string()));
        }

        let mut throttling_state = PROCESS_POWER_THROTTLING_STATE {
            Version: 1,
            ControlMask: PROCESS_POWER_THROTTLING_EXECUTION_SPEED
                | PROCESS_POWER_THROTTLING_IGNORE_TIMER_RESOLUTION,
            StateMask: PROCESS_POWER_THROTTLING_EXECUTION_SPEED
                | PROCESS_POWER_THROTTLING_IGNORE_TIMER_RESOLUTION,
        };

        let result = SetProcessInformation(
            process_handle,
            ProcessPowerThrottling,
            &mut throttling_state as *mut _ as *mut _,
            std::mem::size_of::<PROCESS_POWER_THROTTLING_STATE>() as u32,
        );

        let _ = CloseHandle(process_handle);

        if let Err(e) = &result {
            eprintln!("[效率模式] PID {} SetProcessInformation失败: {:?}", pid, e);
            return (false, Some(format!("设置效率模式失败: {:?}", e)));
        }

        (true, None)
    }
}

fn set_process_io_priority(pid: Pid) -> (bool, Option<String>) {
    unsafe {
        use windows::Win32::Foundation::CloseHandle;
        use windows::Win32::System::Threading::{
            OpenProcess, SetProcessInformation, PROCESS_INFORMATION_CLASS,
            PROCESS_QUERY_INFORMATION, PROCESS_SET_INFORMATION,
        };

        let process_handle = match OpenProcess(
            PROCESS_SET_INFORMATION | PROCESS_QUERY_INFORMATION,
            false,
            pid.as_u32(),
        ) {
            Ok(handle) => handle,
            Err(e) => {
                eprintln!("[I/O优先级] PID {} OpenProcess失败: {:?}", pid, e);
                return (false, Some(format!("打开进程失败: {:?}", e)));
            }
        };

        if process_handle.is_invalid() {
            eprintln!("[I/O优先级] PID {} 进程句柄无效", pid);
            return (false, Some("进程句柄无效".to_string()));
        }

        let io_priority: u32 = 0;
        let result = SetProcessInformation(
            process_handle,
            PROCESS_INFORMATION_CLASS(33),
            &io_priority as *const _ as *const _,
            std::mem::size_of::<u32>() as u32,
        );

        let _ = CloseHandle(process_handle);

        if let Err(e) = &result {
            eprintln!("[I/O优先级] PID {} SetProcessInformation失败: {:?}", pid, e);
            return (false, Some(format!("设置I/O优先级失败: {:?}", e)));
        }

        (true, None)
    }
}

fn set_process_memory_priority(pid: Pid) -> (bool, Option<String>) {
    unsafe {
        use windows::Win32::Foundation::CloseHandle;
        use windows::Win32::System::Threading::{
            OpenProcess, SetProcessInformation, PROCESS_INFORMATION_CLASS,
            PROCESS_QUERY_INFORMATION, PROCESS_SET_INFORMATION,
        };

        let process_handle = match OpenProcess(
            PROCESS_SET_INFORMATION | PROCESS_QUERY_INFORMATION,
            false,
            pid.as_u32(),
        ) {
            Ok(handle) => handle,
            Err(e) => {
                eprintln!("[内存优先级] PID {} OpenProcess失败: {:?}", pid, e);
                return (false, Some(format!("打开进程失败: {:?}", e)));
            }
        };

        if process_handle.is_invalid() {
            eprintln!("[内存优先级] PID {} 进程句柄无效", pid);
            return (false, Some("进程句柄无效".to_string()));
        }

        let memory_priority: u32 = 1;
        let result = SetProcessInformation(
            process_handle,
            PROCESS_INFORMATION_CLASS(39),
            &memory_priority as *const _ as *const _,
            std::mem::size_of::<u32>() as u32,
        );

        let _ = CloseHandle(process_handle);

        if let Err(e) = &result {
            eprintln!(
                "[内存优先级] PID {} SetProcessInformation失败: {:?}",
                pid, e
            );
            return (false, Some(format!("设置内存优先级失败: {:?}", e)));
        }

        (true, None)
    }
}

fn restrict_single_process(
    pid: Pid,
    enable_cpu_affinity: bool,
    enable_process_priority: bool,
    enable_efficiency_mode: bool,
    enable_io_priority: bool,
    enable_memory_priority: bool,
    core_mask: u64,
    is_e_core: bool,
) -> (bool, Vec<String>) {
    let (affinity_ok, affinity_err, actual_mask) = if enable_cpu_affinity {
        set_process_affinity_with_fallback(pid, core_mask, is_e_core)
    } else {
        (false, None, 0)
    };
    let priority_ok = if enable_process_priority {
        set_process_priority(pid)
    } else {
        false
    };

    let (efficiency_ok, io_priority_ok, mem_priority_ok) = {
        let (eff_ok, _) = if enable_efficiency_mode {
            set_process_efficiency_mode(pid)
        } else {
            (false, None)
        };
        let (io_ok, _) = if enable_io_priority {
            set_process_io_priority(pid)
        } else {
            (false, None)
        };
        let (mem_ok, _) = if enable_memory_priority {
            set_process_memory_priority(pid)
        } else {
            (false, None)
        };
        (eff_ok, io_ok, mem_ok)
    };

    let mut details = Vec::new();
    if affinity_ok {
        details.push(format!("CPU亲和性→核心{}", format_core_mask(actual_mask)));
    } else if let Some(err) = &affinity_err {
        details.push(format!("CPU亲和性✗({})", err));
    } else {
        details.push("CPU亲和性✗".to_string());
    }
    if priority_ok {
        details.push("优先级→最低".to_string());
    } else {
        details.push("优先级✗".to_string());
    }
    if efficiency_ok {
        details.push("效率模式✓".to_string());
    }
    if io_priority_ok {
        details.push("I/O优先级✓".to_string());
    }
    if mem_priority_ok {
        details.push("内存优先级✓".to_string());
    }

    let restricted = affinity_ok || priority_ok || efficiency_ok || io_priority_ok || mem_priority_ok;
    (restricted, details)
}

fn restrict_target_processes(
    enable_cpu_affinity: bool,
    enable_process_priority: bool,
    enable_efficiency_mode: bool,
    enable_io_priority: bool,
    enable_memory_priority: bool,
    affinity_cores: Option<Vec<u32>>,
) -> RestrictResult {
    enable_debug_privilege();

    let mut system = System::new();
    system.refresh_processes(ProcessesToUpdate::All, true);

    let (target_cores, core_mask, is_e_core, is_custom) = resolve_affinity(affinity_cores);

    let mut sguard64_found = false;
    let mut sguard64_restricted = false;
    let mut sguardsvc64_found = false;
    let mut sguardsvc64_restricted = false;

    let mut message = String::new();

    let mode_parts: Vec<&str> = vec![
        if enable_cpu_affinity {
            "CPU亲和性"
        } else {
            ""
        },
        if enable_process_priority {
            "进程优先级"
        } else {
            ""
        },
        if enable_efficiency_mode {
            "效率模式"
        } else {
            ""
        },
        if enable_io_priority {
            "I/O优先级"
        } else {
            ""
        },
        if enable_memory_priority {
            "内存优先级"
        } else {
            ""
        },
    ]
    .into_iter()
    .filter(|s| !s.is_empty())
    .collect();

    let mode_str = if mode_parts.is_empty() {
        "标准模式".to_string()
    } else {
        mode_parts.join("+")
    };
    message.push_str(&format!("限制模式: {}\n", mode_str));

    if is_custom {
        let core_list = target_cores
            .iter()
            .map(|core| core.to_string())
            .collect::<Vec<String>>()
            .join(",");
        message.push_str(&format!("绑定到自定义核心 {}\n", core_list));
    } else {
        message.push_str(&format!("绑定到最后一个逻辑核心 {}\n", target_cores[0]));
    }

    for (pid, process) in system.processes() {
        let process_name = process.name().to_string_lossy().to_lowercase();

        if process_name.contains("sguard64.exe") {
            sguard64_found = true;
            let (restricted, details) = restrict_single_process(
                *pid, enable_cpu_affinity, enable_process_priority,
                enable_efficiency_mode, enable_io_priority, enable_memory_priority,
                core_mask, is_e_core,
            );
            let details_str = details.join(", ");
            if restricted {
                sguard64_restricted = true;
                message.push_str(&format!("SGuard64.exe (PID: {}) [{}]\n", pid, details_str));
            } else {
                message.push_str(&format!("SGuard64.exe (PID: {}) 所有限制均失败 [{}]\n", pid, details_str));
            }
        }

        if process_name.contains("sguardsvc64.exe") {
            sguardsvc64_found = true;
            let (restricted, details) = restrict_single_process(
                *pid, enable_cpu_affinity, enable_process_priority,
                enable_efficiency_mode, enable_io_priority, enable_memory_priority,
                core_mask, is_e_core,
            );
            let details_str = details.join(", ");
            if restricted {
                sguardsvc64_restricted = true;
                message.push_str(&format!("SGuardSvc64.exe (PID: {}) [{}]\n", pid, details_str));
            } else {
                message.push_str(&format!("SGuardSvc64.exe (PID: {}) 所有限制均失败 [{}]\n", pid, details_str));
            }
        }
    }

    if !sguard64_found {
        message.push_str("未找到SGuard64.exe进程\n");
    }

    if !sguardsvc64_found {
        message.push_str("未找到SGuardSvc64.exe进程\n");
    }

    RestrictResult {
        target_cores,
        sguard64_found,
        sguard64_restricted,
        sguardsvc64_found,
        sguardsvc64_restricted,
        message,
    }
}

#[tauri::command]
async fn restrict_processes(
    _state: State<'_, AppState>,
    enable_cpu_affinity: bool,
    enable_process_priority: bool,
    enable_efficiency_mode: bool,
    enable_io_priority: bool,
    enable_memory_priority: bool,
    affinity_cores: Option<Vec<u32>>,
) -> Result<RestrictResult, String> {
    let result = restrict_target_processes(
        enable_cpu_affinity,
        enable_process_priority,
        enable_efficiency_mode,
        enable_io_priority,
        enable_memory_priority,
        affinity_cores,
    );
    Ok(result)
}

fn enable_debug_privilege() -> bool {
    unsafe {
        use windows::core::PCWSTR;
        use windows::Win32::Foundation::{CloseHandle, LUID};
        use windows::Win32::Security::{
            AdjustTokenPrivileges, LookupPrivilegeValueW, LUID_AND_ATTRIBUTES,
            SE_PRIVILEGE_ENABLED, TOKEN_ADJUST_PRIVILEGES, TOKEN_PRIVILEGES,
        };
        use windows::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

        let mut token_handle = windows::Win32::Foundation::HANDLE::default();

        if OpenProcessToken(
            GetCurrentProcess(),
            TOKEN_ADJUST_PRIVILEGES,
            &mut token_handle,
        )
        .is_err()
        {
            eprintln!("[权限提升] OpenProcessToken失败");
            return false;
        }

        let mut luid = LUID::default();
        let privilege_name: Vec<u16> = "SeDebugPrivilege\0".encode_utf16().collect();

        if LookupPrivilegeValueW(PCWSTR::null(), PCWSTR(privilege_name.as_ptr()), &mut luid)
            .is_err()
        {
            eprintln!("[权限提升] LookupPrivilegeValueW失败");
            let _ = CloseHandle(token_handle);
            return false;
        }

        let mut tp = TOKEN_PRIVILEGES {
            PrivilegeCount: 1,
            Privileges: [LUID_AND_ATTRIBUTES {
                Luid: luid,
                Attributes: SE_PRIVILEGE_ENABLED,
            }],
        };

        let result = AdjustTokenPrivileges(token_handle, false, Some(&mut tp), 0, None, None);

        let _ = CloseHandle(token_handle);

        if result.is_ok() {
            eprintln!("[权限提升] SeDebugPrivilege已启用");
            true
        } else {
            eprintln!("[权限提升] AdjustTokenPrivileges失败");
            false
        }
    }
}

fn is_elevated() -> bool {
    unsafe {
        use windows::Win32::Foundation::CloseHandle;
        use windows::Win32::Security::{
            GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY,
        };
        use windows::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

        let mut token_handle = windows::Win32::Foundation::HANDLE::default();

        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token_handle).is_err() {
            return false;
        }

        let mut elevation = TOKEN_ELEVATION { TokenIsElevated: 0 };
        let mut return_length: u32 = 0;

        let result = GetTokenInformation(
            token_handle,
            TokenElevation,
            Some(&mut elevation as *mut _ as *mut _),
            std::mem::size_of::<TOKEN_ELEVATION>() as u32,
            &mut return_length,
        );

        let _ = CloseHandle(token_handle);

        result.is_ok() && elevation.TokenIsElevated != 0
    }
}


#[cfg(target_os = "windows")]
fn escape_xml_text(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

#[cfg(target_os = "windows")]
fn write_utf16_xml(path: &std::path::Path, xml: &str) -> Result<(), std::io::Error> {
    let mut bytes = Vec::with_capacity(2 + xml.len() * 2);
    bytes.extend_from_slice(&[0xff, 0xfe]);

    for unit in xml.encode_utf16() {
        bytes.extend_from_slice(&unit.to_le_bytes());
    }

    std::fs::write(path, bytes)
}

#[cfg(target_os = "windows")]
fn create_autostart_task(exe_path: &str) -> Result<(), String> {
    let command = escape_xml_text(exe_path);
    let xml = format!(
        r#"<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>FuckACE Auto Start</Description>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
      <Delay>PT10S</Delay>
    </LogonTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>HighestAvailable</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>false</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>{}</Command>
      <Arguments>--autostart</Arguments>
    </Exec>
  </Actions>
</Task>"#,
        command
    );

    let temp_dir = std::env::temp_dir();
    let xml_path = temp_dir.join("fuckace_task.xml");
    write_utf16_xml(&xml_path, &xml)
        .map_err(|e| format!("写入任务XML失败: {}", e))?;

    let xml_path_str = xml_path.to_string_lossy().to_string();

    let output = std::process::Command::new("schtasks")
        .args([
            "/create",
            "/tn",
            TASK_NAME,
            "/xml",
            &xml_path_str,
            "/f",
        ])
        .output()
        .map_err(|e| format!("执行schtasks失败: {}", e))?;

    let _ = std::fs::remove_file(&xml_path);

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("创建计划任务失败: {}", stderr.trim()))
    }
}

#[cfg(target_os = "windows")]
fn delete_autostart_task() -> bool {
    std::process::Command::new("schtasks")
        .args(["/delete", "/tn", TASK_NAME, "/f"])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[cfg(target_os = "windows")]
fn autostart_task_exists() -> bool {
    std::process::Command::new("schtasks")
        .args(["/query", "/tn", TASK_NAME])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[cfg(target_os = "windows")]
fn get_autostart_task_command_path() -> Option<String> {
    let output = std::process::Command::new("schtasks")
        .args(["/query", "/tn", TASK_NAME, "/xml"])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    // schtasks 重定向输出时通常为UTF-16LE(带BOM)，兼容ANSI/UTF-8
    let bytes = &output.stdout;
    let xml = if bytes.len() >= 2 && bytes[0] == 0xff && bytes[1] == 0xfe {
        let units: Vec<u16> = bytes[2..]
            .chunks_exact(2)
            .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
            .collect();
        String::from_utf16_lossy(&units)
    } else {
        String::from_utf8_lossy(bytes).to_string()
    };

    extract_task_command(&xml)
}

#[cfg(target_os = "windows")]
fn extract_task_command(xml: &str) -> Option<String> {
    let start = xml.find("<Command>")? + "<Command>".len();
    let end = xml[start..].find("</Command>")? + start;
    Some(xml[start..end].trim().to_string())
}

#[cfg(target_os = "windows")]
fn unescape_xml_text(value: &str) -> String {
    value
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&apos;", "'")
        .replace("&amp;", "&")
}

#[cfg(target_os = "windows")]
fn paths_equivalent(left: &str, right: &str) -> bool {
    let normalize = |path: &str| path.replace('/', "\\").to_lowercase();
    normalize(left) == normalize(right)
}

#[cfg(target_os = "windows")]
fn self_heal_autostart_task() {
    // 任务不存在说明用户没开自启动，不处理
    let old_path = match get_autostart_task_command_path() {
        Some(path) => path,
        None => return,
    };

    let current_exe = match std::env::current_exe() {
        Ok(exe) => exe,
        Err(_) => return,
    };
    let current_path = current_exe.to_string_lossy().to_string();

    if paths_equivalent(&unescape_xml_text(&old_path), &current_path) {
        return;
    }

    match create_autostart_task(&current_path) {
        Ok(()) => eprintln!(
            "[自启动自愈] 检测到exe路径已变化，已重建计划任务: {}",
            current_path
        ),
        Err(e) => eprintln!("[自启动自愈] 重建计划任务失败: {}", e),
    }
}

#[cfg(target_os = "windows")]
fn cleanup_legacy_registry_autostart() {
    let hkcu = winreg::RegKey::predef(winreg::enums::HKEY_CURRENT_USER);
    if let Ok(key) = hkcu.open_subkey_with_flags(
        r"Software\Microsoft\Windows\CurrentVersion\Run",
        winreg::enums::KEY_WRITE,
    ) {
        let _ = key.delete_value("FuckACE");
    }
}

#[tauri::command]
async fn get_webview2_environment() -> String {
    #[cfg(target_os = "windows")]
    {
        use std::env;
        if let Ok(webview_path) = env::var("WEBVIEW2_BROWSER_EXECUTABLE_FOLDER") {
            if !webview_path.is_empty() {
                return "便携环境".to_string();
            }
        }
        if let Ok(exe_path) = env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                if exe_dir.join("webview2").exists() {
                    return "便携环境".to_string();
                }
            }
        }
        "本地环境".to_string()
    }

    #[cfg(not(target_os = "windows"))]
    {
        "非Windows平台".to_string()
    }
}

fn get_cpu_model_from_registry() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let cpu_key = hklm
            .open_subkey(r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
            .ok()?;

        return cpu_key
            .get_value::<String, _>("ProcessorNameString")
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty());
    }

    #[cfg(not(target_os = "windows"))]
    {
        None
    }
}

#[tauri::command]
async fn get_system_info() -> SystemInfo {
    let mut system = System::new();
    system.refresh_cpu_all();
    system.refresh_memory();

    let cpu_model = system
        .cpus()
        .first()
        .map(|cpu| cpu.brand().trim())
        .filter(|brand| !brand.is_empty())
        .map(|brand| brand.to_string())
        .or_else(get_cpu_model_from_registry)
        .unwrap_or_else(|| "Unknown".to_string());

    let cpu_cores = system.physical_core_count().unwrap_or(0);
    let cpu_logical_cores = system.cpus().len();

    let os_name = System::name().unwrap_or_else(|| "Unknown".to_string());
    let os_version = System::os_version().unwrap_or_else(|| "Unknown".to_string());

    let is_admin = is_elevated();

    let total_memory_gb = system.total_memory() as f64 / 1024.0 / 1024.0 / 1024.0;

    SystemInfo {
        cpu_model,
        cpu_cores,
        cpu_logical_cores,
        os_name,
        os_version,
        is_admin,
        total_memory_gb,
        webview2_env: get_webview2_environment().await,
    }
}

#[tauri::command]
async fn get_process_performance() -> Vec<ProcessPerformance> {
    let mut system = System::new();
    system.refresh_cpu_all();
    system.refresh_processes(ProcessesToUpdate::All, true);

    std::thread::sleep(std::time::Duration::from_millis(200));
    system.refresh_processes(ProcessesToUpdate::All, true);

    let target_names = vec!["sguard64.exe", "sguardsvc64.exe"];
    let mut performances = Vec::new();

    for (pid, process) in system.processes() {
        let process_name = process.name().to_string_lossy().to_lowercase();

        for target in &target_names {
            if process_name.contains(target) {
                let disk = process.disk_usage();
                performances.push(ProcessPerformance {
                    pid: pid.as_u32(),
                    name: process.name().to_string_lossy().to_string(),
                    cpu_usage: process.cpu_usage(),
                    memory_mb: process.memory() as f64 / 1024.0 / 1024.0,
                    disk_read_bytes: disk.read_bytes,
                    disk_write_bytes: disk.written_bytes,
                });
                break;
            }
        }
    }

    performances
}

fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "隐藏到托盘", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &show,
            &PredefinedMenuItem::separator(app)?,
            &hide,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;

    let _tray = TrayIconBuilder::with_id("main-tray")
        .tooltip("FuckACE")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
                button: tauri::tray::MouseButton::Left,
                ..
            } => {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_always_on_top(true);
                    let _ = window.set_focus();
                    let _ = window.set_always_on_top(false);
                }
            }
            TrayIconEvent::DoubleClick {
                button: tauri::tray::MouseButton::Left,
                ..
            } => {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_always_on_top(true);
                    let _ = window.set_focus();
                    let _ = window.set_always_on_top(false);
                }
            }
            _ => {}
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
            "quit" => {
                std::process::exit(0);
            }
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_always_on_top(true);
                    let _ = window.set_focus();
                    let _ = window.set_always_on_top(false);
                }
            }
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}

#[tauri::command]
async fn show_close_dialog(app_handle: AppHandle) -> Result<String, String> {
    //最小化到托盘＞﹏＜
    if let Some(window) = app_handle.get_webview_window("main") {
        window.hide().unwrap();
    }
    Ok("已最小化到托盘".to_string())
}

#[tauri::command]
async fn close_application(_app_handle: AppHandle) -> Result<String, String> {
    //退出FuckACE/(ㄒoㄒ)/~~
    std::process::exit(0);
}

fn get_exe_path() -> Result<String, String> {
    std::env::current_exe()
        .map_err(|e| format!("获取程序路径失败: {}", e))?
        .to_str()
        .ok_or_else(|| "路径转换失败".to_string())
        .map(|s| s.to_string())
}

#[tauri::command]
async fn enable_autostart() -> Result<String, String> {
    if !is_elevated() {
        return Err("需要管理员权限才能创建开机自启动计划任务".to_string());
    }

    let exe_path = get_exe_path()?;

    cleanup_legacy_registry_autostart();

    create_autostart_task(&exe_path)?;

    Ok("开机静默管理员自启动已启用".to_string())
}

#[tauri::command]
async fn disable_autostart() -> Result<String, String> {
    cleanup_legacy_registry_autostart();
    delete_autostart_task();

    Ok("开机自启动已禁用".to_string())
}

#[tauri::command]
async fn check_autostart() -> Result<bool, String> {
    Ok(autostart_task_exists())
}

#[tauri::command]
async fn lower_ace_priority() -> Result<String, String> {
    if !is_elevated() {
        return Err("需要管理员权限才能修改注册表".to_string());
    }
    let results: Vec<String> = ["SGuard64.exe", "SGuardSvc64.exe"]
        .iter()
        .map(|name| set_game_registry_priority(name, 1, 1).unwrap_or_else(|e| e))
        .collect();
    Ok(results.join("\n"))
}

#[tauri::command]
async fn raise_delta_priority() -> Result<String, String> {
    if !is_elevated() { return Err("需要管理员权限才能修改注册表".to_string()); }
    set_game_registry_priority("DeltaForceClient-Win64-Shipping.exe", 3, 3)
}

#[tauri::command]
async fn raise_crossfire_priority() -> Result<String, String> {
    if !is_elevated() { return Err("需要管理员权限才能修改注册表".to_string()); }
    set_game_registry_priority("crossfire.exe", 3, 3)
}

#[tauri::command]
async fn modify_valorant_registry_priority() -> Result<String, String> {
    if !is_elevated() { return Err("需要管理员权限才能修改注册表".to_string()); }
    set_game_registry_priority("VALORANT-Win64-Shipping.exe", 3, 3)
}

#[tauri::command]
async fn raise_league_priority() -> Result<String, String> {
    if !is_elevated() { return Err("需要管理员权限才能修改注册表".to_string()); }
    set_game_registry_priority("League of Legends.exe", 3, 3)
}

#[tauri::command]
async fn raise_arena_priority() -> Result<String, String> {
    if !is_elevated() { return Err("需要管理员权限才能修改注册表".to_string()); }
    set_game_registry_priority("ABInfinite-Win64-Shipping.exe", 3, 3)
}

#[tauri::command]
async fn raise_finals_priority() -> Result<String, String> {
    if !is_elevated() { return Err("需要管理员权限才能修改注册表".to_string()); }
    set_game_registry_priority("discovery.exe", 3, 3)
}

#[tauri::command]
async fn raise_nzfuture_priority() -> Result<String, String> {
    if !is_elevated() { return Err("需要管理员权限才能修改注册表".to_string()); }
    set_game_registry_priority("NZFuture-Win64-Shipping.exe", 3, 3)
}

#[tauri::command]
async fn raise_dnf_priority() -> Result<String, String> {
    if !is_elevated() { return Err("需要管理员权限才能修改注册表".to_string()); }
    set_game_registry_priority("DNF.exe", 3, 3)
}

#[tauri::command]
async fn raise_rocoworld_priority() -> Result<String, String> {
    if !is_elevated() { return Err("需要管理员权限才能修改注册表".to_string()); }
    set_game_registry_priority("NRC-Win64-Shipping.exe", 3, 3)
}

#[tauri::command]
async fn raise_wutheringwaves_priority() -> Result<String, String> {
    if !is_elevated() { return Err("需要管理员权限才能修改注册表".to_string()); }
    set_game_registry_priority("Client-Win64-Shipping.exe", 3, 3)
}

#[tauri::command]
async fn raise_poe2_priority() -> Result<String, String> {
    if !is_elevated() { return Err("需要管理员权限才能修改注册表".to_string()); }
    set_game_registry_priority("PathOfExileSteam.exe", 3, 3)
}

#[tauri::command]
async fn raise_division2_priority() -> Result<String, String> {
    if !is_elevated() { return Err("需要管理员权限才能修改注册表".to_string()); }
    set_game_registry_priority("TheDivision2.exe", 3, 3)
}

#[tauri::command]
async fn raise_endfield_priority() -> Result<String, String> {
    if !is_elevated() { return Err("需要管理员权限才能修改注册表".to_string()); }
    set_game_registry_priority("Endfield.exe", 3, 3)
}

#[tauri::command]
async fn raise_calabiyau_priority() -> Result<String, String> {
    if !is_elevated() { return Err("需要管理员权限才能修改注册表".to_string()); }
    set_game_registry_priority("Calabiyau-Win64-Shipping.exe", 3, 3)
}

#[tauri::command]
async fn check_registry_priority() -> Result<String, String> {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let base_path = r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options";

    let mut results = Vec::new();

    for exe_name in ALL_MONITORED_EXE_NAMES {
        let key_path = format!(r"{}\{}\PerfOptions", base_path, exe_name);

        match hklm.open_subkey(&key_path) {
            Ok(key) => {
                let cpu_priority: Result<u32, _> = key.get_value("CpuPriorityClass");
                let io_priority: Result<u32, _> = key.get_value("IoPriority");

                let cpu_str = match cpu_priority {
                    Ok(v) => format!("CPU:{}", v),
                    Err(_) => "CPU:未设置".to_string(),
                };

                let io_str = match io_priority {
                    Ok(v) => format!("I/O:{}", v),
                    Err(_) => "I/O:未设置".to_string(),
                };

                results.push(format!("{}:[{},{}]", exe_name, cpu_str, io_str));
            }
            Err(_) => {
                results.push(format!("{}:未配置", exe_name));
            }
        }
    }

    Ok(results.join("\n"))
}

#[tauri::command]
async fn reset_registry_priority() -> Result<String, String> {
    if !is_elevated() {
        return Err("需要管理员权限才能修改注册表".to_string());
    }

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let base_path = r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options";

    let mut results = Vec::new();

    for exe_name in ALL_MONITORED_EXE_NAMES {
        let exe_key_path = format!(r"{}\{}", base_path, exe_name);

        match hklm.open_subkey_with_flags(&exe_key_path, KEY_WRITE) {
            Ok(exe_key) => match exe_key.delete_subkey("PerfOptions") {
                Ok(_) => {
                    results.push(format!("{}:已恢复默认", exe_name));
                }
                Err(e) => {
                    results.push(format!("{}:删除失败:{}", exe_name, e));
                }
            },
            Err(_) => {
                results.push(format!("{}:未找到配置项", exe_name));
            }
        }
    }

    Ok(results.join("\n"))
}

fn enable_privilege(privilege_name: &str) -> bool {
    unsafe {
        use windows::core::PCWSTR;
        use windows::Win32::Foundation::{CloseHandle, LUID};
        use windows::Win32::Security::{
            AdjustTokenPrivileges, LookupPrivilegeValueW, LUID_AND_ATTRIBUTES,
            SE_PRIVILEGE_ENABLED, TOKEN_ADJUST_PRIVILEGES, TOKEN_PRIVILEGES,
        };
        use windows::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

        let mut token_handle = windows::Win32::Foundation::HANDLE::default();
        if OpenProcessToken(
            GetCurrentProcess(),
            TOKEN_ADJUST_PRIVILEGES,
            &mut token_handle,
        )
        .is_err()
        {
            return false;
        }

        let mut luid = LUID::default();
        let priv_wide: Vec<u16> = privilege_name
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();

        if LookupPrivilegeValueW(PCWSTR::null(), PCWSTR(priv_wide.as_ptr()), &mut luid).is_err() {
            let _ = CloseHandle(token_handle);
            return false;
        }

        let mut tp = TOKEN_PRIVILEGES {
            PrivilegeCount: 1,
            Privileges: [LUID_AND_ATTRIBUTES {
                Luid: luid,
                Attributes: SE_PRIVILEGE_ENABLED,
            }],
        };

        let result = AdjustTokenPrivileges(token_handle, false, Some(&mut tp), 0, None, None);
        let _ = CloseHandle(token_handle);
        result.is_ok()
    }
}

fn is_memory_clean_protected_process(process_name: &str) -> bool {
    let normalized_name = process_name.to_lowercase();
    MEMORY_CLEAN_PROTECTED_PROCESS_NAMES
        .iter()
        .any(|protected_name| normalized_name == *protected_name)
}

fn get_process_entry_name(
    entry: &windows::Win32::System::Diagnostics::ToolHelp::PROCESSENTRY32W,
) -> String {
    let end = entry
        .szExeFile
        .iter()
        .position(|character| *character == 0)
        .unwrap_or(entry.szExeFile.len());

    String::from_utf16_lossy(&entry.szExeFile[..end])
}

fn empty_safe_working_sets() -> WorkingSetCleanStats {
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
        TH32CS_SNAPPROCESS,
    };
    use windows::Win32::System::ProcessStatus::EmptyWorkingSet;
    use windows::Win32::System::Threading::{
        OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_SET_QUOTA,
    };

    let current_pid = std::process::id();
    let mut stats = WorkingSetCleanStats {
        processes_total: 0,
        protected_skipped: 0,
        processes_attempted: 0,
        processes_trimmed: 0,
    };

    unsafe {
        let snapshot = match CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) {
            Ok(snapshot) => snapshot,
            Err(_) => return stats,
        };

        if snapshot.is_invalid() {
            return stats;
        }

        let mut entry: PROCESSENTRY32W = std::mem::zeroed();
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;

        if Process32FirstW(snapshot, &mut entry).is_ok() {
            loop {
                stats.processes_total += 1;
                let pid = entry.th32ProcessID;

                let process_name = get_process_entry_name(&entry);
                let is_protected = pid == 0
                    || pid == 4
                    || pid == current_pid
                    || is_memory_clean_protected_process(&process_name);

                if is_protected {
                    stats.protected_skipped += 1;
                } else {
                    stats.processes_attempted += 1;

                    if let Ok(handle) = OpenProcess(
                        PROCESS_QUERY_INFORMATION | PROCESS_SET_QUOTA,
                        false,
                        pid,
                    ) {
                        if !handle.is_invalid() {
                            if EmptyWorkingSet(handle).is_ok() {
                                stats.processes_trimmed += 1;
                            }
                            let _ = CloseHandle(handle);
                        }
                    }
                }

                if Process32NextW(snapshot, &mut entry).is_err() {
                    break;
                }
            }
        }

        let _ = CloseHandle(snapshot);
    }

    stats
}

#[derive(Debug, Serialize, Deserialize)]
struct MemoryCleanStatus {
    memory_percent: f64,
    used_memory_gb: f64,
    total_memory_gb: f64,
}

#[tauri::command]
async fn get_memory_clean_status() -> MemoryCleanStatus {
    let mut system = System::new();
    system.refresh_memory();

    let total = system.total_memory() as f64;
    let used = system.used_memory() as f64;
    let memory_percent = if total > 0.0 { used / total * 100.0 } else { 0.0 };
    let total_gb = total / 1024.0 / 1024.0 / 1024.0;
    let used_gb = used / 1024.0 / 1024.0 / 1024.0;

    MemoryCleanStatus {
        memory_percent,
        used_memory_gb: used_gb,
        total_memory_gb: total_gb,
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct MemoryCleanResult {
    memory_freed_mb: f64,
    processes_trimmed: usize,
    processes_total: usize,
    messages: Vec<String>,
}

#[tauri::command]
async fn clean_memory_and_temp() -> MemoryCleanResult {
    enable_debug_privilege();
    enable_privilege("SeIncreaseQuotaPrivilege");

    let mut system_before = System::new();
    system_before.refresh_memory();
    let used_before = system_before.used_memory();

    let stats = empty_safe_working_sets();
    let mut messages = vec![
        format!(
            "安全清理完成，已修剪 {}/{} 个普通后台进程工作集",
            stats.processes_trimmed, stats.processes_attempted
        ),
        format!(
            "已跳过 {} 个游戏/ACE/系统/自身保护进程",
            stats.protected_skipped
        ),
        "已跳过系统缓存/Standby List清理，避免影响游戏资源缓存".to_string(),
    ];

    std::thread::sleep(std::time::Duration::from_millis(400));

    let mut system_after = System::new();
    system_after.refresh_memory();
    let used_after = system_after.used_memory();
    let memory_freed_mb = if used_before > used_after {
        (used_before - used_after) as f64 / 1024.0 / 1024.0
    } else {
        0.0
    };
    messages.push(format!("内存释放 {:.1} MB", memory_freed_mb));

    MemoryCleanResult {
        memory_freed_mb,
        processes_trimmed: stats.processes_trimmed,
        processes_total: stats.processes_total,
        messages,
    }
}

#[tauri::command]
async fn save_report_to_desktop(image_base64: String, filename: String) -> Result<String, String> {
    use base64::Engine;

    let desktop = get_desktop_path()?;

    if !desktop.exists() {
        return Err("桌面路径不存在".to_string());
    }

    let data = base64::engine::general_purpose::STANDARD
        .decode(&image_base64)
        .map_err(|e| format!("解码图片失败: {}", e))?;

    let file_path = desktop.join(&filename);
    std::fs::write(&file_path, data).map_err(|e| format!("保存文件失败: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

fn get_desktop_path() -> Result<std::path::PathBuf, String> {
    use std::path::PathBuf;

    unsafe {
        use windows::Win32::System::Com::CoTaskMemFree;
        use windows::Win32::UI::Shell::{FOLDERID_Desktop, SHGetKnownFolderPath, KF_FLAG_DEFAULT};

        if let Ok(raw_path) = SHGetKnownFolderPath(&FOLDERID_Desktop, KF_FLAG_DEFAULT, None) {
            let path = raw_path
                .to_string()
                .map(PathBuf::from)
                .map_err(|error| format!("解析桌面路径失败: {}", error));
            CoTaskMemFree(Some(raw_path.0 as *const _));

            if path.is_ok() {
                return path;
            }
        }
    }

    if let Ok(userprofile) = std::env::var("USERPROFILE") {
        return Ok(PathBuf::from(userprofile).join("Desktop"));
    }

    Err("无法获取桌面路径".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .manage(AppState)
        .setup(|app| {
            setup_tray(app.handle())?;
            #[cfg(target_os = "windows")]
            std::thread::spawn(self_heal_autostart_task);
            let args: Vec<String> = std::env::args().collect();
            let is_autostart = args.iter().any(|a| a == "--autostart");
            if !is_autostart {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = window.hide();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            restrict_processes,
            get_system_info,
            get_process_performance,
            show_close_dialog,
            close_application,
            enable_autostart,
            disable_autostart,
            check_autostart,
            lower_ace_priority,
            raise_delta_priority,
            modify_valorant_registry_priority,
            raise_league_priority,
            raise_arena_priority,
            raise_finals_priority,
            raise_nzfuture_priority,
            check_registry_priority,
            reset_registry_priority,
            save_report_to_desktop,
            raise_crossfire_priority,
            raise_dnf_priority,
            raise_rocoworld_priority,
            raise_wutheringwaves_priority,
            raise_poe2_priority,
            raise_division2_priority,
            raise_endfield_priority,
            raise_calabiyau_priority,
            get_memory_clean_status,
            clean_memory_and_temp,

        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
