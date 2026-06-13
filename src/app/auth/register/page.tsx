import Link from "next/link";
import { AuthLayout } from "@/components/auth-layout";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Tạo tài khoản"
      subtitle="Tham gia LogoDesignHub với vai trò của bạn"
      footer={
        <>
          Đã có tài khoản?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-emerald-600 hover:underline"
          >
            Đăng nhập
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthLayout>
  );
}
