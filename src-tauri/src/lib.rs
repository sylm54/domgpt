// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod script_to_audio;
mod ttslib;

use script_to_audio::{check_tts_models, download_tts_models, generate_audio};

#[cfg(target_os = "android")]
fn init_logging() {
    android_logger::init_once(
        android_logger::Config::default()
            .with_max_level(log::LevelFilter::Debug)
            .with_tag("domgpt")
    );
    log::info!("Android logging initialized");
}

#[cfg(target_os = "android")]
fn init_ort() {
    if let Ok(ort_dir) = std::env::var("ORT_LIB_LOCATION") {
        log::info!("ORT library path: {}", ort_dir);
    } else {
        log::info!("ORT_LIB_LOCATION not set - using default library search");
    }
}

#[cfg(not(target_os = "android"))]
fn init_logging() {}

#[cfg(not(target_os = "android"))]
fn init_ort() {}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    init_logging();
    init_ort();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_cors_fetch::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            generate_audio,
            download_tts_models,
            check_tts_models
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
