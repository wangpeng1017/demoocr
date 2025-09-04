import { FFmpeg } from "@ffmpeg/ffmpeg";

export type ExtractFramesOptions = {
  fps?: number;
  maxFrames?: number;
};

// Extract frames from video bytes using ffmpeg.wasm (new API)
export async function extractFramesFromVideo(
  videoBytes: Uint8Array,
  { fps = 1, maxFrames = 10 }: ExtractFramesOptions = {}
): Promise<Uint8Array[]> {
  const ffmpeg = new FFmpeg();
  await ffmpeg.load();

  await ffmpeg.writeFile("input.mp4", videoBytes);

  // Extract frames at given fps
  await ffmpeg.exec(["-i", "input.mp4", "-vf", `fps=${fps}`, "-q:v", "2", "frame_%03d.jpg"]);

  // Read frames, up to maxFrames
  const frames: Uint8Array[] = [];
  for (let i = 1; i <= maxFrames; i++) {
    const name = `frame_${String(i).padStart(3, "0")}.jpg`;
    try {
      const data = (await ffmpeg.readFile(name)) as Uint8Array;
      frames.push(data);
    } catch {
      break;
    }
  }

  // Cleanup (best-effort)
  try { await ffmpeg.deleteFile("input.mp4"); } catch {}
  for (let i = 1; i <= maxFrames; i++) {
    try { await ffmpeg.deleteFile(`frame_${String(i).padStart(3, "0")}.jpg`); } catch {}
  }

  return frames;
}

