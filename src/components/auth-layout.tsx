import Link from "next/link";
import { Palette, ShieldCheck, Wallet, Bell } from "lucide-react";

/** Two-panel auth shell: emerald brand panel (desktop) + form column. */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 bg-grid p-12 lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Palette size={18} />
          </span>
          LogoDesignHub
        </Link>

        <div>
          <h2 className="max-w-sm text-3xl font-bold leading-tight text-white">
            Hợp tác thiết kế, thanh toán an toàn qua escrow.
          </h2>
          <ul className="mt-8 space-y-4">
            <Perk icon={<ShieldCheck size={18} />} text="Tiền được khóa an toàn cho tới khi bạn duyệt sản phẩm." />
            <Perk icon={<Wallet size={18} />} text="Thương lượng giá realtime, minh bạch từng đề xuất." />
            <Perk icon={<Bell size={18} />} text="Thông báo tức thì mọi cập nhật của dự án." />
          </ul>
        </div>

        <p className="text-sm text-emerald-100/80">
          © 2026 LogoDesignHub — Demo escrow marketplace.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center px-4 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
          </div>
          {children}
          <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>
        </div>
      </div>
    </div>
  );
}

function Perk({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-3 text-emerald-50">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
        {icon}
      </span>
      <span className="text-sm leading-relaxed">{text}</span>
    </li>
  );
}
