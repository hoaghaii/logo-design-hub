import { ethers } from "hardhat";

async function main() {
  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy();
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log(`✅ Escrow deployed to: ${address}`);
  console.log(`\nAdd to .env.local:`);
  console.log(`NEXT_PUBLIC_ESCROW_ADDRESS=${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
