use tauri::State;
use crate::{AppState, models::*};

#[tauri::command]
pub async fn list_projects(
    state: State<'_, AppState>,
    user_id: Option<i64>,
) -> Result<Vec<Project>, String> {
    // Placeholder implementation
    Ok(vec![])
}

#[tauri::command]
pub async fn create_project(
    state: State<'_, AppState>,
    request: CreateProjectRequest,
    user_id: i64,
) -> Result<Project, String> {
    // Placeholder implementation
    Err("Not implemented yet".to_string())
}

#[tauri::command]
pub async fn get_project(
    state: State<'_, AppState>,
    project_id: i64,
) -> Result<Project, String> {
    // Placeholder implementation
    Err("Not implemented yet".to_string())
}

#[tauri::command]
pub async fn update_project(
    state: State<'_, AppState>,
    project_id: i64,
    name: Option<String>,
    description: Option<String>,
    deadline: Option<String>,
    status: Option<String>,
) -> Result<Project, String> {
    // Placeholder implementation
    Err("Not implemented yet".to_string())
}