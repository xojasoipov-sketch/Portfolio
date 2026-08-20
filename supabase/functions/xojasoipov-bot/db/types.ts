export type Language = "uz" | "en";
export type Source = "instagram" | "qr" | "website" | "telegram" | "direct" | "other";

export type Intent =
  | "GENERAL_INFO"
  | "PORTFOLIO"
  | "PROJECT_INQUIRY"
  | "HIRE"
  | "PARTNERSHIP"
  | "PRICE_INQUIRY"
  | "TECHNICAL_QUESTION"
  | "CV_REQUEST"
  | "CONTACT_REQUEST"
  | "OTHER";

export type LeadStatus = "NEW" | "REVIEWING" | "CONTACTED" | "QUALIFIED" | "REJECTED" | "COMPLETED";
export type LeadPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface UserRow {
  id: string;
  telegram_user_id: number;
  telegram_username: string | null;
  first_name: string | null;
  language: Language;
  source: Source;
  is_admin: boolean;
  is_blocked: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationRow {
  id: string;
  user_id: string;
  status: "active" | "ended";
  intent: Intent | null;
  summary: string | null;
  draft: LeadDraft;
  pending_confirmation: boolean;
  low_confidence_streak: number;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tokens_used: number | null;
  created_at: string;
}

/** Fields the AI agent fills in incrementally as the conversation progresses. */
export interface LeadDraft {
  intent?: Intent;
  project_type?: string;
  project_title?: string;
  description?: string;
  goal?: string;
  features?: string[];
  target_users?: string;
  business_type?: string;
  current_system?: string;
  budget?: string;
  deadline?: string;
  contact?: string;
}

export interface LeadRow extends LeadDraft {
  id: string;
  conversation_id: string | null;
  user_id: string;
  telegram_username: string | null;
  first_name: string | null;
  language: Language;
  conversation_summary: string | null;
  ai_summary: string | null;
  lead_score: number | null;
  priority: LeadPriority;
  status: LeadStatus;
  source: Source;
  dedupe_hash: string | null;
  admin_notified_at: string | null;
  admin_message_id: number | null;
  created_at: string;
  updated_at: string;
}

export type NotificationType = "new_lead" | "hot_lead" | "human_handoff" | "ai_error" | "system_alert" | "broadcast";

export type KnowledgeCategory =
  | "portfolio"
  | "projects"
  | "services"
  | "skills"
  | "experience"
  | "faq"
  | "cv"
  | "contact"
  | "pricing";

export interface KnowledgeItemRow {
  id: string;
  category: KnowledgeCategory;
  key: string;
  content: unknown;
  updated_at: string;
}
