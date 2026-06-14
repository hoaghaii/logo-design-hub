# Hướng dẫn tích hợp Ganache + MetaMask từ đầu

> Mục tiêu: Demo escrow blockchain thật sự — tiền nằm trong smart contract,
> MetaMask ký giao dịch, Ganache giả lập mạng Ethereum cục bộ.
> Không cần internet, không cần ETH thật.

---

## Tổng quan luồng

```
[Ganache]  ←→  [MetaMask]  ←→  [Next.js FE]  ←→  [Server Action]  ←→  [Supabase]
  chain           ví              gọi contract       verify receipt      update DB
localhost:8545   browser         ethers v6           JsonRpcProvider
```

---

## PHẦN 1 — Cài đặt môi trường

### 1.1 Cài Node.js (nếu chưa có)
Node.js đã có sẵn (dự án đang chạy được). Bỏ qua.

### 1.2 Cài Ganache CLI

```powershell
npm install -g ganache
```

Kiểm tra:
```powershell
ganache --version
# ganache v7.x.x
```

### 1.3 Cài MetaMask (extension Chrome/Edge/Firefox)

1. Vào Chrome Web Store → tìm **MetaMask** → **Add to Chrome**
2. Mở MetaMask → **Create a new wallet** → đặt password → lưu Secret Recovery Phrase
   (đây là demo local, phrase này không cần bảo vệ kỹ)
3. Mặc định MetaMask kết nối Ethereum Mainnet — **chưa dùng được**, sẽ thêm mạng Ganache ở bước sau

### 1.4 Cài Hardhat (viết + deploy smart contract)

Trong thư mục dự án, tạo thư mục con riêng:

```powershell
mkdir contracts
cd contracts
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
# Chọn: "Create a TypeScript project"
# Enter hết (mặc định)
cd ..
```

---

## PHẦN 2 — Chạy Ganache

### 2.1 Lệnh khởi động (dùng cái này mỗi lần)

```powershell
ganache --deterministic --db ./ganache-data --port 8545 --chain.chainId 1337
```

| Flag | Ý nghĩa |
|---|---|
| `--deterministic` | 10 account cố định (seed HD wallet), private key giống nhau mỗi lần restart |
| `--db ./ganache-data` | Lưu state vào disk — restart không mất contract đã deploy |
| `--port 8545` | Cổng mặc định của Ethereum |
| `--chain.chainId 1337` | Chain ID chuẩn cho mạng dev local |

Output khi chạy:
```
Available Accounts
==================
(0) 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266  (1000 ETH)
(1) 0x70997970C51812dc3A010C7d01b50e0d17dc79C8  (1000 ETH)
...

Private Keys
==================
(0) 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
(1) 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
...

RPC Listening on 127.0.0.1:8545
```

> **Lưu lại** private key của Account 0 (client) và Account 1 (designer).
> Đây là ETH test, không phải tiền thật.

### 2.2 Để Ganache chạy nền

Mở **1 terminal riêng** cho Ganache, **1 terminal** cho `npm run dev`.
Đừng đóng terminal Ganache trong khi test.

---

## PHẦN 3 — Thêm mạng Ganache vào MetaMask

1. Mở MetaMask → click tên mạng ở góc trên (mặc định "Ethereum Mainnet")
2. **Add a custom network** (hoặc "Add network manually")
3. Điền:

| Trường | Giá trị |
|---|---|
| Network Name | `Ganache Local` |
| New RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `1337` |
| Currency Symbol | `ETH` |
| Block Explorer URL | *(để trống)* |

4. **Save** → MetaMask chuyển sang mạng Ganache Local

### 3.1 Import account vào MetaMask

> Cần 2 browser profile để test đồng thời client + designer.
> Tạm thời dùng 1 profile, đổi account khi cần.

**Import Account 0 (client):**
1. MetaMask → click avatar → **Import Account**
2. Dán private key `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
3. Đặt tên: `Demo Client`

**Import Account 1 (designer):**
1. Tương tự với private key `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
2. Đặt tên: `Demo Designer`

> Mỗi account đều có 1000 ETH test. Dùng thoải mái.

---

## PHẦN 4 — Viết và deploy Smart Contract

### 4.1 Tạo `Escrow.sol`

