// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  // Get the ContractFactory for our "MedicalRecords" contract.
  // A ContractFactory in ethers.js is an abstraction used to deploy new smart contracts.
  const MedicalRecords = await hre.ethers.getContractFactory("MedicalRecords");

  // Deploy the contract. This sends a transaction to the network to create the contract.
  // The 'await' keyword waits for the deployment transaction to be sent.
  const medicalRecords = await MedicalRecords.deploy();

  // Wait until the contract is fully deployed and mined on the blockchain.
  // This is important because deployment is not instantaneous.
  await medicalRecords.waitForDeployment();

  // Once deployed, the contract will have a unique address on the blockchain.
  // We log this address to the console so we know where our contract is.
  console.log(
    `MedicalRecords contract deployed to: ${await medicalRecords.getAddress()}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
