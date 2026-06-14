import { ethers } from "ethers";
import EscrowABI from "./escrow-abi.json";

export const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ADDRESS ?? "";
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 1337);

/** Browser: wrap MetaMask signer in the Escrow contract. */
export function getEscrowContract(signer: ethers.Signer) {
  return new ethers.Contract(ESCROW_ADDRESS, EscrowABI, signer);
}

/** Server: read-only provider for verifying receipts on-chain. */
export function getServerProvider() {
  const url = process.env.RPC_URL;
  if (!url) throw new Error("RPC_URL env var not set");
  return new ethers.JsonRpcProvider(url);
}
