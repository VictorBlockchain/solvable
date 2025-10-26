const hre = require("hardhat")

async function main() {
  const { ethers, network } = hre
  // Use the provided private key explicitly on the selected network
  const privateKey = '0x728f315a9c0610b535b78fc4ae869c0effb74ab602e33621da73c01511f9137a'
  const deployer = new ethers.Wallet(privateKey, ethers.provider)
  const deployerAddress = await deployer.getAddress()

  console.log("Network:", network.name)
  console.log("Deploying Solvable with:", deployerAddress)

  const Solvable = await ethers.getContractFactory("Solvable", deployer)
  const contract = await Solvable.deploy(deployerAddress)
  await contract.waitForDeployment()

  const addr = await contract.getAddress()
  console.log("Solvable deployed at:", addr)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})