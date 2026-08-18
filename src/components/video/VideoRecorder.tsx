"use client";

import { useState, useRef, useEffect } from "react";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { Mic, Square, Video, UploadCloud, AlertCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const MAX_RECORDING_TIME_MS = 60000; // 1 minute cap

export function VideoRecorder({ 
  studentId, 
  onUploadSuccess 
}: { 
  studentId: string, 
  onUploadSuccess: (url: string) => void 
}) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check browser support
  useEffect(() => {
    if (typeof window !== 'undefined' && !navigator.mediaDevices?.getUserMedia) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("Your browser does not support video recording.");
    }
  }, []);

  const requestPermissions = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError("Permission denied. Please click the lock icon in your browser's address bar to allow camera and microphone access, then try again.");
        } else if (err.name === 'NotFoundError') {
          setError("No camera or microphone found on your device.");
        } else {
          setError("Could not access camera/microphone. " + err.message);
        }
      } else {
        setError("Could not access camera/microphone.");
      }
    }
  };

  const startRecording = () => {
    if (!stream) return;
    
    setRecordedBlob(null);
    chunksRef.current = [];
    
    const mediaRecorder = new MediaRecorder(stream, { 
      mimeType: 'video/webm',
      videoBitsPerSecond: 250000 // High compression for reduced storage bloat
    });
    mediaRecorderRef.current = mediaRecorder;
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = URL.createObjectURL(blob);
      }
    };
    
    mediaRecorder.start();
    setIsRecording(true);
    setTimeLeft(60);
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const uploadVideo = async () => {
    if (!recordedBlob) return;
    
    // Validate File Size (10MB max)
    if (recordedBlob.size > 10 * 1024 * 1024) {
      setError("Video is too large. Maximum size is 10MB. Please record a shorter video.");
      return;
    }

    setIsUploading(true);
    setError(null);
    
    try {
      const supabase = createClient();
      const uniqueId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      const fileName = `${studentId}/${uniqueId}.webm`;
      
      const { data, error: uploadErr } = await supabase.storage
        .from('videos')
        .upload(fileName, recordedBlob, {
          contentType: 'video/webm',
          upsert: false // Prevent malicious overwrites
        });
        
      if (uploadErr) throw uploadErr;
      
      onUploadSuccess(data.path);
    } catch (err: unknown) {
      console.error("Upload error:", err);
      setError("Failed to upload video. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stream]);

  if (error) {
    return (
      <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-xl text-destructive flex items-center gap-3">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <div className="flex-1 text-sm">{error}</div>
        {!stream && (
          <PremiumButton size="sm" onClick={requestPermissions}>Retry</PremiumButton>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-inner">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted={!recordedBlob} // Mute while live to prevent feedback
          controls={!!recordedBlob}
          className="w-full h-full object-cover"
        />
        
        {isRecording && (
          <div className="absolute top-4 right-4 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-white" />
            0:{timeLeft.toString().padStart(2, '0')}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {!stream && !recordedBlob && (
          <PremiumButton onClick={requestPermissions}>
            <Video className="w-4 h-4 mr-2" /> Enable Camera
          </PremiumButton>
        )}
        
        {stream && !isRecording && !recordedBlob && (
          <PremiumButton onClick={startRecording}>
            <Mic className="w-4 h-4 mr-2" /> Start Recording
          </PremiumButton>
        )}
        
        {isRecording && (
          <PremiumButton variant="destructive" onClick={stopRecording}>
            <Square className="w-4 h-4 mr-2" /> Stop Recording
          </PremiumButton>
        )}
        
        {recordedBlob && !isUploading && (
          <>
            <PremiumButton variant="outline" onClick={() => {
              setRecordedBlob(null);
              if (videoRef.current) videoRef.current.srcObject = stream;
            }}>
              Retake
            </PremiumButton>
            <PremiumButton onClick={uploadVideo}>
              <UploadCloud className="w-4 h-4 mr-2" /> Submit Video
            </PremiumButton>
          </>
        )}
        
        {isUploading && (
          <PremiumButton disabled>
            <span className="animate-spin mr-2">⟳</span> Uploading...
          </PremiumButton>
        )}
      </div>
    </div>
  );
}
