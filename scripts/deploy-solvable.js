const hre = require("hardhat")

async function main() {
  const { ethers } = hre
  const signers = await ethers.getSigners()
  const deployer = signers[1] // account #1 (second account)
  const deployerAddress = await deployer.getAddress()
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