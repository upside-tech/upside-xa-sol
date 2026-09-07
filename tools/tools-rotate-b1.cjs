const fs = require("fs");
const hre = require("hardhat");

async function main() {
  const lines = fs.readFileSync("C:/upside-xa/NEW-WALLET-DO-NOT-COMMIT.txt","utf8").split("\n");
  const newAddr = lines[0].replace("address=","").trim();
  const newKey  = lines[1].replace("key=","").trim();
  const [old] = await hre.ethers.getSigners();
  const newWallet = new hre.ethers.Wallet(newKey, hre.ethers.provider);
  if (newWallet.address.toLowerCase() !== newAddr.toLowerCase()) { console.error("ABORT: key/address mismatch in wallet file"); process.exit(1); }

  // 1. fund new from old
  console.log("Funding new wallet with 200...");
  await (await old.sendTransaction({ to: newAddr, value: hre.ethers.parseEther("200") })).wait();
  console.log("NEW balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(newAddr)));

  // 2. control test: NEW wallet signs its own transaction
  console.log("Control test: new wallet sends 1 back to old...");
  await (await newWallet.sendTransaction({ to: old.address, value: hre.ethers.parseEther("1") })).wait();
  console.log("CONTROL TEST PASSED: new wallet can sign and transact.");

  // 3. Governance registry state
  const gov = await hre.ethers.getContractAt("Governance", "0x63ba5830Cfd2a04CdAb800140905eE8eD70C0a51");
  console.log("Governance.issuanceContract =", await gov.issuanceContract());
  console.log("Governance.ideaStakingContract =", await gov.ideaStakingContract());
}
main().catch(e => { console.error("B1 FAILED:", e.message); process.exit(1); });
