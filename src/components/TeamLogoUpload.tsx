import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Props {
  teamId: string | null; // null while creating a new team (logo uploaded after team exists)
  logoUrl: string | null;
  onUploaded: (url: string) => void;
  size?: "md" | "lg";
}

/**
 * Circular team logo upload widget.
 * - Create mode (teamId === null): caller must create the team row first,
 *   then call onUploaded with the returned URL once teamId is available.
 *   In practice we upload to a temp path keyed by a client-generated id
 *   and the parent re-associates it after team creation if needed —
 *   but simplest flow: only render with a real teamId (post-create or edit).
 */
export function TeamLogoUpload({ teamId, logoUrl, onUploaded, size = "lg" }: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(logoUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  const dim = size === "lg" ? "h-24 w-24" : "h-16 w-16";

  const pick = () => inputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (!teamId) {
      toast.error("Save the team first, then upload a logo");
      return;
    }

    // Local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);

    const ext = file.name.split(".").pop() || "png";
    const path = `${teamId}/logo.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("team-logos")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) {
      setUploading(false);
      toast.error(upErr.message);
      return;
    }

    const { data: pub } = supabase.storage.from("team-logos").getPublicUrl(path);
    // Cache-bust so the new logo shows immediately
    const finalUrl = `${pub.publicUrl}?t=${Date.now()}`;

    const { error: dbErr } = await supabase
      .from("teams")
      .update({ logo_url: finalUrl })
      .eq("id", teamId);

    setUploading(false);
    if (dbErr) {
      toast.error(dbErr.message);
      return;
    }
    setPreview(finalUrl);
    onUploaded(finalUrl);
    toast.success("Logo updated");
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative ${dim} shrink-0`}>
        <div className={`${dim} overflow-hidden rounded-full border-2 border-border bg-secondary grid place-items-center`}>
          {preview ? (
            <img src={preview} alt="Team logo" className="h-full w-full object-cover" />
          ) : (
            <CricketBallIcon />
          )}
          {uploading && (
            <div className="absolute inset-0 grid place-items-center rounded-full bg-black/50">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={pick}
          disabled={uploading}
          className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:brightness-110 active:scale-95 disabled:opacity-50"
          aria-label={preview ? "Change logo" : "Upload logo"}
        >
          {preview ? <Pencil className="h-3.5 w-3.5" /> : <Camera className="h-4 w-4" />}
        </button>
      </div>
      <span className="text-xs text-muted-foreground">
        {teamId ? "Tap to upload team logo" : "Available after team is created"}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

function CricketBallIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" className="fill-muted-foreground/20" />
      <path d="M5 9c4 1 10 1 14 0M5 15c4-1 10-1 14 0" className="stroke-muted-foreground/40" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}