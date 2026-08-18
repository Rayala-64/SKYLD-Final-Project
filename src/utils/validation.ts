import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export const SignupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  full_name: z.string().min(2, "Full name must be at least 2 characters").max(100, "Full name is too long"),
  invite_code: z.string().min(5, "Invalid invite code"),
  consent_given: z.boolean().refine(val => val === true, "You must provide consent")
});

export const AnnouncementSchema = z.object({
  title: z.string().min(3).max(100),
  body: z.string().min(10).max(1000),
  scope: z.enum(["global", "pod"]),
  pod_id: z.string().uuid().optional().nullable()
});

export const DailyMissionSchema = z.object({
  studentId: z.string().uuid(),
  wordCardId: z.string().uuid(),
  reflectionText: z.string().min(1).max(5000),
  videoUrl: z.string().nullable(),
  isQuizCorrect: z.boolean()
});
