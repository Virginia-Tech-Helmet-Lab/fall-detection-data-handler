import { invoke } from '@tauri-apps/api/core';

// Define types for our API requests and responses
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role?: string;
}

export interface User {
  user_id: number;
  username: string;
  email: string;
  role: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  last_active?: string;
}

export interface Video {
  video_id: number;
  filename: string;
  resolution?: string;
  framerate?: number;
  duration?: number;
  import_date: string;
  normalization_settings?: string;
  status: string;
  is_completed: boolean;
  project_id?: number;
  assigned_to?: number;
}

export interface Project {
  project_id: number;
  name: string;
  description?: string;
  created_by: number;
  created_at: string;
  deadline?: string;
  status: string;
  total_videos: number;
  completed_videos: number;
}

export interface TemporalAnnotation {
  annotation_id: number;
  video_id: number;
  start_time: number;
  end_time: number;
  start_frame: number;
  end_frame: number;
  label: string;
  created_by?: number;
  created_at: string;
}

export interface BoundingBoxAnnotation {
  bbox_id: number;
  video_id: number;
  frame_index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  part_label: string;
  created_by?: number;
  created_at: string;
}

// Authentication API
export const authAPI = {
  login: async (credentials: LoginRequest): Promise<User> => {
    return await invoke('login', { request: credentials });
  },
  
  logout: async (): Promise<void> => {
    return await invoke('logout');
  },
  
  register: async (userData: RegisterRequest): Promise<User> => {
    return await invoke('register', { request: userData });
  },
  
  getCurrentUser: async (userId: number): Promise<User> => {
    return await invoke('get_current_user', { userId });
  },
  
  changePassword: async (userId: number, passwordData: { current_password: string; new_password: string }): Promise<void> => {
    return await invoke('change_password', { userId, request: passwordData });
  }
};

// Video API
export const videoAPI = {
  listVideos: async (filters: { project_id?: number; assigned_to?: number; unassigned?: boolean } = {}): Promise<Video[]> => {
    return await invoke('list_videos', {
      projectId: filters.project_id || null,
      assignedTo: filters.assigned_to || null,
      unassigned: filters.unassigned || null
    });
  },
  
  uploadVideos: async (filePaths: string[], projectId?: number): Promise<Video[]> => {
    return await invoke('upload_videos', { filePaths, projectId: projectId || null });
  },
  
  getVideoMetadata: async (filePath: string) => {
    return await invoke('get_video_metadata', { filePath });
  }
};

// Annotation API
export const annotationAPI = {
  getAnnotations: async (videoId: number): Promise<[TemporalAnnotation[], BoundingBoxAnnotation[]]> => {
    return await invoke('get_annotations', { videoId });
  },
  
  saveTemporalAnnotation: async (annotationData: Omit<TemporalAnnotation, 'annotation_id' | 'created_at'>, userId?: number): Promise<TemporalAnnotation> => {
    return await invoke('save_temporal_annotation', { 
      request: annotationData, 
      userId: userId || null
    });
  },
  
  saveBboxAnnotation: async (annotationData: Omit<BoundingBoxAnnotation, 'bbox_id' | 'created_at'>, userId?: number): Promise<BoundingBoxAnnotation> => {
    return await invoke('save_bbox_annotation', { 
      request: annotationData, 
      userId: userId || null
    });
  },
  
  deleteAnnotation: async (annotationType: 'temporal' | 'bbox', annotationId: number): Promise<void> => {
    return await invoke('delete_annotation', { annotationType, annotationId });
  }
};

// Project API
export const projectAPI = {
  listProjects: async (userId?: number): Promise<Project[]> => {
    return await invoke('list_projects', { userId: userId || null });
  },
  
  createProject: async (projectData: { name: string; description?: string; deadline?: string }, userId: number): Promise<Project> => {
    return await invoke('create_project', { request: projectData, userId });
  },
  
  getProject: async (projectId: number): Promise<Project> => {
    return await invoke('get_project', { projectId });
  },
  
  updateProject: async (projectId: number, updates: Partial<Pick<Project, 'name' | 'description' | 'deadline' | 'status'>>): Promise<Project> => {
    return await invoke('update_project', { 
      projectId,
      name: updates.name || null,
      description: updates.description || null,
      deadline: updates.deadline || null,
      status: updates.status || null
    });
  }
};

// Export unified API object
const api = {
  auth: authAPI,
  videos: videoAPI,
  annotations: annotationAPI,
  projects: projectAPI
};

export default api;