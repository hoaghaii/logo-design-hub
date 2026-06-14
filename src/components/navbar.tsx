import Link from "next/link";
import { Palette, LogOut } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notification-bell";
import { ConnectWallet } from "@/components/connect-wallet";

export async function Navbar() {
  const user = await getCurrentUser();

  const links =
    user?.role === "designer"
      ? [
          { href: "/jobs", label: "Tìm việc" },
          { href: "/applications/my", label: "Công việc" },
        ]
      : user?.role === "client"
        ? [
            { href: "/jobs/manage", label: "Job của tôi" },
            { href: "/orders", label: "Đơn hàng" },
          ]
        : [];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold tracking-tight text-slate-900"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-600/30">
            <Palette size={18} />
          </span>
          <span className="text-[15px]">
            Logo<span className="text-emerald-600">Design</span>Hub
          </span>
        </Link>

        {user ? (
          <nav className="flex items-center gap-1">
            <div className="mr-1 hidden items-center gap-0.5 md:flex">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  {l.label}
                </Link>
              ))}
            </div>

            <ConnectWallet />

            <NotificationBell userId={user.id} />

            <Link
              href={`/profile/${user.id}`}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-slate-100 sm:pr-3"
              title={user.full_name || "Hồ sơ"}
            >
              <Avatar name={user.full_name} seed={user.id} size="sm" />
              <span className="hidden max-w-28 truncate text-sm font-medium text-slate-700 sm:block">
                {user.full_name || "Hồ sơ"}
              </span>
            </Link>

            <form action={signOut}>
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="text-slate-500"
                title="Đăng xuất"
              >
                <LogOut size={16} />
                <span className="hidden lg:inline">Đăng xuất</span>
              </Button>
            </form>
          </nav>
        ) : (
          <nav className="flex items-center gap-2">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm" type="button">
                Đăng nhập
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm" type="button">
                Đăng ký miễn phí
              </Button>
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
