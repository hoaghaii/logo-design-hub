# Quá trình sử dụng LogoDesignHub (User Flow)

LogoDesignHub là nền tảng kết nối **Client** (người thuê thiết kế) và **Designer** (nhà thiết kế tự do) thông qua hệ thống **Mock Crypto Escrow** (Ký quỹ tiền điện tử giả lập).

Dưới đây là luồng hoạt động chính của ứng dụng dành cho 2 đối tượng người dùng.

---

## 🎨 1. Quy trình làm việc tổng quan (Workflow)

***Bước 0. Đăng ký & Đăng nhập***
Người dùng tạo tài khoản và chọn vai trò của mình là **Client** (Người thuê thiết kế) hoặc **Designer** (Người làm thiết kế).

***Giai đoạn 1: Tìm kiếm & Ứng tuyển***
1. **Client** đăng tải một yêu cầu thiết kế logo (Job) bao gồm mô tả công việc và mức ngân sách dự kiến (đơn vị ETH).
2. Chi tiết của Job sẽ hiển thị lên Bảng tin việc làm.
3. **Designer** tìm kiếm thấy Job phù hợp sẽ nộp portfolio kèm tin nhắn ứng tuyển (Cover note).
4. Hệ thống sẽ thông báo cho Client biết có một ứng viên mới.

***Giai đoạn 2: Thương lượng (Deal)***
1. **Client** duyệt danh sách ứng viên. Nếu thấy portfolio tốt, Client nhấn vào ứng viên để mở **Deal Room** (phòng chat riêng).
2. Hai bên trao đổi chi tiết về yêu cầu logo.
3. Khi hiểu rõ công việc, **Designer** gửi lại "Đề xuất về Cước phí (ETH) & Deadline".
4. Nếu ưng ý, **Client** chốt và **bấm chấp nhận đề xuất giá**.

***Giai đoạn 3: Ký gửi vào Quỹ an toàn (Escrow)***
1. Dựa trên mức giá đã chốt, **Client** khởi tạo hợp đồng (Create Contract) và gửi yêu cầu đến Designer.
2. **Designer** xác nhận các điều khoản hợp đồng.
3. Ngay lập tức, **Client** sẽ đem số tiền ETH đem nạp và khóa vào **Quỹ Escrow** của hệ thống (Trạng thái an toàn: Tiền đã trừ từ ví Client nhưng chưa chuyển cho Designer).
4. Hệ thống thông báo xác nhận tiền đã được khóa. **Designer** an tâm bắt đầu bắt tay vào thiết kế!

***Giai đoạn 4: Bàn giao & Thanh toán***
1. Khi hoàn thành logo, **Designer** tải file lên hệ thống.
2. **Client** tiến hành xem xét sản phẩm:
   - **Trường hợp A (Hài lòng):** Bấm "Phê duyệt" (Approve). Hệ thống **Mở khóa Escrow** và chuyển thẳng ETH sang ví của Designer.
   - **Trường hợp B (Từ chối hoặc Quá hạn):** Bấm "Từ chối" (Reject). Hệ thống sẽ **Hoàn trả tiền ETH** về lại cho Client. Đồng thời file thiết kế sẽ bị khóa vĩnh viễn (đánh dấu watermark) để bảo vệ Bản quyền cho Designer.

---

## 📖 2. Chi tiết các Bước thao tác trên UI

### A. Đối với Client
1. **Đăng nhập:** Vào `/auth/login` bằng tài khoản Client.
2. **Tạo Job:** Vào `/jobs/create` điền Form (Tiêu đề, mô tả, ngân sách dự kiến tính bằng ETH, thời hạn biểu).
3. **Quản lý Ứng viên:** Vào `/jobs/manage`, chọn Job đang mở, xem danh sách Designer đã nộp đơn.
4. **Deal Room:** Bấm vào một Ứng viên để mở `/deal/[applicationId]`. 
   - Chat với Designer.
   - Nhận "Đề xuất giá" và chọn "Chấp nhận ✔".
   - Bấm **"Gửi hợp đồng cho designer"** để hệ thống sinh ra một Mock Contract Address.
5. **Thanh toán Escrow:** Sau khi Designer chấp nhận hợp đồng, Client vào trang **Escrow** (`/orders/[id]/escrow`), bấm khóa quỹ (tiền sẽ bị trừ ở Mock Wallet).
6. **Nhận File & Duyệt:** Kiểm tra sản phẩm Designer nộp, bấm Phê duyệt để xác nhận thanh toán tự động tới Designer, đơn hàng chuyển sang `Completed`.

### B. Đối với Designer
1. **Đăng nhập:** Vào `/auth/login` bằng tài khoản Designer.
2. **Tìm Job:** Vào trang `/jobs` hiển thị danh sách tất cả các Job "Đang mở".
3. **Apply & Portfolio:** Nhấn vào Job chi tiết, upload ảnh portfolio, điền tin nhắn chào hàng và ấn "Apply".
4. **Deal Room:** Theo dõi `/applications/my`, nếu Client inbox, vào trò chuyện. 
   - Chủ động bấm **"Đề xuất giá" (Icon 💵)** để ấn định giá ETH và deadline làm việc.
5. **Ký Hợp đồng:** Client gửi Form Contract, Designer nhấn **Accept** để xác nhận điều khoản hợp đồng. Đợi Client đưa tiền vào Escrow.
6. **Giao việc:** Sau khi trạng thái đổi thành `Active` (Escrow Funded), Designer tiến hành upload File final. Nếu Client approve, ví Mock Wallet của Designer tự động được cộng thêm ETH khởi điểm.

---

## 🔒 3. Cơ chế Mock Escrow "Smart Contract"
- Toàn bộ giao dịch và hợp đồng tạo ra các **Contract Address** và **TxHash** giả lập (hiển thị Hex ví dụ: `0xABCD...1234`).
- Tiền thật chất là trường `wallet_balance` ở database, quy ước mỗi 1 ETH = 1,000,000 internal token VND (Nhưng ở UI Front-end hoàn toàn thể hiện cho người dùng là đơn vị ETH).
- Server tự tính biên độ an toàn, và bảo mật bằng RLS (Row Level Security) từ Supabase + Admin Client của server, người dùng không thể can thiệp số dư trên Client-side.
