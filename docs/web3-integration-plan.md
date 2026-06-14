# Web3 Integration Plan — Ganache + MetaMask Escrow

## Quyết định kiến trúc

| Vấn đề | Chọn | Hệ quả |
|---|---|---|
| Network | Ganache local, tham số hoá sẵn cho Sepolia | Config network/RPC/address qua env, đổi mạng không sửa code |
| Định giá | ETH trực tiếp | Bỏ VND khỏi luồng tiền; deal room nhập bằng ETH |
| Quá hạn | Bỏ auto-refund | Contract không cần `deadline`/`block.timestamp`; refund = client từ chối thủ công |
| Đồng bộ | Frontend confirm + server verify receipt | Không cần process chạy nền; server đọc lại tx từ RPC để xác thực |

---

## Phân chia on-chain / off-chain

**Off-chain (giữ nguyên Supabase):**
- Jobs, applications, phòng deal + chat (`deal_messages`)
- Notifications, deliverables (file vẫn ở Supabase Storage)
- Handshake chấp nhận hợp đồng (`propose_contract` / `respond_contract`) — đây là thoả thuận nghiệp vụ, không phải tiền

**On-chain (Ganache / Sepolia):**
- Chỉ phần chuyển tiền: khoá quỹ (fund), giải ngân (release), hoàn tiền (refund)
- `orders` trở thành **bản mirror** của trạng thái on-chain

> `users.wallet_balance` thành vô nghĩa — navbar đọc số dư thật từ ethers thay vì DB.

---

## Smart Contract — `Escrow.sol`

Một contract duy nhất, map theo `dealId = keccak256(order.id)`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Escrow {
    enum State { None, Funded, Released, Refunded }

    struct Deal {
        address client;
        address designer;
        uint256 amount;
        State   state;
    }

    mapping(bytes32 => Deal) public deals;

    event Funded(bytes32 indexed dealId, address client, address designer, uint256 amount);
    event Released(bytes32 indexed dealId, uint256 amount);
    event Refunded(bytes32 indexed dealId, uint256 amount);

    /// Client gửi ETH kèm call này để khoá quỹ
    function fund(bytes32 dealId, address designer) external payable;

    /// Chỉ client gọi → giải ngân cho designer
    function release(bytes32 dealId) external;

    /// Chỉ client gọi → hoàn tiền về ví client
    function refund(bytes32 dealId) external;
}
```

**Quy tắc:**
- Designer **không ký tx** nào để nhận tiền — chỉ cần địa chỉ ví đã link.
- Không có deadline on-chain (đã bỏ auto-refund).
- `dealId` = `keccak256(abi.encodePacked(orderId))` — client tự tính trên FE.

**Map status:**

| Contract event | `orders.status` mới | Ghi chú |
|---|---|---|
| `fund()` | `active` | Trước đó: `pending_escrow` |
| `release()` | `completed` | Giải ngân cho designer |
| `refund()` | `rejected` | Hoàn tiền + khoá deliverable |

---

## Luồng đồng bộ & xác thực (bảo mật then chốt)

Mỗi hành động tiền đi qua **4 bước**:

```
[FE] Build tx → MetaMask popup (gas thật)
        ↓ user confirm
[FE] tx.wait() → receipt
        ↓
[FE] gọi server action confirmFunded(orderId, txHash)
        ↓
[Server] JsonRpcProvider.getTransactionReceipt(txHash)
         XÁC THỰC:
           ✓ receipt.status == 1
           ✓ tx.to == ESCROW_ADDRESS
           ✓ parse log Funded, khớp dealId/amount/designer
           ✓ txHash chưa từng dùng (unique tx_hash)
         → createAdminClient → update order + insert transaction
```

> ⚠️ **Quan trọng:** Server KHÔNG tin client. Mọi claim về tx đều bị verify lại từ chain.

> ⚠️ **Giới hạn Ganache local:** Server action gọi `127.0.0.1:8545` — chỉ hoạt động khi Next.js server chạy cùng máy. Lên Sepolia thì RPC là public URL, Vercel gọi được bình thường.

---

## Thay đổi Database

### Schema mới

```sql
-- Thêm cột link ví
ALTER TABLE public.users
  ADD COLUMN wallet_address text unique;

-- final_price giờ lưu ETH (vd: 1.5 = 1.5 ETH)
-- Không đổi kiểu cột, nhưng đổi nghĩa: VND → ETH

-- transactions: thêm địa chỉ thật
ALTER TABLE public.transactions
  ADD COLUMN from_address text,
  ADD COLUMN to_address  text;
