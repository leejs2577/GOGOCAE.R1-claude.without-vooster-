export type UserRole = 'manager' | 'client';

export type RequestStatus =
  | 'pending_assignment'
  | 'before_start'
  | 'in_progress'
  | 'completed';

export interface User {
  id: string;
  email: string;
  name: string;
  department: string;
  role: UserRole;
  created_at: string;
}

export interface VehicleModel {
  id: string;
  name: string;
  created_at: string;
}

export interface DesignFile {
  name: string;
  url: string;
  size: number;
}

export interface AnalysisRequest {
  id: string;
  requester_id: string;
  assigned_to: string | null;
  vehicle_model_id: string;
  parent_request_id: string | null;
  analysis_name: string;
  description: string | null;
  status: RequestStatus;
  request_date: string;
  assigned_date: string | null;
  started_date: string | null;
  completed_date: string | null;
  design_files: DesignFile[] | null;
  report_file_url: string | null;
  created_at: string;
  updated_at: string;
  requester?: User;
  assigned_user?: User;
  vehicle_model?: VehicleModel;
}

export interface Message {
  id: string;
  request_id: string;
  user_id: string;
  content: string;
  file_url: string | null;
  created_at: string;
  user?: User;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string;
  request_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface StatusHistory {
  id: string;
  request_id: string;
  changed_by: string;
  from_status: RequestStatus | null;
  to_status: RequestStatus;
  changed_at: string;
  changed_by_user?: User;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      vehicle_models: {
        Row: VehicleModel;
        Insert: Omit<VehicleModel, 'id' | 'created_at'>;
        Update: Partial<Omit<VehicleModel, 'id' | 'created_at'>>;
      };
      analysis_requests: {
        Row: AnalysisRequest;
        Insert: Omit<AnalysisRequest, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AnalysisRequest, 'id' | 'created_at' | 'updated_at'>>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'created_at'>;
        Update: Partial<Omit<Message, 'id' | 'created_at'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'>;
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>;
      };
      status_history: {
        Row: StatusHistory;
        Insert: Omit<StatusHistory, 'id' | 'changed_at'>;
        Update: Partial<Omit<StatusHistory, 'id' | 'changed_at'>>;
      };
    };
  };
}
