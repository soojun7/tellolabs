"use client";

import { useState } from "react";
import { ArrowUp } from "lucide-react";

interface ScriptInputProps {
  onSubmit: (script: string) => void;
  isLoading: boolean;
}

export default function ScriptInput({ onSubmit, isLoading }: ScriptInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (text.trim() && !isLoading) {
      onSubmit(text.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-3xl lg:max-w-4xl xl:max-w-5xl">
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden transition-shadow focus-within:shadow-md focus-within:border-border/80">
        <div className="px-5 pt-4 pb-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="대본을 입력하면 자동으로 밈, 스톡, 이미지 소스를 찾아드립니다..."
            rows={6}
            className="w-full resize-none text-[15px] leading-relaxed text-foreground placeholder:text-text-secondary/60 bg-transparent focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end px-5 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-secondary/50 hidden sm:block">
              ⌘+Enter
            </span>
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || isLoading}
              className={`
                flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200
                ${text.trim() && !isLoading
                  ? "bg-accent text-white hover:bg-accent/90 shadow-sm"
                  : "bg-border/50 text-text-secondary cursor-not-allowed"
                }
              `}
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
