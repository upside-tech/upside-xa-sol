const fs = require("fs");
const hre = require("hardhat");

const ADDR = {
  UpsideToken:   "0x07EBC3844482E9dAd93F8D20c6e50f0F92a7ec60",
  RewardIssuance:"0xc560ab28059Dc6Bb198cf34b8B94c29AE2EFD8F2",
  BurnMechanism: "0x54f2D2f6DD453FDcb619eD6D5B570aB279458123",
  IdeaStaking:   "0x94e136E6a9cBa5e6A218D83544471787069434B0",
  Governance:    "0x63ba5830Cfd2a04CdAb800140905eE8eD70C0a51",
  Treasury:      "0xB874A73442b07375618Fff97C3b06A6B66359a3b",
};

async function main() {
  const newAddr = fs.readFileSync("C:/upside-xa/NEW-WALLET-DO-NOT-COMMIT.txt","utf8")
                    .split("\n")[0].replace("address=","").trim();
  const [signer] = await hre.ethers.getSigners();
  const old = signer.address;
  console.log("OLD (current deployer):", old);
  console.log("NEW (rotation target): ", newAddr);

  const bal = async a => hre.ethers.formatEther(await hre.ethers.provider.getBalance(a));
  console.log("OLD balance:", await bal(old));
  console.log("NEW balance:", await bal(newAddr));

  for (const name of ["UpsideToken","RewardIssuance","BurnMechanism","IdeaStaking","Governance"]) {
    const c = await hre.ethers.getContractAt(name, ADDR[name]);
    console.log(name + ".admin =", await c.admin());
  }
  const gov = await hre.ethers.getContractAt("Governance", ADDR.Governance);
  console.log("Governance.oracle =", await gov.oracle());
  const ri = await hre.ethers.getContractAt("RewardIssuance", ADDR.RewardIssuance);
  console.log("RewardIssuance.oracle =", await ri.oracle());
  const st = await hre.ethers.getContractAt("IdeaStaking", ADDR.IdeaStaking);
  console.log("IdeaStaking.oracle =", await st.oracle());

  const tr = await hre.ethers.getContractAt("Treasury", ADDR.Treasury);
  for (let i = 0; i < 3; i++) console.log("Treasury.signers[" + i + "] =", await tr.signers(i));
}
main().catch(e => { console.error("SURVEY FAILED:", e.message); process.exit(1); });
