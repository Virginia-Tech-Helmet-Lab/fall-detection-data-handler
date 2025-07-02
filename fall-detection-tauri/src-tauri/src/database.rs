use sqlx::{SqlitePool, sqlite::SqliteConnectOptions, Row};
use std::str::FromStr;
use crate::models::*;
use anyhow::Result;

pub struct Database {
    pool: SqlitePool,
}

impl Database {
    pub async fn new() -> Result<Self> {
        let options = SqliteConnectOptions::from_str("sqlite:fall_detection.db")?
            .create_if_missing(true);
        
        let pool = SqlitePool::connect_with(options).await?;
        
        let db = Database { pool };
        db.initialize_tables().await?;
        
        Ok(db)
    }

    async fn initialize_tables(&self) -> Result<()> {
        // Create users table
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'annotator',
                full_name TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                last_active TEXT DEFAULT CURRENT_TIMESTAMP,
                failed_login_attempts INTEGER DEFAULT 0,
                locked_until TEXT,
                password_changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
                must_change_password BOOLEAN DEFAULT 0
            )
        "#).execute(&self.pool).await?;

        // Create projects table
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS projects (
                project_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                created_by INTEGER NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                deadline TEXT,
                status TEXT DEFAULT 'setup',
                annotation_schema TEXT,
                normalization_settings TEXT,
                quality_threshold REAL DEFAULT 0.8,
                total_videos INTEGER DEFAULT 0,
                completed_videos INTEGER DEFAULT 0,
                last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users (user_id)
            )
        "#).execute(&self.pool).await?;

        // Create videos table
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS videos (
                video_id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                resolution TEXT,
                framerate REAL,
                duration REAL,
                import_date TEXT DEFAULT CURRENT_TIMESTAMP,
                normalization_settings TEXT,
                status TEXT DEFAULT 'pending',
                is_completed BOOLEAN DEFAULT 0,
                project_id INTEGER,
                assigned_to INTEGER,
                FOREIGN KEY (project_id) REFERENCES projects (project_id),
                FOREIGN KEY (assigned_to) REFERENCES users (user_id)
            )
        "#).execute(&self.pool).await?;

        // Create temporal annotations table
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS temporal_annotations (
                annotation_id INTEGER PRIMARY KEY AUTOINCREMENT,
                video_id INTEGER NOT NULL,
                start_time REAL NOT NULL,
                end_time REAL NOT NULL,
                start_frame INTEGER NOT NULL,
                end_frame INTEGER NOT NULL,
                label TEXT NOT NULL,
                created_by INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (video_id) REFERENCES videos (video_id),
                FOREIGN KEY (created_by) REFERENCES users (user_id)
            )
        "#).execute(&self.pool).await?;

        // Create bounding box annotations table
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS bbox_annotations (
                bbox_id INTEGER PRIMARY KEY AUTOINCREMENT,
                video_id INTEGER NOT NULL,
                frame_index INTEGER NOT NULL,
                x REAL NOT NULL,
                y REAL NOT NULL,
                width REAL NOT NULL,
                height REAL NOT NULL,
                part_label TEXT NOT NULL,
                created_by INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (video_id) REFERENCES videos (video_id),
                FOREIGN KEY (created_by) REFERENCES users (user_id)
            )
        "#).execute(&self.pool).await?;

        // Create default admin user if no users exist
        let user_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
            .fetch_one(&self.pool)
            .await?;

        if user_count == 0 {
            let password_hash = bcrypt::hash("admin123", bcrypt::DEFAULT_COST)?;
            sqlx::query(r#"
                INSERT INTO users (username, email, password_hash, role, full_name)
                VALUES ('admin', 'admin@example.com', ?, 'admin', 'Administrator')
            "#)
            .bind(password_hash)
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }
}