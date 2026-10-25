export type TPGroup = 'G1' | 'G2';

export interface StudentProfile {
  id: string;
  email: string;
  full_name: string | null;
  filiere: string;
  semester: string;
  tp_group: TPGroup;
  sleep_start: string;
  sleep_end: string;
  lunch_start: string;
  lunch_end: string;
  dinner_start: string;
  dinner_end: string;
  preferred_session_minutes: number;
  max_daily_study_hours: number;
  timezone: string;
  audio_storage_mode?: 'supabase' | 'local';
  local_audio_folder?: string;
  focus_sound_type?: 'synthesizer' | 'custom_file' | 'youtube' | 'none';
  focus_sound_url?: string;
  focus_sound_title?: string;
  focus_custom_sounds?: FocusCustomSound[];
}

export interface FocusCustomSound {
  id: string;
  title: string;
  type: 'file' | 'youtube';
  url: string;
  created_at?: string;
}

export interface Subject {
  id: string;
  user_id: string;
  code: string;
  name: string;
  color: string;
  professor?: string | null;
  room?: string | null;
  difficulty: number;
  is_default?: boolean;
}

export type EventType = 'CM' | 'TD' | 'TP' | 'personal' | 'exam' | 'study_session' | 'sleep' | 'meal' | 'other';

export interface CalendarEvent {
  id: string;
  user_id: string;
  subject_id?: string | null;
  title: string;
  event_type: EventType;
  start_time: string;
  end_time: string;
  day_of_week?: number | null;
  is_recurring?: boolean;
  room?: string | null;
  professor?: string | null;
  tp_group?: TPGroup | null;
  notes?: string | null;
  subject?: Subject;
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
  deadline: string;
  estimated_duration_minutes: number;
  actual_duration_minutes: number;
  priority: TaskPriority;
  difficulty: number;
  status: TaskStatus;
  notes?: string | null;
  created_at: string;
  completed_at?: string | null;
  subject?: Subject;
  calculated_urgency?: number;
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
}

export interface FocusSession {
  id: string;
  user_id: string;
  task_id?: string | null;
  start_time: string;
  end_time: string;
  planned_minutes: number;
  actual_minutes: number;
  task_completed: boolean;
  productivity_rating?: number | null;
  notes?: string | null;
  task?: { title: string; subject?: { code: string; name: string } };
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

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tool_calls?: { tool: string; args: any; result: any }[] | null;
  created_at: string;
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

export interface AudioRecordingItem {
  id: string;
  url: string;
  duration?: number;
  title?: string;
  created_at: string;
}

export interface DocumentPageNote {
  id: string;
  user_id: string;
  document_id: string;
  page_number: number;
  text_content?: string | null;
  audio_url?: string | null;
  audio_duration_seconds?: number;
  audio_recordings?: AudioRecordingItem[];
  created_at: string;
  updated_at: string;
}

