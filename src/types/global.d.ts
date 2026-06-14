// Ambient types for browser Ethereum provider (MetaMask / EIP-1193)
interface Window {
  ethereum?: import("ethers").Eip1193Provider & {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    on: (event: string, handler: (...args: unknown[]) => void) => void;
  };
}
