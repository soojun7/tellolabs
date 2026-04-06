import { NextResponse } from "next/server";

const VOICEVOX_URL = process.env.VOICEVOX_URL ?? "http://localhost:50021";

interface SpeakerMeta {
  ko: string;
  gender: "여" | "남" | "중성";
}

const SPEAKER_KO: Record<string, SpeakerMeta> = {
  "四国めたん":       { ko: "시코쿠 메탄", gender: "여" },
  "ずんだもん":       { ko: "즌다몬", gender: "남" },
  "春日部つむぎ":     { ko: "카스카베 츠무기", gender: "여" },
  "雨晴はう":         { ko: "아메하레 하우", gender: "여" },
  "波音リツ":         { ko: "나미네 리츠", gender: "중성" },
  "玄野武宏":         { ko: "쿠로노 타케히로", gender: "남" },
  "白上虎太郎":       { ko: "시라카미 코타로", gender: "남" },
  "青山龍星":         { ko: "아오야마 류세이", gender: "남" },
  "冥鳴ひまり":       { ko: "메이메이 히마리", gender: "여" },
  "九州そら":         { ko: "큐슈 소라", gender: "여" },
  "もち子さん":       { ko: "모치코", gender: "여" },
  "剣崎雌雄":         { ko: "켄자키 메스오", gender: "남" },
  "WhiteCUL":         { ko: "화이트CUL", gender: "여" },
  "後鬼":             { ko: "고키", gender: "남" },
  "No.7":             { ko: "No.7", gender: "남" },
  "ちび式じい":       { ko: "치비시키 지이", gender: "남" },
  "櫻歌ミコ":         { ko: "오우카 미코", gender: "여" },
  "小夜/SAYO":        { ko: "사요", gender: "여" },
  "ナースロボ＿タイプＴ": { ko: "간호로봇 Type-T", gender: "여" },
  "†聖騎士 紅桜†":   { ko: "성기사 코우자쿠라", gender: "남" },
  "雀松朱司":         { ko: "스즈마츠 아카시", gender: "남" },
  "麒ヶ島宗麟":       { ko: "키가시마 소린", gender: "남" },
  "春歌ナナ":         { ko: "하루카 나나", gender: "여" },
  "猫使アル":         { ko: "네코츠카이 아루", gender: "여" },
  "猫使ビィ":         { ko: "네코츠카이 비이", gender: "남" },
  "中国うさぎ":       { ko: "츄고쿠 우사기", gender: "여" },
  "栗田まろん":       { ko: "쿠리타 마론", gender: "여" },
  "あいえるたん":     { ko: "아이에루탄", gender: "여" },
  "満別花丸":         { ko: "만베츠 하나마루", gender: "남" },
  "琴詠ニア":         { ko: "코토요미 니아", gender: "여" },
};

const STYLE_KO: Record<string, string> = {
  "ノーマル": "일반",
  "あまあま": "달달",
  "ツンツン": "츤츤",
  "セクシー": "섹시",
  "ささやき": "속삭임",
  "ヒソヒソ": "몰래몰래",
  "怒り":     "화남",
  "悲しみ":   "슬픔",
  "喜び":     "기쁨",
  "やさしい": "상냥",
  "おどろき": "놀람",
  "えーっと": "어...",
  "感情的":   "감정적",
  "りーだー": "리더",
  "こわーい": "무서운",
  "ふとい":   "굵은",
  "ほそい":   "가는",
  "大人っぽい": "성숙",
  "元気":     "활발",
  "かわいい": "귀여운",
  "ロリ":     "로리",
  "ショタ":   "쇼타",
};

export async function GET() {
  try {
    const res = await fetch(`${VOICEVOX_URL}/speakers`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `VOICEVOX speakers API: ${res.status}`, speakers: [] },
        { status: 502 },
      );
    }

    const data = await res.json();

    const speakers = (data as Array<{
      name: string;
      speaker_uuid: string;
      styles: Array<{ name: string; id: number }>;
    }>).flatMap((s) => {
      const meta = SPEAKER_KO[s.name];
      const koName = meta?.ko ?? s.name;
      const gender = meta?.gender ?? "";

      return s.styles.map((style) => {
        const koStyle = STYLE_KO[style.name] ?? style.name;
        const displayName = s.styles.length > 1
          ? `${koName} (${koStyle})`
          : koName;

        return {
          speaker_id: style.id,
          name: displayName,
          original_name: s.styles.length > 1 ? `${s.name} (${style.name})` : s.name,
          gender,
          speaker_name: koName,
          style_name: koStyle,
        };
      });
    });

    return NextResponse.json({ speakers });
  } catch (err: unknown) {
    console.error("VOICEVOX speakers fetch error:", err);
    return NextResponse.json({
      error: "VOICEVOX engine not running. Start VOICEVOX first.",
      speakers: [],
    });
  }
}
