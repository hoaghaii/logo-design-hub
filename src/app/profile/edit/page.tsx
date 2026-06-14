import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileForm } from "./profile-form";
import { LinkWallet } from "./link-wallet";

export default async function EditProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?redirect=/profile/edit");

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <PageHeader
        eyebrow="Tài khoản"
        title="Chỉnh sửa hồ sơ"
        subtitle="Cập nhật thông tin hiển thị công khai của bạn."
      />

      <Card>
        <CardHeader>
          <CardTitle>Thông tin cá nhân</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            fullName={user.full_name ?? ""}
            bio={user.bio ?? ""}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ví MetaMask</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-slate-500">
            Liên kết địa chỉ ví để nhận thanh toán qua escrow.
          </p>
          <LinkWallet currentAddress={user.wallet_address ?? null} />
        </CardContent>
      </Card>
    </div>
  );
}
