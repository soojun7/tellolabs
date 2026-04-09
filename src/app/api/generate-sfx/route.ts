import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { uploadToR2, isR2Configured } from "@/lib/r2";
import { requireAuth, useCredits } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

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

function estimateMp3Duration(buf: Buffer): number {
  const bitrate = 128_000;
  const sizeInBits = buf.length * 8;
  const est = Math.round((sizeInBits / bitrate) * 10) / 10;
  return est > 0 ? est : 2;
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const creditResult = await useCredits(authResult.userId, "generate-sfx");
  if (creditResult instanceof NextResponse) return creditResult;

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
    const filename = `sfx-${randomUUID()}.mp3`;
    const actualDuration = estimateMp3Duration(audioBuffer);

    let sfxUrl: string;
    if (isR2Configured()) {
      sfxUrl = await uploadToR2(`audio/${filename}`, audioBuffer);
    } else {
      const { writeFile, mkdir } = await import("fs/promises");
      const { join } = await import("path");
      const localDir = join(process.cwd(), "public", "audio");
      await mkdir(localDir, { recursive: true });
      await writeFile(join(localDir, filename), audioBuffer);
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