Tạo file `contracts/contracts/Escrow.sol`:

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

    event Funded(bytes32 indexed dealId, address indexed client, address indexed designer, uint256 amount);
    event Released(bytes32 indexed dealId, address indexed designer, uint256 amount);
    event Refunded(bytes32 indexed dealId, address indexed client, uint256 amount);

    error DealExists();
    error DealNotFunded();
    error NotClient();
    error ZeroAmount();

    /// @notice Client khoá tiền vào escrow
    /// @param dealId  keccak256(orderId từ Supabase)
    /// @param designer địa chỉ ví designer (nhận tiền khi release)
    function fund(bytes32 dealId, address designer) external payable {
        if (deals[dealId].state != State.None) revert DealExists();
        if (msg.value == 0) revert ZeroAmount();

        deals[dealId] = Deal({
            client:   msg.sender,
            designer: designer,
            amount:   msg.value,
            state:    State.Funded
        });

        emit Funded(dealId, msg.sender, designer, msg.value);
    }

    /// @notice Client duyệt → giải ngân cho designer
    function release(bytes32 dealId) external {
        Deal storage d = deals[dealId];
        if (d.state != State.Funded) revert DealNotFunded();
        if (d.client != msg.sender)  revert NotClient();

        d.state = State.Released;
        emit Released(dealId, d.designer, d.amount);

        (bool ok,) = d.designer.call{value: d.amount}("");
        require(ok, "Transfer failed");
    }

    /// @notice Client từ chối → hoàn tiền về ví client
    function refund(bytes32 dealId) external {
        Deal storage d = deals[dealId];
        if (d.state != State.Funded) revert DealNotFunded();
        if (d.client != msg.sender)  revert NotClient();

        d.state = State.Refunded;
        emit Refunded(dealId, d.client, d.amount);

        (bool ok,) = d.client.call{value: d.amount}("");
        require(ok, "Transfer failed");
    }
}
```

### 4.2 Cấu hình Hardhat

Sửa `contracts/hardhat.config.ts`:

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    ganache: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
      accounts: [
        // Account 0 — dùng làm deployer
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
      ]
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL ?? "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : []
    }
  }
};

export default config;
```

### 4.3 Script deploy

Tạo `contracts/scripts/deploy.ts`:

```typescript
import { ethers } from "hardhat";

async function main() {
  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy();
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log(`✅ Escrow deployed to: ${address}`);
  console.log(`\nCopy vào .env.local:`);
  console.log(`NEXT_PUBLIC_ESCROW_ADDRESS=${address}`);
}

main().catch(console.error);
```

### 4.4 Deploy lên Ganache

```powershell
cd contracts
npx hardhat run scripts/deploy.ts --network ganache
```

Output:
```
✅ Escrow deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3

Copy vào .env.local:
NEXT_PUBLIC_ESCROW_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

> Nếu Ganache không dùng `--db` (persist), mỗi lần restart phải deploy lại
> và reset account trong MetaMask.

---

## PHẦN 5 — Tích hợp vào Next.js

### 5.1 Cài thư viện

```powershell
# Ở thư mục gốc dự án (không phải contracts/)
npm install ethers
```

### 5.2 Thêm env vars

Thêm vào `.env.local`:

```env
# Ganache (public — dùng trong browser)
NEXT_PUBLIC_CHAIN_ID=1337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_ESCROW_ADDRESS=0x...   # địa chỉ vừa deploy

# Sepolia (để trống đến khi deploy testnet)
# NEXT_PUBLIC_CHAIN_ID=11155111
# NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/...
# NEXT_PUBLIC_ESCROW_ADDRESS=0x...

# Server-side (verify receipt — KHÔNG có NEXT_PUBLIC_)
RPC_URL=http://127.0.0.1:8545
```

### 5.3 Tạo ABI file

Sau khi compile, copy ABI từ `contracts/artifacts/contracts/Escrow.sol/Escrow.json`
vào `src/lib/web3/escrow-abi.json` (chỉ cần mảng `abi`):

```powershell
cd contracts
npx hardhat compile
```

Lấy nội dung `abi` trong file artifacts, paste vào `src/lib/web3/escrow-abi.json`.

### 5.4 Tạo `src/lib/web3/contract.ts`

```typescript
import { ethers } from "ethers";
import EscrowABI from "./escrow-abi.json";

export const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ADDRESS!;
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID!);

/** Browser: dùng MetaMask làm signer */
export function getEscrowContract(signer: ethers.Signer) {
  return new ethers.Contract(ESCROW_ADDRESS, EscrowABI, signer);
}

