use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub user_id: i64,
    pub username: String,
    pub email: String,
    pub password_hash: String,
    pub role: String,
    pub full_name: String,
    pub is_active: bool,
    pub created_at: String,
    pub last_active: Option<String>,
    pub failed_login_attempts: i64,
    pub locked_until: Option<String>,
    pub password_changed_at: String,
    pub must_change_password: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserPublic {
    pub user_id: i64,
    pub username: String,
    pub email: String,
    pub role: String,
    pub full_name: String,
    pub is_active: bool,
    pub created_at: String,
    pub last_active: Option<String>,
}

impl From<User> for UserPublic {
    fn from(user: User) -> Self {
        UserPublic {
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            role: user.role,
            full_name: user.full_name,
            is_active: user.is_active,
            created_at: user.created_at,
            last_active: user.last_active,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Project {
    pub project_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub created_by: i64,
    pub created_at: String,
    pub deadline: Option<String>,
    pub status: String,
    pub annotation_schema: Option<String>,
    pub normalization_settings: Option<String>,
    pub quality_threshold: f64,
    pub total_videos: i64,
    pub completed_videos: i64,
    pub last_activity: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Video {
    pub video_id: i64,
    pub filename: String,
    pub resolution: Option<String>,
    pub framerate: Option<f64>,
    pub duration: Option<f64>,
    pub import_date: String,
    pub normalization_settings: Option<String>,
    pub status: String,
    pub is_completed: bool,
    pub project_id: Option<i64>,
    pub assigned_to: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TemporalAnnotation {
    pub annotation_id: i64,
    pub video_id: i64,
    pub start_time: f64,
    pub end_time: f64,
    pub start_frame: i64,
    pub end_frame: i64,
    pub label: String,
    pub created_by: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BoundingBoxAnnotation {
    pub bbox_id: i64,
    pub video_id: i64,
    pub frame_index: i64,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub part_label: String,
    pub created_by: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
    pub full_name: String,
    pub role: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
    pub description: Option<String>,
    pub deadline: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveTemporalAnnotationRequest {
    pub video_id: i64,
    pub start_time: f64,
    pub end_time: f64,
    pub start_frame: i64,
    pub end_frame: i64,
    pub label: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveBboxAnnotationRequest {
    pub video_id: i64,
    pub frame_index: i64,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub part_label: String,
}