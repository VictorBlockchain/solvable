const { HDNodeWallet } = require('ethers')

const phrase = 'test test test test test test test test test test test junk'

for (let i = 0; i < 5; i++) {
  const w = HDNodeWallet.fromPhrase(phrase, `m/44'/60'/0'/0/${i}`)
  console.log(`#${i}:`, w.address, w.privateKey)
}