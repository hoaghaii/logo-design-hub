import Link from "next/link";
import { AuthLayout } from "@/components/auth-layout";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: PageProps<"/auth/login">) {
  const { redirect } = await searchParams;
  const redirectTo = typeof redirect === "string" ? redirect : "";

  return (
    <AuthLayout
      title="Đăng nhập"
      subtitle="Chào mừng trở lại LogoDesignHub 👋"
      footer={
        <>
          Chưa có tài khoản?{" "}
          <Link
            href="/auth/register"
            className="font-semibold text-emerald-600 hover:underline"
          >
            Đăng ký ngay
          </Link>
        </>
      }
    >
      <LoginForm redirectTo={redirectTo} />
    </AuthLayout>
  );
}
