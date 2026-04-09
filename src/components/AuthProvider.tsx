"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { koKR } from "@clerk/localizations";
import { useEffect } from "react";
import { setTokenGetter } from "@/lib/apiFetch";

const customKo = {
  ...koKR,
  formFieldInputPlaceholder__username: "아이디를 입력하세요",
  formFieldInputPlaceholder__emailAddress: "이메일 주소를 입력하세요",
  formFieldInputPlaceholder__emailAddress_username: "이메일 또는 아이디를 입력하세요",
  formFieldInputPlaceholder__password: "비밀번호를 입력하세요",
  formFieldInputPlaceholder__newPassword: "새 비밀번호를 입력하세요",
  formFieldInputPlaceholder__confirmPassword: "비밀번호를 다시 입력하세요",
  formFieldInputPlaceholder__currentPassword: "현재 비밀번호를 입력하세요",
  formFieldInputPlaceholder__signUpPassword: "비밀번호를 만드세요",
  formFieldInputPlaceholder__phoneNumber: "휴대폰 번호를 입력하세요",
  formFieldInputPlaceholder__firstName: "이름",
  formFieldInputPlaceholder__lastName: "성",
  signUp: {
    ...koKR.signUp,
    start: {
      ...koKR.signUp?.start,
      title: "회원가입",
      subtitle: "환영해요! 아래 정보를 입력해 주세요.",
      actionText: "계정이 있으신가요?",
      actionLink: "로그인하기",
    },
  },
  signIn: {
    ...koKR.signIn,
    start: {
      ...koKR.signIn?.start,
      title: "로그인",
      subtitle: "환영해요! 계속하려면 로그인해 주세요.",
      actionText: "계정이 없으신가요?",
      actionLink: "회원가입",
    },
  },
} as typeof koKR;

function TokenBridge({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);
  return <>{children}</>;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      localization={customKo}
      appearance={{
        variables: {
          colorPrimary: "#e85d3a",
          borderRadius: "0.75rem",
        },
      }}
    >
      <TokenBridge>{children}</TokenBridge>
    </ClerkProvider>
  );
}
