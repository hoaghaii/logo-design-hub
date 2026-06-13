import Link from "next/link";
import {
  Briefcase,
  Paintbrush,
  ShieldCheck,
  Sparkles,
  Wallet,
  Bell,
  ArrowRight,
  Star,
  CheckCircle2,
  FileText,
  Handshake,
  Lock,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const user = await getCurrentUser();
  const primaryHref = user
    ? user.role === "designer"
      ? "/jobs"
      : "/jobs/manage"
    : "/auth/register";
  const primaryLabel = user
    ? user.role === "designer"
      ? "Tìm việc ngay"
      : "Quản lý job"
    : "Bắt đầu miễn phí";

  return (
    <div className="overflow-hidden">
      {/* ───────── Hero ───────── */}
      <section className="relative bg-grid-light">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-emerald-50/80 to-transparent" />
        <div className="mx-auto max-w-5xl px-4 pb-16 pt-20 text-center sm:pt-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-white px-3.5 py-1.5 text-sm font-medium text-emerald-700 shadow-sm">
            <ShieldCheck size={14} /> Thanh toán escrow — tiền an toàn 100%
          </span>

          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            Thuê designer giỏi,{" "}
            <span className="text-gradient-brand">thanh toán an tâm</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            LogoDesignHub kết nối Client với Designer freelance. Đăng job, chọn
            người phù hợp, thương lượng giá realtime — và để escrow mô phỏng giữ
            tiền cho tới khi bạn hài lòng.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={primaryHref}>
              <Button size="lg" className="w-full sm:w-auto">
                {primaryLabel} <ArrowRight size={18} />
              </Button>
            </Link>
            <Link href="/jobs">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Xem việc đang mở
              </Button>
            </Link>
          </div>

          {/* Trust row */}
          <div className="mt-10 flex flex-col items-center gap-3 text-sm text-slate-500 sm:flex-row sm:justify-center sm:gap-6">
            <div className="flex items-center -space-x-2">
              {["A", "B", "C", "D", "E"].map((c, i) => (
                <span
                  key={c}
                  className={`flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-white text-xs font-semibold ${
                    ["bg-emerald-100 text-emerald-700", "bg-teal-100 text-teal-700", "bg-sky-100 text-sky-700", "bg-indigo-100 text-indigo-700", "bg-amber-100 text-amber-700"][i]
                  }`}
                >
                  {c}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex text-amber-400">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={15} fill="currentColor" />
                ))}
              </div>
              <span className="font-medium text-slate-700">4.9/5</span>
              <span>từ 1.200+ giao dịch</span>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Stats band ───────── */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-5xl grid-cols-2 divide-x divide-slate-100 px-4 py-10 sm:grid-cols-4">
          <Stat value="2.400+" label="Designer hoạt động" />
          <Stat value="5.800+" label="Job đã hoàn thành" />
          <Stat value="₫48 tỷ" label="Giao dịch qua escrow" />
          <Stat value="98%" label="Khách hàng hài lòng" />
        </div>
      </section>

      {/* ───────── How it works ───────── */}
      <section className="mx-auto max-w-5xl px-4 py-20">
        <SectionHeading
          eyebrow="Quy trình"
          title="Từ ý tưởng đến sản phẩm trong 4 bước"
          subtitle="Minh bạch, đơn giản và an toàn cho cả hai phía."
        />
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <Step
            n={1}
            icon={<FileText size={20} />}
            title="Đăng job"
            text="Client mô tả yêu cầu, ngân sách và deadline mong muốn."
          />
          <Step
            n={2}
            icon={<Handshake size={20} />}
            title="Chọn & thương lượng"
            text="Designer apply kèm portfolio, hai bên deal giá realtime."
          />
          <Step
            n={3}
            icon={<Lock size={20} />}
            title="Ký quỹ escrow"
            text="Tiền được khóa trong hợp đồng mô phỏng, an toàn tuyệt đối."
          />
          <Step
            n={4}
            icon={<CheckCircle2 size={20} />}
            title="Duyệt & giải ngân"
            text="Hài lòng thì giải ngân, không thì hoàn tiền tự động."
          />
        </div>
      </section>

      {/* ───────── Features ───────── */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <SectionHeading
            eyebrow="Tính năng"
            title="Mọi thứ bạn cần để hợp tác an tâm"
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={<Briefcase />}
              title="Đăng job dễ dàng"
              text="Mô tả yêu cầu, ngân sách và deadline chỉ trong vài phút."
            />
            <Feature
              icon={<Paintbrush />}
              title="Portfolio nổi bật"
              text="Designer trưng bày sản phẩm, gây ấn tượng và nhận việc nhanh hơn."
            />
            <Feature
              icon={<Wallet />}
              title="Thương lượng giá realtime"
              text="Hai bên deal giá qua phòng chat riêng, minh bạch từng đề xuất."
            />
            <Feature
              icon={<ShieldCheck />}
              title="Escrow an toàn"
              text="Tiền khóa trong hợp đồng mock, chỉ giải ngân khi sản phẩm được duyệt."
            />
            <Feature
              icon={<Bell />}
              title="Thông báo realtime"
              text="Mọi cập nhật về deal, order, sản phẩm đều đến tức thì."
            />
            <Feature
              icon={<Sparkles />}
              title="Tự động hoàn tiền"
              text="Designer trễ deadline? Hệ thống tự động hoàn tiền cho client."
            />
          </div>
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section className="mx-auto max-w-5xl px-4 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-16 text-center shadow-xl shadow-emerald-600/20 bg-grid sm:px-12">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Sẵn sàng bắt đầu dự án thiết kế của bạn?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-emerald-50">
            Tham gia miễn phí ngay hôm nay — không phí ẩn, không rủi ro.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {!user && (
              <Link href="/auth/register">
                <Button
                  size="lg"
                  className="bg-white text-emerald-700 shadow-none hover:bg-emerald-50"
                >
                  Tạo tài khoản miễn phí
                </Button>
              </Link>
            )}
            <Link href="/jobs">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:border-white/40"
              >
                Khám phá việc làm
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── Footer ───────── */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row">
          <span className="font-semibold text-slate-700">
            Logo<span className="text-emerald-600">Design</span>Hub
          </span>
          <span>© 2026 — Demo escrow freelance marketplace.</span>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-2 text-center">
      <p className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {title}
      </h2>
      {subtitle && <p className="mt-3 text-slate-500">{subtitle}</p>}
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  text,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
          {icon}
        </span>
        <span className="text-4xl font-bold text-slate-100">{n}</span>
      </div>
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{text}</p>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-6 transition-all hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-600/5">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
        {icon}
      </span>
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{text}</p>
    </div>
  );
}
