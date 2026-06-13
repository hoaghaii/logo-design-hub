"use client";

import { useActionState, useState } from "react";
import { createJob, type FormResult } from "@/app/jobs/actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { VND_PER_ETH } from "@/lib/utils";

export function CreateJobForm() {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    createJob,
    null
  );
  const [budgetEth, setBudgetEth] = useState("");
  const budgetVnd = Number(budgetEth) * VND_PER_ETH;

  return (
    <Card>
      <CardContent>
        <form action={action} className="space-y-4">
          <div>
            <Label htmlFor="title">Tiêu đề</Label>
            <Input id="title" name="title" required placeholder="VD: Thiết kế logo cho quán cà phê" />
          </div>
          <div>
            <Label htmlFor="description">Mô tả chi tiết</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Phong cách, màu sắc, yêu cầu cụ thể..."
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="budgetEth">Ngân sách (ETH)</Label>
              <Input
                id="budgetEth"
                type="number"
                min={0}
                step="any"
                required
                placeholder="2"
                value={budgetEth}
                onChange={(e) => setBudgetEth(e.target.value)}
              />
              <input type="hidden" name="budget" value={budgetVnd} />
            </div>
            <div>
              <Label htmlFor="deadline">Deadline gợi ý</Label>
              <Input id="deadline" name="deadline" type="datetime-local" />
            </div>
          </div>

          {state?.error && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? "Đang đăng..." : "Đăng job"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
