import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { uploadFileToR2, isR2Configured } from "@/lib/r2";

const execFileAsync = promisify(execFile);
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY ?? "";

const MOTION_SFX_MAP: Record<string, string> = {
  quote: "soft cinematic reveal whoosh with subtle reverb, clean UI sound, low volume",
  bottomCaption: "soft swoosh transition with light impact, clean UI sound, low volume",
  comparison: "quick double swoosh, left then right, comparison reveal, clean UI sound, low volume",
  bigStat: "fast ticking numbers counter sound with a soft boom finish, clean UI sound, low volume",
  list: "gentle pop notification chime, sequential item appear, clean UI sound, low volume",
  lineChart: "rising digital data beeps followed by a soft chime, clean UI sound, low volume",
  cardGrid: "series of soft card sliding sounds, clean UI sound, low volume",
  profileCard: "smooth elegant whoosh with a subtle digital click, clean UI sound, low volume",
  orchestra: "gentle network connection pings and soft digital hum, clean UI sound, low volume",
  timeline: "rhythmic ticking clock sound turning into a soft ding, clean UI sound, low volume",
  checklist: "sequence of soft satisfying checkmark dings, clean UI sound, low volume",
  comparisonDark: "deep low-frequency bass sweep, left to right comparison, clean UI sound, low volume",
  bigStatDark: "rapid digital number counting up sound, futuristic subtle beep, clean UI sound, low volume",
  circularProgress: "smooth circular charging futuristic sound, digital hum, clean UI sound, low volume",
  barChart: "fast ascending digital scale blips, futuristic graph reveal, clean UI sound, low volume",
  vsCompare: "dramatic bass hit, heavy swoosh, subtle impact, clean UI sound, low volume",
  twitterPost: "Twitter/X app notification chirp sound, iOS tweet received ding with subtle vibration buzz, clean digital pop, low volume",
  beforeAfter: "crisp double whoosh sound, revealing something new, clean UI sound, low volume",
  progressBars: "multiple soft ascending bar chart chimes, clean UI sound, low volume",
  testimonial: "gentle ambient pad swell, soft inspiring ding, clean UI sound, low volume",
  browserMockup: "subtle web browser click and fast page loading swoosh, clean UI sound, low volume",
  terminal: "fast mechanical computer typing sounds, retro hacker beep, clean UI sound, low volume",
  alertModal: "urgent but soft UI error notification chime, clean UI sound, low volume",
  iMessage: "Apple iMessage text message received sound, iOS chat bubble pop with sent whoosh, clean recognizable phone notification, low volume",
  stickyNotes: "paper rustling sound, quick post-it sticking plop, clean UI sound, low volume",
  newsCard: "newspaper printing press rumble, dramatic news broadcast breaking bulletin sting with deep timpani hit, low volume",
  featureCards: "three consecutive satisfying pop sounds, clean UI sound, low volume",
  gauge: "mechanical dial spinning up sound, soft digital revving, clean UI sound, low volume",
  tableCompare: "clean digital grid scanning sound, multiple soft blips, clean UI sound, low volume",
  milestone: "rewarding sequence of checkmark dings, progression sound, clean UI sound, low volume",
  mapPin: "crisp map pin drop sound, subtle location marker pop, clean UI sound, low volume",
  routeMap: "drawing a line on paper sound, soft path animation swoosh, clean UI sound, low volume",
  locationList: "fast scrolling list sound, sequential marker pops, clean UI sound, low volume",
  zoomMap: "dramatic satellite zoom in sound, cinematic world map whoosh, low rumble, clean low volume",
  panMap: "smooth camera glide swoosh, soft wind movement sound, cinematic pan, clean low volume",
  flightPath: "airplane takeoff engine hum with gentle whoosh, distant jet fly-by, clean low volume",
  pulseMap: "deep radar ping pulse expanding outward, sonar detection beep, clean low volume",
  pixelCharacter: "8-bit retro video game jump sound, classic arcade character appear, clean low volume",
  avatarSpeech: "soft voice bubble pop, cute digital speaking sound, clean UI sound, low volume",
  emojiScene: "multiple funny cartoon pop sounds, bouncy emoji reveal, clean low volume",
};

async function getActualDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ], { timeout: 5000 });
    const dur = parseFloat(stdout.trim());
    return isNaN(dur) ? 2 : Math.round(dur * 10) / 10;
  } catch {
    return 2;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { motionStyle, prompt, durationSeconds } = await req.json();

    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: "ELEVENLABS_API_KEY not set" }, { status: 500 });
    }

    const sfxPrompt = prompt || MOTION_SFX_MAP[motionStyle] || "cinematic whoosh transition sound effect";
    const duration = Math.min(Math.max(durationSeconds || 2, 0.5), 10);

    const MAX_RETRIES = 3;
    let lastRes: Response | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      lastRes = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: sfxPrompt,
          duration_seconds: duration,
          prompt_influence: 0.5,
        }),
      });

      if (lastRes.ok) break;
      if (lastRes.status === 429 && attempt < MAX_RETRIES) {
        const delay = 1000 * (attempt + 1);
        console.warn(`ElevenLabs SFX 429 — retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      break;
    }

    const res = lastRes!;
    if (!res.ok) {
      const errText = await res.text();
      console.error("ElevenLabs SFX error:", res.status, errText);
      return NextResponse.json({ error: `SFX API error: ${res.status}` }, { status: 502 });
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer());

    const tmpDir = path.join(os.tmpdir(), "tello-audio");
    await mkdir(tmpDir, { recursive: true });

    const filename = `sfx-${randomUUID()}.mp3`;
    const filePath = path.join(tmpDir, filename);
    await writeFile(filePath, audioBuffer);

    const actualDuration = await getActualDuration(filePath);

    let sfxUrl: string;
    if (isR2Configured()) {
      sfxUrl = await uploadFileToR2(`audio/${filename}`, filePath);
      try { await unlink(filePath); } catch { /* ignore */ }
    } else {
      const localDir = path.join(process.cwd(), "public", "audio");
      await mkdir(localDir, { recursive: true });
      await writeFile(path.join(localDir, filename), audioBuffer);
      try { await unlink(filePath); } catch { /* ignore */ }
      sfxUrl = `/audio/${filename}`;
    }

    return NextResponse.json({ sfxUrl, duration: actualDuration, prompt: sfxPrompt });
  } catch (err: unknown) {
    console.error("SFX generation error:", err);
    return NextResponse.json(
      { error: (err as Error).message ?? "SFX generation failed" },
      { status: 500 },
    );
  }
}
