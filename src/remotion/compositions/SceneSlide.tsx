import React from "react";
import { Audio } from "remotion";
import type { SceneData, InfographicData } from "../types";
import { ImageScene } from "./ImageScene";
import { QuoteStyle } from "../styles/QuoteStyle";
import { BottomCaptionStyle } from "../styles/BottomCaptionStyle";
import { ComparisonStyle } from "../styles/ComparisonStyle";
import { BigStatStyle } from "../styles/BigStatStyle";
import { ListStyle } from "../styles/ListStyle";
import { LineChartStyle } from "../styles/LineChartStyle";
import { CardGridStyle } from "../styles/CardGridStyle";
import { ProfileCardStyle } from "../styles/ProfileCardStyle";
import { OrchestraStyle } from "../styles/OrchestraStyle";
import { TimelineStyle } from "../styles/TimelineStyle";
import { ChecklistStyle } from "../styles/ChecklistStyle";
import { ComparisonDarkStyle } from "../styles/ComparisonDarkStyle";
import { BigStatDarkStyle } from "../styles/BigStatDarkStyle";
import { CircularProgress, BarChart, VsCompare, TwitterPost } from "../styles/ExtraLayouts";
import { BeforeAfter, ProgressBarsList, Testimonial, BrowserMockup, TerminalLayout, AlertModal, IMessage, StickyNotes, NewsCard, FeatureCards, GaugeChart, TableCompare, Milestone } from "../styles/MoreLayouts";
import { MapPin, RouteMap, LocationList, ZoomMap, PanMap, FlightPath, PulseMap } from "../styles/MapLayouts";
import { PixelCharacter, Mascot, EmojiScene, AvatarSpeech } from "../styles/CharacterLayouts";

