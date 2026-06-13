import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { CreateJobForm } from "./create-job-form";

export default async function CreateJobPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?redirect=/jobs/create");
  if (user.role !== "client") redirect("/jobs");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href="/jobs/manage"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-emerald-600"
      >
        <ArrowLeft size={15} /> Job của tôi
      </Link>
      <div className="mt-5">
        <PageHeader
          eyebrow="Đăng tuyển"
          title="Đăng job mới"
          subtitle="Mô tả công việc thiết kế bạn cần — designer sẽ apply kèm portfolio."
        />
      </div>
      <div className="mt-6">
        <CreateJobForm />
      </div>
    </div>
  );
}