/** Server: read-only provider để verify receipt */
export function getServerProvider() {
  return new ethers.JsonRpcProvider(process.env.RPC_URL!);
}
```

### 5.5 Tạo `src/lib/web3/use-wallet.ts`

Hook kết nối MetaMask:

```typescript
"use client";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { CHAIN_ID } from "./contract";

type WalletState = {
  account: string | null;
  balance: string | null;
  chainId: number | null;
  isCorrectChain: boolean;
  connect: () => Promise<void>;
  switchChain: () => Promise<void>;
};

export function useWallet(): WalletState {
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  const refresh = useCallback(async (addr: string) => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const bal = await provider.getBalance(addr);
    setBalance(ethers.formatEther(bal));
    const network = await provider.getNetwork();
    setChainId(Number(network.chainId));
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
      if (accounts[0]) { setAccount(accounts[0]); refresh(accounts[0]); }
    });
    window.ethereum.on("accountsChanged", (accounts: string[]) => {
      setAccount(accounts[0] ?? null);
      if (accounts[0]) refresh(accounts[0]);
    });
    window.ethereum.on("chainChanged", () => window.location.reload());
  }, [refresh]);

  const connect = useCallback(async () => {
    if (!window.ethereum) { alert("Cài MetaMask trước!"); return; }
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    setAccount(accounts[0]);
    await refresh(accounts[0]);
  }, [refresh]);

  const switchChain = useCallback(async () => {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
    }).catch(() =>
      window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{ chainId: `0x${CHAIN_ID.toString(16)}`, chainName: "Ganache Local",
          rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL!],
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 } }],
      })
    );
  }, []);

  return { account, balance, chainId, isCorrectChain: chainId === CHAIN_ID, connect, switchChain };
}
```

### 5.6 Thêm `wallet_address` vào DB

```sql
-- Chạy qua Supabase MCP hoặc SQL Editor
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS wallet_address text unique;
```

### 5.7 Thêm cột vào `database.types.ts`

Sau khi migrate, chạy lại generate types qua Supabase MCP.

---

## PHẦN 6 — Giao diện Connect Wallet

### 6.1 Tạo `src/components/connect-wallet.tsx`

```tsx
"use client";
import { useWallet } from "@/lib/web3/use-wallet";
import { Wallet, AlertTriangle } from "lucide-react";

export function ConnectWallet() {
  const { account, balance, isCorrectChain, connect, switchChain } = useWallet();

  if (!account) return (
    <button onClick={connect}
      className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">
      <Wallet size={15} /> Connect Wallet
    </button>
  );

  if (!isCorrectChain) return (
    <button onClick={switchChain}
      className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 hover:bg-amber-100">
      <AlertTriangle size={15} /> Sai mạng — Switch
    </button>
  );

  return (
    <span className="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
      <Wallet size={15} />
      {parseFloat(balance ?? "0").toFixed(3)} ETH
    </span>
  );
}
```

### 6.2 Dùng trong Navbar

Thay widget `wallet_balance` cũ bằng `<ConnectWallet />`.

---

## PHẦN 7 — Rewire Escrow (fund / release / refund)

### 7.1 `confirmFunded` server action (verify on-chain → update DB)

```typescript
// src/app/orders/actions.ts (thêm vào)
"use server";
import { ethers } from "ethers";
import { getServerProvider, ESCROW_ADDRESS } from "@/lib/web3/contract";
import EscrowABI from "@/lib/web3/escrow-abi.json";
import { createAdminClient } from "@/lib/supabase/server";

export async function confirmFunded(orderId: string, txHash: string) {
  const provider = getServerProvider();
  const receipt = await provider.getTransactionReceipt(txHash);

  // 1. TX phải thành công
  if (!receipt || receipt.status !== 1) throw new Error("TX thất bại");

  // 2. Gọi đúng contract
  if (receipt.to?.toLowerCase() !== ESCROW_ADDRESS.toLowerCase())
    throw new Error("Sai contract");

  // 3. Parse log Funded
  const iface = new ethers.Interface(EscrowABI);
  const fundedLog = receipt.logs
    .map(log => { try { return iface.parseLog(log); } catch { return null; } })
    .find(e => e?.name === "Funded");
  if (!fundedLog) throw new Error("Không tìm thấy event Funded");

  // 4. dealId khớp với orderId
  const expectedDealId = ethers.keccak256(ethers.toUtf8Bytes(orderId));
  if (fundedLog.args.dealId !== expectedDealId) throw new Error("dealId không khớp");

  // 5. txHash chưa dùng (idempotency)
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("transactions").select("id").eq("tx_hash", txHash).maybeSingle();
  if (existing) throw new Error("TX đã được ghi nhận");

  // 6. Update DB
  const amount = parseFloat(ethers.formatEther(fundedLog.args.amount));
  await supabase.from("orders").update({ status: "active" }).eq("id", orderId);
  await supabase.from("transactions").insert({
    order_id: orderId,
    type: "escrow_lock",
    amount,
    tx_hash: txHash,
    from_address: fundedLog.args.client,
    to_address: ESCROW_ADDRESS,
    status: "confirmed",
  });
}
```

> Tương tự viết `confirmReleased` và `confirmRefunded` cho release/refund.

### 7.2 Client escrow — gọi contract qua MetaMask

```typescript
// Trong FundEscrowButton (client component)
import { ethers } from "ethers";
import { getEscrowContract } from "@/lib/web3/contract";
import { confirmFunded } from "@/app/orders/actions";