function getDefaultData(style: string, line: string): InfographicData {
  const label = line.slice(0, 30) || "미리보기";
  const defaults: Record<string, InfographicData> = {
    comparison: { layout: "comparison", title: label, leftCard: { label: "A", color: "#e53935", items: ["항목 1"], summary: "" }, rightCard: { label: "B", color: "#1e88e5", items: ["항목 1"], summary: "" } } as any,
    bigStat: { layout: "bigStat", category: "통계", number: "0", unit: "", description: label } as any,
    list: { layout: "list", title: label, items: [{ label: "항목", value: "값" }] } as any,
    lineChart: { layout: "lineChart", title: label, yMax: 100, points: [{ x: "A", y: 30 }, { x: "B", y: 60 }, { x: "C", y: 45 }], lineColor: "#e53935" } as any,
    cardGrid: { layout: "cardGrid", title: label, cards: [{ number: 1, title: "카드", description: "설명" }] } as any,
    profileCard: { layout: "profileCard", name: "인물", role: "역할", quote: label, stats: [] } as any,
    orchestra: { layout: "orchestra", centerLabel: label, nodes: [{ label: "항목 1" }, { label: "항목 2" }] } as any,
    timeline: { layout: "timeline", steps: [{ number: 1, title: "단계 1", description: label, highlight: true }] } as any,
    checklist: { layout: "checklist", title: label, items: [{ text: "항목 1", checked: true }, { text: "항목 2", checked: false }] } as any,
    comparisonDark: { layout: "comparisonDark", title: label, left: { title: "A", items: ["항목"], summary: "" }, right: { title: "B", items: ["항목"], summary: "", highlight: true } } as any,
    bigStatDark: { layout: "bigStatDark", category: "통계", number: "0", unit: "", description: label, progressValue: 50 } as any,
    circularProgress: { layout: "circularProgress", title: label, percentage: 75, label: "진행률", subtitle: "" } as any,
    barChart: { layout: "barChart", title: label, bars: [{ label: "A", value: 50 }, { label: "B", value: 80, highlight: true }] } as any,
    vsCompare: { layout: "vsCompare", title: label, left: { icon: "🔴", title: "A", subtitle: "" }, right: { icon: "🔵", title: "B", subtitle: "", highlight: true } } as any,
    twitterPost: { layout: "twitterPost", username: "사용자", handle: "@user", content: label, time: "오후 3:00", date: "2026년 4월 6일" } as any,
    beforeAfter: { layout: "beforeAfter", title: label, before: { title: "이전", items: ["항목"], icon: "❌" }, after: { title: "이후", items: ["항목"], icon: "✅" } } as any,
    progressBars: { layout: "progressBars", title: label, items: [{ label: "항목", value: 70 }] } as any,
    testimonial: { layout: "testimonial", quote: label, author: { name: "인물", role: "역할" } } as any,
    browserMockup: { layout: "browserMockup", url: "www.example.com", title: label, subtitle: "" } as any,
    terminal: { layout: "terminal", title: "Terminal", lines: [{ text: "$ echo hello", type: "input" }, { text: label, type: "output" }] } as any,
    alertModal: { layout: "alertModal", title: "알림", message: label, type: "error" } as any,
    iMessage: { layout: "iMessage", contact: "상대방", messages: [{ text: label, sender: "them" }, { text: "확인", sender: "me" }] } as any,
    stickyNotes: { layout: "stickyNotes", title: label, notes: [{ text: "메모 내용", color: "#fef08a" }] } as any,
    newsCard: { layout: "newsCard", headline: label, summary: "뉴스 요약", source: "출처", date: "2026" } as any,
    featureCards: { layout: "featureCards", title: label, cards: [{ icon: "🚀", title: "기능", description: "설명" }] } as any,
    gauge: { layout: "gauge", title: label, value: 65, maxValue: 100, label: "수치" } as any,
    tableCompare: { layout: "tableCompare", title: label, headers: ["A", "B"], rows: [{ label: "항목", values: ["O", "X"] }] } as any,
    milestone: { layout: "milestone", title: label, current: 0, milestones: [{ label: "1단계" }, { label: "2단계" }] } as any,
    mapPin: { layout: "mapPin", location: label, coordinates: { lat: 37.57, lng: 126.98 } } as any,
    routeMap: { layout: "routeMap", from: "출발지", to: "도착지", routeCoordinates: [{ lat: 37.57, lng: 126.98 }, { lat: 35.18, lng: 129.08 }] } as any,
    locationList: { layout: "locationList", title: label, locations: [{ name: "장소", distance: "1km", rating: 4.5, type: "관광" }] } as any,
    zoomMap: { layout: "zoomMap", country: label, flag: "🌍", coordinates: { lat: 37.57, lng: 126.98 } } as any,
    panMap: { layout: "panMap", from: "출발지", to: "도착지", fromCoordinates: { lat: 37.57, lng: 126.98 }, toCoordinates: { lat: 35.18, lng: 129.08 } } as any,
    flightPath: { layout: "flightPath", from: "출발", to: "도착", fromCoordinates: { lat: 37.46, lng: 126.44 }, toCoordinates: { lat: 35.68, lng: 139.65 }, distance: "1,000km", duration: "2시간" } as any,
    pulseMap: { layout: "pulseMap", location: label, coordinates: { lat: 37.57, lng: 126.98 } } as any,
    pixelCharacter: { layout: "pixelCharacter", character: "robot", expression: "happy", color: "#00d47e", label: "", speech: label } as any,
    avatarSpeech: { layout: "avatarSpeech", avatar: "👨‍💼", name: "화자", speech: label, position: "left" } as any,
    emojiScene: { layout: "emojiScene", title: label, emojis: [{ emoji: "😀", size: "lg", position: { x: 30, y: 30 } }, { emoji: "🎉", size: "md", position: { x: 65, y: 50 } }] } as any,
    characterCompare: { layout: "characterCompare", title: label, before: { label: "A", description: "" }, after: { label: "B", description: "" } } as any,
  };
  return defaults[style] || defaults.bigStat;
}

function safeData(style: string, data: InfographicData | undefined, line: string): any {
  if (!data || (data as any).layout !== style) {
    return getDefaultData(style, line);
  }
  return data;
}

interface SceneSlideProps {
  scene: SceneData;
  index: number;
}

