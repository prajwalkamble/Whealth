"use client";

import { useRef, useEffect } from "react";
import { Camera, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";
import { scanReceipt } from "@/actions/transaction";

// Vercel rejects request bodies over 4.5 MB before they reach the server
// action, and phone photos are often bigger than that. A receipt stays
// legible far below it, so large images are scaled down and re-encoded as
// JPEG in the browser before upload.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const SHRINK_ABOVE_BYTES = 1.5 * 1024 * 1024;
const MAX_DIMENSION = 2000;

async function shrinkImage(file) {
  if (file.size <= SHRINK_ABOVE_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(bitmap.width, bitmap.height)
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85)
    );
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    // A format this browser cannot decode (e.g. HEIC): send it as it is and
    // let the size check below decide.
    return file;
  }
}

export function ReceiptScanner({ onScanComplete }) {
  const fileInputRef = useRef(null);

  const {
    loading: scanReceiptLoading,
    fn: scanReceiptFn,
    data: scannedData,
  } = useFetch(scanReceipt);

  const handleReceiptScan = async (file) => {
    if (!file.type?.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }

    const upload = await shrinkImage(file);
    if (upload.size > MAX_UPLOAD_BYTES) {
      toast.error("That image is too large. Please use one under 4MB.");
      return;
    }

    await scanReceiptFn(upload);
  };

  // onScanComplete is deliberately not a dependency. The parent passes a new
  // function identity on every render, so including it re-ran this effect on
  // each re-render and re-applied the scan over whatever the user had since
  // typed into the form.
  const onScanCompleteRef = useRef(onScanComplete);
  useEffect(() => {
    onScanCompleteRef.current = onScanComplete;
  }, [onScanComplete]);

  useEffect(() => {
    if (scannedData?.success && !scanReceiptLoading) {
      onScanCompleteRef.current(scannedData.data);
    }
  }, [scanReceiptLoading, scannedData]);

  return (
    <div className="flex items-center gap-4">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Clearing the input lets the same file be picked again; otherwise
          // the value is unchanged and onChange never fires a second time.
          e.target.value = "";
          if (file) handleReceiptScan(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full h-10 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 animate-gradient hover:opacity-90 transition-opacity text-white hover:text-white"
        onClick={() => fileInputRef.current?.click()}
        disabled={scanReceiptLoading}
      >
        {scanReceiptLoading ? (
          <>
            <Loader className="mr-2 animate-spin" />
            <span>Scanning Receipt...</span>
          </>
        ) : (
          <>
            <Camera className="mr-2" />
            <span>Scan Receipt with AI</span>
          </>
        )}
      </Button>
    </div>
  );
}
