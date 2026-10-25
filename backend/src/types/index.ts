export type TPGroup = 'G1' | 'G2';

export interface StudentProfile {
  id: string;
  email: string;
  full_name: string | null;
  filiere: string;
  semester: string;
  tp_group: TPGroup;
  sleep_start: string; // '23:30:00'
  sleep_end: string;   // '07:00:00'
  lunch_start: string; // '12:15:00'
  lunch_end: string;   // '14:30:00'
  dinner_start: string; // '19:30:00'
  dinner_end: string;   // '20:30:00'
  preferred_session_minutes: number;
  max_daily_study_hours: number;
  timezone: string;
  created_at?: string;
  updated_at?: string;
}

export interface Subject {
  id: string;
  user_id: string;
  code: string;
  name: string;
  color: string;
  professor?: string | null;
  room?: string | null;
  difficulty: number; // 1-5
  is_default?: boolean;
  created_at?: string;
}

export type EventType = 'CM' | 'TD' | 'TP' | 'personal' | 'exam' | 'study_session' | 'sleep' | 'meal' | 'other';

export interface CalendarEvent {
  id: string;
  user_id: string;
  subject_id?: string | null;
  title: string;
  event_type: EventType;
  start_time: string; // ISO string
  end_time: string;   // ISO string
  day_of_week?: number | null; // 1 = Monday, 7 = Sunday
  is_recurring?: boolean;
  recurrence_rule?: string | null;
  room?: string | null;
  professor?: string | null;
  tp_group?: TPGroup | null;
  notes?: string | null;
  subject?: Subject;
  task_session_id?: string | null;
  created_at?: string;
}

export type TaskType = 'devoir' | 'exercise' | 'project' | 'presentation' | 'report' | 'research' | 'revision' | 'exam_prep' | 'other';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'completed';

export interface Task {
  id: string;
  user_id: string;
  subject_id?: string | null;
  title: string;
  description?: string | null;
  task_type: TaskType;
  deadline: string; // ISO string
  estimated_duration_minutes: number;
  actual_duration_minutes: number;
  priority: TaskPriority;
  difficulty: number; // 1-5
  status: TaskStatus;
  notes?: string | null;
  created_at: string;
  completed_at?: string | null;
  subject?: Subject;
  sessions?: TaskSession[];
  calculated_urgency?: number;
}

export interface TaskSession {
  id: string;
  task_id: string;
  user_id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  planned_minutes: number;
  actual_minutes: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'partially_completed' | 'skipped';
  session_order: number;
  notes?: string | null;
  created_at?: string;
  task?: Task;
}

export interface Exam {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  exam_date: string;
  duration_minutes: number;
  room?: string | null;
  topics?: string | null;
  difficulty: number;
  importance: 'normal' | 'high' | 'critical';
  revision_status: 'pending' | 'in_progress' | 'prepared';
  subject?: Subject;
  created_at?: string;
}

export interface FocusSession {
  id: string;
  user_id: string;
  task_id?: string | null;
  session_id?: string | null;
  start_time: string;
  end_time: string;
  planned_minutes: number;
  actual_minutes: number;
  task_completed: boolean;
  productivity_rating?: number | null;
  notes?: string | null;
  created_at?: string;
}

export interface UserVelocityStats {
  id: string;
  user_id: string;
  subject_id: string;
  task_type: TaskType;
  samples_count: number;
  avg_ratio_actual_vs_planned: number;
  median_duration_minutes: number;
  updated_at: string;
}

export interface SmartNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: 'deadline_warning' | 'exam_prep' | 'session_reminder' | 'overdue_alert' | 'schedule_advice';
  related_task_id?: string | null;
  related_exam_id?: string | null;
  is_read: boolean;
  scheduled_for: string;
  created_at: string;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
}

export interface ScheduleSuggestion {
  task: Task;
  sessions: {
    title: string;
    start: Date;
    end: Date;
    durationMinutes: number;
    order: number;
  }[];
}

export type DocumentType = 'cours' | 'td' | 'tp' | 'audio';

export interface ModuleDocument {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  doc_type: DocumentType;
  file_url: string;
  file_name: string;
  file_size?: number;
  total_pages?: number;
  created_at: string;
  subject?: Subject;
}

export interface DocumentPageNote {
  id: string;
  user_id: string;
  document_id: string;
  page_number: number;
  text_content?: string | null;
  audio_url?: string | null;
  audio_duration_seconds?: number;
  created_at: string;
  updated_at: string;
}

