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
  const [old] = await hre.ethers.getSigners();
  const eq = (a,b) => a.toLowerCase() === b.toLowerCase();
  const get = (n) => hre.ethers.getContractAt(n, ADDR[n]);

  // safety: confirm expected starting state
  const gov = await get("Governance");
  if (!eq(await gov.admin(), old.address)) { console.error("ABORT: old wallet is not Governance admin"); process.exit(1); }

  // 1. oracle via Governance (propagates to Issuance + Staking)
  console.log("1. Governance.setOracle(new)...");
  await (await gov.setOracle(newAddr)).wait();
  const ri = await get("RewardIssuance"), st = await get("IdeaStaking");
  for (const [label, val] of [["Governance.oracle", await gov.oracle()],
                              ["RewardIssuance.oracle", await ri.oracle()],
                              ["IdeaStaking.oracle", await st.oracle()]]) {
    if (!eq(val, newAddr)) { console.error("ABORT: " + label + " = " + val); process.exit(1); }
    console.log("   OK " + label + " -> new");
  }

  // 2. transferAdmin on the four non-Governance admin contracts
  for (const name of ["UpsideToken","RewardIssuance","BurnMechanism","IdeaStaking"]) {
    console.log("2. " + name + ".transferAdmin(new)...");
    const c = await get(name);
    await (await c.transferAdmin(newAddr)).wait();
    const a = await c.admin();
    if (!eq(a, newAddr)) { console.error("ABORT: " + name + ".admin = " + a); process.exit(1); }
    console.log("   OK " + name + ".admin -> new");
  }

  // 3. Treasury signer swap
  console.log("3. Treasury.replaceSigner(old, new)...");
  const tr = await get("Treasury");
  await (await tr.replaceSigner(old.address, newAddr)).wait();
  if (!(await tr.isSigner(newAddr)) || (await tr.isSigner(old.address))) {
    console.error("ABORT: Treasury signer state wrong"); process.exit(1);
  }
  console.log("   OK Treasury signer old -> new");

  // 4. Governance LAST
  console.log("4. Governance.transferAdmin(new)...");
  await (await gov.transferAdmin(newAddr)).wait();
  const ga = await gov.admin();
  if (!eq(ga, newAddr)) { console.error("ABORT: Governance.admin = " + ga); process.exit(1); }
  console.log("   OK Governance.admin -> new");

  // 5. final survey
  console.log("\n=== FINAL STATE ===");
  for (const name of ["UpsideToken","RewardIssuance","BurnMechanism","IdeaStaking","Governance"]) {
    console.log(name + ".admin =", await (await get(name)).admin());
  }
  console.log("Governance.oracle =", await gov.oracle());
  console.log("RewardIssuance.oracle =", await ri.oracle());
  console.log("IdeaStaking.oracle =", await st.oracle());
  for (let i = 0; i < 3; i++) console.log("Treasury.signers[" + i + "] =", await tr.signers(i));
  console.log("Old wallet retains: gas balance only. ROTATION COMPLETE.");
}
main().catch(e => { console.error("B2 FAILED:", e.message); process.exit(1); });
