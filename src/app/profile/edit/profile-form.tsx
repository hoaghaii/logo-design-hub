"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateProfile, type FormResult } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";

export function ProfileForm({
  fullName,
  bio,
}: {
  fullName: string;
  bio: string;
}) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    updateProfile,
    null
  );

  useEffect(() => {
    if (state && "ok" in state) toast.success("Đã lưu hồ sơ!");
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="full_name">Họ và tên</Label>
        <Input id="full_name" name="full_name" defaultValue={fullName} required />
      </div>
      <div>
        <Label htmlFor="bio">Giới thiệu</Label>
        <Textarea
          id="bio"
          name="bio"
          defaultValue={bio}
          placeholder="Kinh nghiệm, phong cách thiết kế của bạn..."
        />
      </div>
      {state && "error" in state && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Đang lưu..." : "Lưu hồ sơ"}
      </Button>
    </form>
  );
}
