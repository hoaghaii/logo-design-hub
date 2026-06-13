"use client";

import { useActionState, useState } from "react";
import { Briefcase, Paintbrush } from "lucide-react";
import { signUp, type AuthState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signUp,
    null
  );
  const [role, setRole] = useState<UserRole>("client");

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label>Bạn là?</Label>
        <input type="hidden" name="role" value={role} />
        <div className="grid grid-cols-2 gap-3">
          <RoleOption
            active={role === "client"}
            onClick={() => setRole("client")}
            icon={<Briefcase size={20} />}
            title="Client"
            subtitle="Tôi cần thuê thiết kế"
          />
          <RoleOption
            active={role === "designer"}
            onClick={() => setRole("designer")}
            icon={<Paintbrush size={20} />}
            title="Designer"
            subtitle="Tôi nhận việc thiết kế"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="full_name">Họ và tên</Label>
        <Input id="full_name" name="full_name" required autoComplete="name" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <Label htmlFor="password">Mật khẩu</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Đang tạo tài khoản..." : "Đăng ký"}
      </Button>
    </form>
  );
}

function RoleOption({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1.5 rounded-xl border-2 p-3 text-left transition-all",
        active
          ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100"
          : "border-slate-200 hover:border-slate-300"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
          active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
        )}
      >
        {icon}
      </span>
      <span className="text-sm font-semibold text-slate-900">{title}</span>
      <span className="text-xs text-slate-500">{subtitle}</span>
    </button>
  );
}
