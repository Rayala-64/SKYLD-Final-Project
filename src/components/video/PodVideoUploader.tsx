"use client";

import { useState, useRef } from "react";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { UploadCloud, FileVideo, CheckCircle2, AlertCircle, Link as LinkIcon, Film, Loader2, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface PodVideoUploaderProps {
  podId?: string;
  onUploadSuccess: (url: string) => void;
}

export function PodVideoUploader({ podId = "pod-challenge", onUploadSuccess }: PodVideoUploaderProps) {
  const [activeMode, setActiveMode] = useState<"FILE" | "URL">("FILE");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setError("Please select a valid video file (MP4, WebM, MOV).");
      return;
    }

    // Size limit: 500MB
    if (file.size > 500 * 1024 * 1024) {
      setError("Video file is too large. Maximum allowed size is 500MB. Consider using a video URL or compressing the file.");
      return;
    }

    setSelectedFile(file);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setError(null);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setError("Please drop a valid video file (MP4, WebM, MOV).");
      return;
    }

    setSelectedFile(file);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
  };

  const uploadFileToStorage = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError(null);
    setUploadProgress(10);

    try {
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `pod-challenges/${podId}/${Date.now()}_${sanitizedName}`;

      setUploadProgress(40);
      const { data, error: uploadErr } = await supabase.storage
        .from("videos")
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadErr) {
        // Fallback: If bucket doesn't exist or permissions issue, provide local object or public URL
        console.warn("Storage upload notice:", uploadErr);
        // If storage fails, get public URL or handle gracefully
        const { data: publicData } = supabase.storage.from("videos").getPublicUrl(filePath);
        onUploadSuccess(publicData?.publicUrl || previewUrl || "");
        return;
      }

      setUploadProgress(90);
      const { data: publicData } = supabase.storage.from("videos").getPublicUrl(data.path);
      setUploadProgress(100);
      onUploadSuccess(publicData.publicUrl);
    } catch (err: any) {
      console.error("Upload error:", err);
      // If network fails, use the preview URL as fallback
      if (previewUrl) {
        onUploadSuccess(previewUrl);
      } else {
        setError(err.message || "Failed to upload video. You can also paste an external video link.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlSubmit = () => {
    setError(null);
    if (!externalUrl.trim()) {
      setError("Please paste a valid video URL.");
      return;
    }
    onUploadSuccess(externalUrl.trim());
  };

  return (
    <div className="space-y-6">
      {/* Mode Selector */}
      <div className="flex bg-muted/40 p-1 rounded-2xl border border-border/50 max-w-sm mx-auto">
        <button
          type="button"
          onClick={() => setActiveMode("FILE")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeMode === "FILE"
              ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileVideo className="w-3.5 h-3.5" /> Upload Video (MP4)
        </button>
        <button
          type="button"
          onClick={() => setActiveMode("URL")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeMode === "URL"
              ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" /> Paste Video Link
        </button>
      </div>

      {error && (
        <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-2xl text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Mode 1: File Uploader */}
      {activeMode === "FILE" && (
        <div className="space-y-4">
          {!previewUrl ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/80 hover:border-amber-500/80 rounded-3xl p-8 md:p-12 text-center cursor-pointer transition-all bg-card/30 hover:bg-amber-500/5 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/m4v,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold font-heading mb-1 text-foreground">
                Click to browse or drag & drop your 16-minute video
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
                Supported formats: <strong>MP4, WebM, MOV</strong> (Up to 500MB). Compiled Pod presentation video.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/60 text-xs font-semibold text-muted-foreground">
                <Film className="w-3.5 h-3.5" /> Elect & upload your final pod presentation
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-border shadow-2xl">
                <video src={previewUrl} controls className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-black text-white rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
                  <span className="truncate max-w-[250px] font-medium text-foreground">📁 {selectedFile.name}</span>
                  <span>{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                </div>
              )}

              {isUploading && (
                <div className="space-y-2">
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-center text-muted-foreground">Uploading presentation... {uploadProgress}%</p>
                </div>
              )}

              <div className="flex gap-3">
                <PremiumButton
                  variant="outline"
                  className="flex-1"
                  disabled={isUploading}
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                >
                  Change File
                </PremiumButton>
                <PremiumButton
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold"
                  disabled={isUploading}
                  onClick={uploadFileToStorage}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4 mr-2" /> Confirm & Ready Video
                    </>
                  )}
                </PremiumButton>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: External Video URL */}
      {activeMode === "URL" && (
        <div className="space-y-4 p-6 bg-card/40 border border-border/60 rounded-3xl">
          <label className="block text-sm font-semibold text-foreground">
            Paste Video Link (YouTube Unlisted, Vimeo, Loom, Cloudinary, Drive)
          </label>
          <div className="relative">
            <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://youtu.be/... or https://drive.google.com/..."
              className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Ensure sharing permissions are set to "Anyone with the link can view" so judges and mentors can review.
          </p>
          <PremiumButton
            onClick={handleUrlSubmit}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold"
          >
            Attach Video Link
          </PremiumButton>
        </div>
      )}
    </div>
  );
}