async function handleFund(orderId: string, designerWallet: string, ethAmount: string) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = getEscrowContract(signer);

  const dealId = ethers.keccak256(ethers.toUtf8Bytes(orderId));
  const value  = ethers.parseEther(ethAmount); // "1.5" → wei

  // MetaMask popup tự hiện — gas tự tính
  const tx = await contract.fund(dealId, designerWallet, { value });
  toast.loading("Chờ xác nhận trên chain...", { id: "fund" });

  const receipt = await tx.wait();
  toast.dismiss("fund");

  // Server verify + update DB
  await confirmFunded(orderId, receipt.hash);
  toast.success("Đã khoá tiền vào Escrow!");
}
```

---

## PHẦN 8 — Thay đổi Deal Room (giá bằng ETH)

- Input `proposed_price` đổi thành ETH (vd `0.5` thay vì `500000`)
- `propose_contract` RPC: `final_price` lưu dưới dạng ETH decimal
- Hiển thị: `{price} ETH` thay vì `formatVND(price)`
- `fund()` call: `ethers.parseEther(order.final_price.toString())`

---

## PHẦN 9 — Checklist từng bước (thực hiện theo thứ tự)

### Bước 1 — Môi trường
- [ ] `npm install -g ganache` → kiểm tra `ganache --version`
- [ ] Cài MetaMask trên Chrome
- [ ] `mkdir contracts && cd contracts && npm init -y`
- [ ] `npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox`
- [ ] `npx hardhat init` (TypeScript project)

### Bước 2 — Contract
- [ ] Tạo `contracts/contracts/Escrow.sol`
- [ ] Sửa `contracts/hardhat.config.ts`
- [ ] Tạo `contracts/scripts/deploy.ts`
- [ ] `npx hardhat compile` (kiểm tra không có lỗi)
- [ ] Chạy Ganache: `ganache --deterministic --db ./ganache-data --port 8545 --chain.chainId 1337`
- [ ] `npx hardhat run scripts/deploy.ts --network ganache`
- [ ] Copy contract address vào `.env.local`

### Bước 3 — MetaMask
- [ ] Thêm mạng Ganache Local vào MetaMask
- [ ] Import Account 0 (client private key)
- [ ] Import Account 1 (designer private key)
- [ ] Kiểm tra: mỗi account thấy 1000 ETH

### Bước 4 — Next.js plumbing
- [ ] `npm install ethers` (ở thư mục gốc)
- [ ] Copy ABI vào `src/lib/web3/escrow-abi.json`
- [ ] Tạo `src/lib/web3/contract.ts`
- [ ] Tạo `src/lib/web3/use-wallet.ts`
- [ ] Thêm env vars vào `.env.local`

### Bước 5 — Migrate DB
- [ ] `ALTER TABLE users ADD COLUMN wallet_address text unique`
- [ ] Regenerate `database.types.ts`

### Bước 6 — UI
- [ ] Tạo `ConnectWallet` component
- [ ] Gắn vào Navbar
- [ ] Trang escrow → link ví designer (cần `wallet_address` của designer)
- [ ] Rewire `FundEscrowButton` gọi `contract.fund()` thật
- [ ] Viết `confirmFunded` server action
- [ ] Tương tự cho `release` và `refund`

### Bước 7 — Đổi giá ETH
- [ ] Deal room input ETH
- [ ] Update `propose_contract` RPC
- [ ] Update mọi display format

---

## Lưu ý quan trọng

### MetaMask & Ganache local — chainId 1337

MetaMask có lỗi lịch sử với chainId 1337 trên một số phiên bản.
Nếu không connect được, thử chainId `31337` (Hardhat default) thay thế.

### Ganache restart không dùng `--db`

Nếu quên flag `--db`, khi restart Ganache:
1. Contract address **mất** → phải redeploy → update env → restart Next.js
2. MetaMask **nhớ nonce cũ** → tx bị reject → vào **Settings → Advanced → Reset Account**

### Designer phải link ví trước khi client fund

Trong `fund(dealId, designer)`, tham số `designer` là địa chỉ ví on-chain.
Server cần đọc `users.wallet_address` của designer trước khi truyền vào contract.
Nếu designer chưa link ví → chặn nút fund + hiện cảnh báo.

### 2 browser profile để test đồng thời

- Chrome: **profile A** → MetaMask account 0 (client) → đăng nhập `client@gmail.com`
- Chrome: **profile B** → MetaMask account 1 (designer) → đăng nhập `designer@gmail.com`

---

## Lên Sepolia sau này (checklist)

- [ ] Lấy Sepolia ETH từ faucet: `sepoliafaucet.com` hoặc `faucets.chain.link`
- [ ] Update `hardhat.config.ts` với Sepolia RPC (Infura/Alchemy)
- [ ] `npx hardhat run scripts/deploy.ts --network sepolia`
- [ ] Update env: `NEXT_PUBLIC_CHAIN_ID=11155111`, `NEXT_PUBLIC_RPC_URL=https://...`
- [ ] Update `RPC_URL` server-side