export const SceneSlide: React.FC<SceneSlideProps> = ({ scene, index }) => {
  if (scene.sceneType === "image") {
    return <ImageScene scene={scene} index={index} />;
  }

  const d = (style: string) => safeData(style, scene.infographicData, scene.line);

  const motionContent = (() => {
    switch (scene.motionStyle) {
      case "quote":
        return <QuoteStyle scene={scene} />;
      case "bottomCaption":
        return <BottomCaptionStyle scene={scene} />;
      case "comparison":
        return <ComparisonStyle scene={{ ...scene, infographicData: d("comparison") }} />;
      case "bigStat":
        return <BigStatStyle scene={{ ...scene, infographicData: d("bigStat") }} />;
      case "list":
        return <ListStyle scene={{ ...scene, infographicData: d("list") }} />;
      case "lineChart":
        return <LineChartStyle scene={{ ...scene, infographicData: d("lineChart") }} />;
      case "cardGrid":
        return <CardGridStyle scene={{ ...scene, infographicData: d("cardGrid") }} />;
      case "profileCard":
        return <ProfileCardStyle scene={{ ...scene, infographicData: d("profileCard") }} />;
      case "orchestra":
        return <OrchestraStyle scene={{ ...scene, infographicData: d("orchestra") }} />;
      case "timeline":
        return <TimelineStyle scene={{ ...scene, infographicData: d("timeline") }} />;
      case "checklist":
        return <ChecklistStyle scene={{ ...scene, infographicData: d("checklist") }} />;
      case "comparisonDark":
        return <ComparisonDarkStyle scene={{ ...scene, infographicData: d("comparisonDark") }} />;
      case "bigStatDark":
        return <BigStatDarkStyle scene={{ ...scene, infographicData: d("bigStatDark") }} />;
      case "circularProgress":
        return <CircularProgress scene={{ ...scene, infographicData: d("circularProgress") }} />;
      case "barChart":
        return <BarChart scene={{ ...scene, infographicData: d("barChart") }} />;
      case "vsCompare":
        return <VsCompare scene={{ ...scene, infographicData: d("vsCompare") }} />;
      case "twitterPost":
        return <TwitterPost scene={{ ...scene, infographicData: d("twitterPost") }} />;
      case "beforeAfter":
        return <BeforeAfter scene={{ ...scene, infographicData: d("beforeAfter") }} />;
      case "progressBars":
        return <ProgressBarsList scene={{ ...scene, infographicData: d("progressBars") }} />;
      case "testimonial":
        return <Testimonial scene={{ ...scene, infographicData: d("testimonial") }} />;
      case "browserMockup":
        return <BrowserMockup scene={{ ...scene, infographicData: d("browserMockup") }} />;
      case "terminal":
        return <TerminalLayout scene={{ ...scene, infographicData: d("terminal") }} />;
      case "alertModal":
        return <AlertModal scene={{ ...scene, infographicData: d("alertModal") }} />;
      case "iMessage":
        return <IMessage scene={{ ...scene, infographicData: d("iMessage") }} />;
      case "stickyNotes":
        return <StickyNotes scene={{ ...scene, infographicData: d("stickyNotes") }} />;
      case "newsCard":
        return <NewsCard scene={{ ...scene, infographicData: d("newsCard") }} />;
      case "featureCards":
        return <FeatureCards scene={{ ...scene, infographicData: d("featureCards") }} />;
      case "gauge":
        return <GaugeChart scene={{ ...scene, infographicData: d("gauge") }} />;
      case "tableCompare":
        return <TableCompare scene={{ ...scene, infographicData: d("tableCompare") }} />;
      case "milestone":
        return <Milestone scene={{ ...scene, infographicData: d("milestone") }} />;
      case "mapPin":
        return <MapPin data={d("mapPin")} />;
      case "routeMap":
        return <RouteMap data={d("routeMap")} />;
      case "locationList":
        return <LocationList data={d("locationList")} />;
      case "zoomMap":
        return <ZoomMap data={d("zoomMap")} />;
      case "panMap":
        return <PanMap data={d("panMap")} />;
      case "flightPath":
        return <FlightPath data={d("flightPath")} />;
      case "pulseMap":
        return <PulseMap data={d("pulseMap")} />;
      case "pixelCharacter":
        return <PixelCharacter data={d("pixelCharacter")} />;
      case "avatarSpeech":
        return <AvatarSpeech data={d("avatarSpeech")} />;
      case "emojiScene":
        return <EmojiScene data={d("emojiScene")} />;
      default:
        return <QuoteStyle scene={scene} />;
    }
  })();

  return (
    <>
      {motionContent}
      {scene.audioUrl && (
        <Audio src={scene.audioUrl} />
      )}
      {scene.sfxUrl && (
        <Audio src={scene.sfxUrl} volume={scene.sfxVolume ?? 0.15} />
      )}
    </>
  );
};
