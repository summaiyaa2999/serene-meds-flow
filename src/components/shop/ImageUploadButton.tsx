import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadProductImage } from "@/lib/upload";

/** Lets an admin pick a photo from their device instead of pasting an image URL. */
export function ImageUploadButton({ onUploaded, label = "Upload photo" }: { onUploaded: (url: string) => void; label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handle(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadProductImage(file);
      onUploaded(url);
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handle(e.target.files?.[0])}
      />
      <Button type="button" variant="outline" size="sm" className="rounded-full" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="mr-1.5 h-3.5 w-3.5" />}
        {busy ? "Uploading…" : label}
      </Button>
    </>
  );
}