-- tx_hash giờ là hash thật từ chain (vẫn unique)
-- amount lưu ETH (từ formatEther)
```

### Bỏ / deprecated
- `users.wallet_balance` — không xoá ngay nhưng không dùng trong luồng tiền nữa
- `lockEscrow` / `releaseEscrow` / `rejectEscrow` RPC cũ → thay bằng verify-action mới
- Không đổi: `propose_contract`, `respond_contract`, toàn bộ luồng chat/deal

---

## Cấu trúc thư mục mới

```
contracts/                        # Hardhat project (tách biệt với Next.js)
  contracts/
    Escrow.sol
  scripts/
    deploy.ts
  test/
    Escrow.test.ts
  hardhat.config.ts               # networks: ganache(1337) + sepolia(11155111)
  package.json

src/lib/web3/
  chains.ts                       # chainId → { name, rpcUrl, explorer }
  contract.ts                     # ABI + address từ env
  provider.ts                     # browser provider helper, server JsonRpcProvider
  use-wallet.ts                   # hook: connect, account, chainId, network guard

src/components/
  connect-wallet.tsx              # nút Connect / hiện address rút gọn
  network-guard.tsx               # banner "Sai mạng, switch sang MockNet"
```

### Env vars mới

```env
# Client-side (public)
NEXT_PUBLIC_CHAIN_ID=1337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_ESCROW_ADDRESS=0x...   # sau khi deploy

# Server-side (private — để verify receipt)
RPC_URL=http://127.0.0.1:8545

# Hardhat deployer (chỉ dùng trong contracts/)
DEPLOYER_PRIVATE_KEY=0x...
```

---

## Các phase triển khai

### Phase 1 — Smart Contract
- Scaffold Hardhat project trong `contracts/`
- Viết `Escrow.sol` + unit test
- Deploy script: `npx hardhat run scripts/deploy.ts --network ganache`
- Output contract address → paste vào `.env.local`

### Phase 2 — Web3 Plumbing
- Cài `ethers` v6 vào Next.js
- `useWallet` hook: connect MetaMask, đọc account + chainId
- `NetworkGuard` component: nếu sai chainId → hiện banner "Switch mạng"
- Nút **Connect Wallet** trên navbar (thay widget wallet_balance)

### Phase 3 — Link Ví
- Migration thêm `users.wallet_address`
- Trang profile/settings: connect → lưu address vào DB
- Navbar hiển thị số dư on-chain thật (ethers `getBalance`)

### Phase 4 — Rewire Escrow UI
- `FundEscrowButton`: bỏ modal gas giả, thay bằng gọi `contract.fund()` → MetaMask tự hiện popup gas thật
- Tương tự `release()` và `refund()`
- Loading state: spinner trong khi chờ `tx.wait()`

### Phase 5 — Server Verify
- Util `verifyTx(txHash, expected)` đọc receipt từ chain
- 3 server actions mới: `confirmFunded`, `confirmReleased`, `confirmRefunded`
- Mỗi action: verify receipt → `createAdminClient` update DB
- Thêm `from_address`, `to_address`, real `tx_hash` vào `transactions`

### Phase 6 — Đổi giá sang ETH
- Deal room: input `proposed_price` → ETH (vd `0.5`)
- `propose_contract` RPC: lưu `final_price` dạng ETH
- Mọi nơi hiển thị giá dùng `formatEther` thay vì `formatVND`

### Phase 7 — Dọn dẹp & Docs
- Ẩn/bỏ `wallet_balance` khỏi UI
- README: hướng dẫn chạy Ganache + import account vào MetaMask
- Checklist Sepolia migration

---

## Hướng dẫn vận hành demo

### Chạy Ganache
```bash
# Cài
npm install -g ganache

# Chạy với data persistent + account cố định
ganache --deterministic --db ./ganache-data --port 8545
# → 10 account, mỗi cái 1000 ETH test
# → Private key hiện ngay khi start
```

> `--deterministic`: accounts giống nhau mỗi lần start (dùng HD wallet seed cố định).
> `--db ./ganache-data`: persist state → restart không mất contract.

### Import vào MetaMask
1. Thêm network: RPC `http://127.0.0.1:8545`, Chain ID `1337`, Symbol `ETH`
2. Import **Account 0** (client) bằng private key từ Ganache output
3. Dùng **2 browser profile** (Chrome profile A = client, profile B = designer):
   - Profile A: import Account 0
   - Profile B: import Account 1

### ⚠️ Khi restart Ganache (không dùng `--db`)
- Contract address chết → redeploy + update `NEXT_PUBLIC_ESCROW_ADDRESS`
- MetaMask: **Settings → Advanced → Reset Account** (xoá nonce cache)

---

## Câu hỏi mở (cần xác nhận trước khi code)

1. **Hardhat hay Foundry?**
   Default: **Hardhat** — hợp với TS/Next.js, cùng hệ sinh thái.

2. **Xoá hẳn `wallet_balance` hay giữ?**
   Default: giữ cột nhưng navbar đọc số dư on-chain, không đọc DB.

---

*Cập nhật lần cuối: 2026-06-14*