---

## PHẦN 10 — Docker (bê sang máy khác chạy 1 lệnh)

> **Giới hạn:** Ganache + Next.js Docker hoá được hoàn toàn.
> MetaMask là browser extension — vẫn phải cài tay trên browser máy đích.
> Nhưng mọi thứ khác chỉ cần `docker compose up`.

### Lợi dụng địa chỉ contract cố định

Với `--deterministic` + deploy từ Account 0 nonce=0, contract address **luôn giống nhau**
dù trên máy nào, kể cả xoá Ganache data và deploy lại:

```
Deployer : 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (Account 0)
Contract : 0x5FbDB2315678afecb367f032d93F642f64180aa3   ← hardcode được
```

→ Hardcode vào `docker-compose.yml`, không cần tính động.

---

### 10.1 Cấu trúc file cần thêm

```
(root)
├── Dockerfile                  ← build Next.js app
├── docker-compose.yml          ← orchestrate tất cả
└── contracts/
    └── Dockerfile.deploy       ← compile + deploy Escrow.sol 1 lần
```

---

### 10.2 `contracts/Dockerfile.deploy`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx hardhat compile
# Deploy rồi exit — service chạy 1 lần, Docker Compose đánh dấu "completed"
CMD ["sh", "-c", "npx hardhat run scripts/deploy.ts --network ganache || true"]
```

Sửa `contracts/hardhat.config.ts` để nhận URL từ env (thay vì hardcode localhost):

```typescript
ganache: {
  url: process.env.GANACHE_URL ?? "http://127.0.0.1:8545",
  chainId: 1337,
  accounts: ["0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"]
},
```

---

### 10.3 `Dockerfile` (Next.js — standalone build)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Build args → baked vào bundle tại build time (NEXT_PUBLIC_*)
ARG NEXT_PUBLIC_CHAIN_ID=1337
ARG NEXT_PUBLIC_RPC_URL=http://localhost:8545
ARG NEXT_PUBLIC_ESCROW_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID
ENV NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL
ENV NEXT_PUBLIC_ESCROW_ADDRESS=$NEXT_PUBLIC_ESCROW_ADDRESS
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
```

> **Lưu ý `NEXT_PUBLIC_*`:** Các biến này được bake vào JS bundle lúc build, không thể
> truyền qua runtime env. Phải dùng `ARG` + `ENV` trong Dockerfile hoặc truyền khi
> `docker compose build`.

---

### 10.4 `docker-compose.yml`

