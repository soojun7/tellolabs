"use client";

import { Image, Film, Globe, Laugh, TrendingUp, Search } from "lucide-react";

interface CategoryChipsProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

const categories = [
  { id: "all", label: "전체", icon: Search },
  { id: "meme", label: "밈", icon: Laugh },
  { id: "stock", label: "스톡영상", icon: Film },
  { id: "stock-image", label: "스톡이미지", icon: Image },
  { id: "google", label: "구글검색", icon: Globe },
  { id: "trending", label: "트렌딩", icon: TrendingUp },
];

export default function CategoryChips({
  activeCategory,
  onCategoryChange,
}: CategoryChipsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {categories.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onCategoryChange(id)}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border
            ${activeCategory === id
              ? "bg-foreground text-white border-foreground shadow-sm"
              : "bg-surface text-foreground border-border hover:border-foreground/20 hover:shadow-sm"
            }
          `}
        >
          <Icon size={16} strokeWidth={1.8} />
          {label}
        </button>
      ))}
    </div>
  );
}
