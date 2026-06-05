use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

#[derive(Serialize, Deserialize, Clone)]
pub struct RecentFile {
    pub path: String,
    pub title: String,
    #[serde(alias = "openedAt")]
    pub opened_at: String,
}

#[derive(Serialize)]
struct ExportDocxResult {
    files: Vec<String>,
    #[serde(rename = "outputDir")]
    output_dir: String,
}

fn app_data_dir(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("failed to resolve app data dir")
}

fn recent_path(app: &tauri::AppHandle) -> PathBuf {
    app_data_dir(app).join("recent.json")
}

fn recovery_path(app: &tauri::AppHandle) -> PathBuf {
    app_data_dir(app).join("recovery").join("autosave.shitei")
}

fn ensure_parent(path: &PathBuf) {
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
}

fn list_docx(dir: &str) -> Result<HashSet<String>, String> {
    let mut set = HashSet::new();
    let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("docx") {
            set.insert(path.to_string_lossy().into_owned());
        }
    }
    Ok(set)
}

fn sidecar_candidates() -> &'static [&'static str] {
    if cfg!(target_os = "windows") {
        &[
            "generate_docx-x86_64-pc-windows-msvc.exe",
            "generate_docx.exe",
            "generate_docx",
        ]
    } else if cfg!(target_os = "macos") {
        &[
            "generate_docx",
            "generate_docx-aarch64-apple-darwin",
            "generate_docx-x86_64-apple-darwin",
        ]
    } else {
        &["generate_docx"]
    }
}

fn find_generate_docx() -> Result<(PathBuf, bool), String> {
    if let Ok(exe) = tauri::utils::platform::current_exe() {
        if let Some(dir) = exe.parent() {
            for name in sidecar_candidates() {
                let p = dir.join(name);
                if p.exists() {
                    return Ok((p, false));
                }
            }
        }
    }

    let bundled = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("binaries");
    if bundled.is_dir() {
        for name in sidecar_candidates() {
            let p = bundled.join(name);
            if p.exists() {
                return Ok((p, false));
            }
        }
    }

    let script = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../tools/generate_docx/generate_docx.py");
    if script.exists() {
        return Ok((script, true));
    }

    let sidecar_hint = if cfg!(target_os = "windows") {
        "npm run build:sidecar:win"
    } else {
        "npm run build:sidecar"
    };
    Err(format!(
        "docx 生成エンジンが見つかりません。\n\
         開発時: pip install python-docx\n\
         配布用: {sidecar_hint}"
    ))
}

fn run_python_script(
    engine: &Path,
    input_flag: &str,
    input_path: &str,
    output_dir: &str,
) -> Result<std::process::Output, String> {
    let args = [
        engine.to_string_lossy().into_owned(),
        input_flag.to_string(),
        input_path.to_string(),
        "--output_dir".to_string(),
        output_dir.to_string(),
    ];

    if cfg!(target_os = "windows") {
        let try_cmds: &[&[&str]] = &[&["python"], &["py", "-3"]];
        let mut last_err = String::new();
        for cmd in try_cmds {
            let mut command = Command::new(cmd[0]);
            for part in &cmd[1..] {
                command.arg(part);
            }
            for arg in &args {
                command.arg(arg);
            }
            match command.output() {
                Ok(output) => return Ok(output),
                Err(e) => last_err = e.to_string(),
            }
        }
        return Err(format!(
            "Python の実行に失敗しました: {last_err}\n\
             pip install -r tools/generate_docx/requirements.txt を試してください"
        ));
    }

    Command::new("python3")
        .arg(engine)
        .arg(input_flag)
        .arg(input_path)
        .arg("--output_dir")
        .arg(output_dir)
        .output()
        .map_err(|e| {
            format!(
                "python3 の実行に失敗しました: {e}\n\
                 pip install -r tools/generate_docx/requirements.txt を試してください"
            )
        })
}

fn run_generate_docx(
    engine: &Path,
    is_python_script: bool,
    input_flag: &str,
    input_path: &str,
    output_dir: &str,
) -> Result<(), String> {
    let output = if is_python_script {
        run_python_script(engine, input_flag, input_path, output_dir)?
    } else {
        Command::new(engine)
            .arg(input_flag)
            .arg(input_path)
            .arg("--output_dir")
            .arg(output_dir)
            .output()
            .map_err(|e| format!("docx 生成コマンドの起動に失敗しました: {e}"))?
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!(
            "docx 生成に失敗しました:\n{stderr}{stdout}"
        ));
    }
    Ok(())
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    ensure_parent(&PathBuf::from(&path));
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_recent(app: tauri::AppHandle) -> Result<Vec<RecentFile>, String> {
    let p = recent_path(&app);
    if !p.exists() {
        return Ok(vec![]);
    }
    let s = fs::read_to_string(p).map_err(|e| e.to_string())?;
    serde_json::from_str(&s).map_err(|e| e.to_string())
}

#[tauri::command]
fn add_recent(app: tauri::AppHandle, entry: RecentFile) -> Result<(), String> {
    let mut list = read_recent(app.clone()).unwrap_or_default();
    list.retain(|r| r.path != entry.path);
    list.insert(0, entry);
    if list.len() > 10 {
        list.truncate(10);
    }
    let p = recent_path(&app);
    ensure_parent(&p);
    let json = serde_json::to_string_pretty(&list).map_err(|e| e.to_string())?;
    fs::write(p, json).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_recovery(app: tauri::AppHandle, content: String) -> Result<(), String> {
    let p = recovery_path(&app);
    ensure_parent(&p);
    fs::write(p, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_recovery(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let p = recovery_path(&app);
    if !p.exists() {
        return Ok(None);
    }
    let s = fs::read_to_string(p).map_err(|e| e.to_string())?;
    Ok(Some(s))
}

#[tauri::command]
fn clear_recovery(app: tauri::AppHandle) -> Result<(), String> {
    let p = recovery_path(&app);
    if p.exists() {
        fs::remove_file(p).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn export_docx_cases(cases_json: Vec<String>, output_dir: String) -> Result<ExportDocxResult, String> {
    if cases_json.is_empty() {
        return Err("出力する症例がありません".into());
    }

    fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?;
    let before = list_docx(&output_dir)?;

    let (engine, is_python) = find_generate_docx()?;

    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let temp_base = std::env::temp_dir().join(format!("shitei-docx-{ts}"));
    fs::create_dir_all(&temp_base).map_err(|e| e.to_string())?;

    let run_result = if cases_json.len() == 1 {
        let input_path = temp_base.join("case.json");
        fs::write(&input_path, &cases_json[0]).map_err(|e| e.to_string())?;
        run_generate_docx(
            &engine,
            is_python,
            "--input",
            input_path.to_str().unwrap_or(""),
            &output_dir,
        )
    } else {
        for (i, json) in cases_json.iter().enumerate() {
            let path = temp_base.join(format!("case{}.json", i + 1));
            fs::write(&path, json).map_err(|e| e.to_string())?;
        }
        run_generate_docx(
            &engine,
            is_python,
            "--input_dir",
            temp_base.to_str().unwrap_or(""),
            &output_dir,
        )
    };

    let _ = fs::remove_dir_all(&temp_base);
    run_result?;

    let after = list_docx(&output_dir)?;
    let mut files: Vec<String> = after.difference(&before).cloned().collect();
    if files.is_empty() {
        files = after.into_iter().collect();
    }
    files.sort();

    Ok(ExportDocxResult {
        files,
        output_dir,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file,
            read_recent,
            add_recent,
            write_recovery,
            read_recovery,
            clear_recovery,
            export_docx_cases
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
