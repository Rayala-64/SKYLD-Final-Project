export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'student' | 'mentor' | 'admin'
          pod_id: string | null
          buddy_id: string | null
          consent_given: boolean
          consent_date: string | null
          created_at: string
        }
      }
      pods: {
        Row: {
          id: string
          name: string
          admin_id: string | null
        }
      }
      word_cards: {
        Row: {
          id: string
          word: string
          definition: string
          example_sentence: string
          activity: Json | null
          active_date: string
        }
      }
      submissions: {
        Row: {
          id: string
          user_id: string
          word_card_id: string
          date: string
          reflection_text: string | null
          reflection_ai_feedback: Json | null
          video_url: string | null
          video_ai_feedback: Json | null
          points_earned: number
          status: 'not_started' | 'practice_completed' | 'reflection_completed' | 'submitted' | 'reviewed'
        }
      }
      streaks: {
        Row: {
          user_id: string
          current_streak: number
          longest_streak: number
          last_active_date: string | null
        }
      }
      badges: {
        Row: {
          id: string
          name: string
          criteria: Json
        }
      }
      user_badges: {
        Row: {
          user_id: string
          badge_id: string
          earned_at: string
        }
      }
      pod_messages: {
        Row: {
          id: string
          pod_id: string
          sender_id: string
          message: string
          created_at: string
        }
      }
      announcements: {
        Row: {
          id: string
          scope: 'global' | 'pod'
          pod_id: string | null
          author_id: string
          title: string
          body: string
          created_at: string
        }
      }
      mentor_notes: {
        Row: {
          id: string
          mentor_id: string
          student_id: string
          note: string
          flagged: boolean
          created_at: string
        }
      }
      invites: {
        Row: {
          id: string
          code: string
          role: 'student' | 'mentor' | 'admin'
          pod_id: string | null
          created_by: string
          used_by: string | null
          expires_at: string
          created_at: string
        }
      }
      feedback: {
        Row: {
          id: string
          user_id: string
          page: string
          message: string
          created_at: string
        }
      }
      xp_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          reason: string
          created_at: string
        }
      }
      practice_attempts: {
        Row: {
          id: string
          user_id: string
          word_card_id: string
          is_correct: boolean
          time_spent_seconds: number | null
          created_at: string
        }
      }
      ai_jobs: {
        Row: {
          id: string
          submission_id: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          error_message: string | null
          attempts: number
          created_at: string
          updated_at: string
        }
      }
    }
    Views: Record<string, never>
  }
}
