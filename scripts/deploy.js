const hre = require("hardhat");
const fs = require("fs"); // Import the Node.js File System module

async function main() {
  // 1. Deploy the contract as usual
  const MedicalRecords = await hre.ethers.getContractFactory("MedicalRecords");
  const medicalRecords = await MedicalRecords.deploy();
  await medicalRecords.waitForDeployment();

  const contractAddress = await medicalRecords.getAddress();
  console.log(`MedicalRecords contract deployed to: ${contractAddress}`);

  // 2. NEW: Save the contract's address and ABI to a new file
  saveFrontendFiles(contractAddress);
}

function saveFrontendFiles(contractAddress) {
  const contractsDir = __dirname + "/../src/contracts";

  // Create the directory if it doesn't exist
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  // Write the contract address to a JSON file
  fs.writeFileSync(
    contractsDir + "/contract-address.json",
    JSON.stringify({ MedicalRecords: contractAddress }, undefined, 2)
  );

  // Get the contract artifact and write the ABI to another JSON file
  const MedicalRecordsArtifact = hre.artifacts.readArtifactSync("MedicalRecords");
  fs.writeFileSync(
    contractsDir + "/MedicalRecords.json",
    JSON.stringify(MedicalRecordsArtifact, null, 2)
  );

  console.log("Frontend configuration files saved to /src/contracts");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
