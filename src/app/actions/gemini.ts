"use server";

import { createClient } from "@/utils/supabase/server";
import { 
  analyzeReflectionInternal, 
  analyzeSpeechInternal, 
  generateActivitiesInternal,
  type ReflectionFeedback,
  type SpeechFeedback
} from "@/lib/server/ai";

export type { ReflectionFeedback, SpeechFeedback };



export async function generateActivities(word: string, definition: string, example: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') {
    return null;
  }
  
  return generateActivitiesInternal(word, definition, example);
}