```yaml
services:

  # ── 1. Ganache (Ethereum node cục bộ) ─────────────────────────────────────
  ganache:
    image: trufflesuite/ganache:latest
    ports:
      - "8545:8545"          # expose ra localhost để MetaMask kết nối
    command: >
      --deterministic
      --db /data
      --port 8545
      --chain.chainId 1337
    volumes:
      - ganache-data:/data
    healthcheck:
      test:
        - CMD
        - wget
        - -qO-
        - --post-data={"jsonrpc":"2.0","method":"net_version","params":[],"id":1}
        - --header=Content-Type:application/json
        - http://localhost:8545
      interval: 3s
      timeout: 5s
      retries: 15

  # ── 2. Deploy contract (chạy 1 lần, tự exit) ──────────────────────────────
  deploy:
    build:
      context: ./contracts
      dockerfile: Dockerfile.deploy
    depends_on:
      ganache:
        condition: service_healthy
    environment:
      - GANACHE_URL=http://ganache:8545
    restart: "no"            # không restart sau khi exit 0

  # ── 3. Next.js app ─────────────────────────────────────────────────────────
  app:
    build:
      context: .
      args:
        # NEXT_PUBLIC_* baked in lúc build — hardcode vì address cố định
        NEXT_PUBLIC_CHAIN_ID: "1337"
        NEXT_PUBLIC_RPC_URL: "http://localhost:8545"
        NEXT_PUBLIC_ESCROW_ADDRESS: "0x5FbDB2315678afecb367f032d93F642f64180aa3"
        NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    ports:
      - "3000:3000"
    depends_on:
      - deploy
    environment:
      # Server-side (không NEXT_PUBLIC_) — truyền runtime được
      RPC_URL: http://ganache:8545          # server → ganache qua Docker network
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}

volumes:
  ganache-data:              # persist Ganache state → restart không mất contract
```

> **Hai RPC URL khác nhau là đúng:**
> - `NEXT_PUBLIC_RPC_URL=http://localhost:8545` — browser/MetaMask dùng, trỏ ra host
> - `RPC_URL=http://ganache:8545` — server action dùng, trỏ vào Docker network

---

### 10.5 File `.env` (không commit, copy sang máy đích)

```env
NEXT_PUBLIC_SUPABASE_URL=https://abczykhuajletnaoynra.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Không cần `NEXT_PUBLIC_ESCROW_ADDRESS` hay `NEXT_PUBLIC_CHAIN_ID` trong `.env` vì
đã hardcode trong `docker-compose.yml`.

---

### 10.6 `next.config.ts` — bật standalone output

```typescript
const nextConfig = {
  output: "standalone",   // ← thêm dòng này
  // ... cấu hình khác
};
```

Không có `output: "standalone"`, file `server.js` sẽ không được tạo và Dockerfile sẽ lỗi.

---

### 10.7 Chạy trên máy mới

```powershell
# Cài Docker Desktop nếu chưa có: https://www.docker.com/products/docker-desktop

# Clone / copy project sang máy mới
# Copy file .env vào thư mục gốc

# Chạy tất cả (build + start):
docker compose up --build

# Lần sau (không cần build lại):
docker compose up
```

Output:
```
✅ ganache    | Listening on 127.0.0.1:8545
✅ deploy     | Escrow deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
✅ app        | Ready on http://localhost:3000
```

**Sau đó làm thêm 1 lần trên browser (mỗi máy mới):**
1. Cài MetaMask extension
2. Thêm mạng: RPC `http://127.0.0.1:8545`, Chain ID `1337`, Symbol `ETH`
3. Import Account 0 + Account 1 (private key từ Phần 3.1 ở trên)

---

### 10.8 Checklist Docker

- [ ] Thêm `output: "standalone"` vào `next.config.ts`
- [ ] Tạo `Dockerfile` (root)
- [ ] Tạo `contracts/Dockerfile.deploy`
- [ ] Tạo `docker-compose.yml`
- [ ] Tạo `.env` với Supabase keys (không commit)
- [ ] Sửa `contracts/hardhat.config.ts` đọc `GANACHE_URL` từ env
- [ ] Test local: `docker compose up --build`
- [ ] Verify: `http://localhost:3000` hoạt động, Ganache trả về balance

---

### 10.9 So sánh: Docker vs chạy thẳng

| | Docker Compose | Chạy thẳng (manual) |
|---|---|---|
| Lệnh khởi động | `docker compose up` | 3 terminal riêng |
| Cài đặt trên máy mới | Docker Desktop | Node, Ganache CLI, npm |
| Portable | Cao | Trung bình |
| Debug dễ | Logs gộp, khó isolate | Từng terminal riêng |
| Hot reload Next.js | Không (phải rebuild) | Có (`npm run dev`) |
| MetaMask | Vẫn cài tay | Vẫn cài tay |

> **Khuyến nghị:** Dùng Docker để **demo / chia sẻ**. Dùng chạy thẳng khi **đang develop**.

---

*Cập nhật: 2026-06-14*
