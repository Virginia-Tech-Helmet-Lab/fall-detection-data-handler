// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod database;
mod models;
mod commands;

use tauri::Manager;
use std::sync::Mutex;
use database::Database;

// Application state
pub struct AppState {
    pub db: Mutex<Database>,
}

// Simple greeting command for testing
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize async runtime for database
    let rt = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
    let db = rt.block_on(async {
        Database::new().await.expect("Failed to initialize database")
    });
    
    let app_state = AppState {
        db: Mutex::new(db),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::auth::login,
            commands::auth::logout,
            commands::auth::register,
            commands::auth::get_current_user,
            commands::auth::change_password,
            commands::videos::list_videos,
            commands::videos::upload_videos,
            commands::videos::get_video_metadata,
            commands::annotations::get_annotations,
            commands::annotations::save_temporal_annotation,
            commands::annotations::save_bbox_annotation,
            commands::annotations::delete_annotation,
            commands::projects::list_projects,
            commands::projects::create_project,
            commands::projects::get_project,
            commands::projects::update_project,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}