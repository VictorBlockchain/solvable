const { HDNodeWallet } = require("ethers")

async function main() {
  const phrase = "test test test test test test test test test test test junk"
  // account #1 (second account)
  const wallet = HDNodeWallet.fromPhrase(phrase, "m/44'/60'/0'/0/1")
  console.log("ADDRESS:", wallet.address)
  console.log("PRIVATE_KEY:", wallet.privateKey)
}

main()