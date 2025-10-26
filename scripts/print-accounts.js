/* Print Hardhat local accounts with private keys */
/* eslint-disable @typescript-eslint/no-var-requires */
const hre = require("hardhat")

async function main() {
  const { ethers } = hre
  const signers = await ethers.getSigners()
  for (let i = 0; i < signers.length; i++) {
    const s = signers[i]
    const addr = await s.getAddress()
    const pk = s.privateKey || (s._signingKey ? s._signingKey().privateKey : undefined)
    console.log(`#${i}:`, addr, pk ? `pk=${pk}` : '')
  }
}

main().catch((e) => { console.error(e); process.exit(1) })