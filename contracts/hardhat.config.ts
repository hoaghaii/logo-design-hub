import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    ganache: {
      url: process.env.GANACHE_URL ?? "http://127.0.0.1:7545",
      chainId: 1337,
      accounts: ["0x5e2dc86630cbd74453e7a2aef970873cd7aa7a728a4c873fa5253a710cac23fc"],
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL ?? "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
};

export default config;
