"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UploadArea({ onResult }: { onResult: (data: any) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/process", { method: "POST", body: form });
      const data = await res.json();
      onResult(data);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>上传图片或视频</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          type="file"
          accept="image/*,video/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex items-center gap-3">
          <Button onClick={handleUpload} disabled={!file || loading}>
            {loading ? "处理中..." : "开始处理"}
          </Button>
          {file && <span className="text-sm text-muted-foreground">{file.name}</span>}
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </CardContent>
    </Card>
  );
}

