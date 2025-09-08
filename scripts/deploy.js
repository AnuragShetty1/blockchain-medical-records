const { ethers, upgrades } = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const MedicalRecords = await ethers.getContractFactory("MedicalRecords");
  console.log("Deploying MedicalRecords (upgradeable)...");

  const medicalRecords = await upgrades.deployProxy(
    MedicalRecords,
    [deployer.address], // Pass the deployer's address to the initializer
    {
      initializer: "initialize",
      kind: "uups",
    }
  );

  await medicalRecords.waitForDeployment();
  const contractAddress = await medicalRecords.getAddress();
  console.log("MedicalRecords proxy deployed to:", contractAddress);

  saveFrontendFiles(contractAddress);
}

function saveFrontendFiles(contractAddress) {
  const contractsDir = __dirname + "/../src/contracts";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    contractsDir + "/contract-address.json",
    JSON.stringify({ MedicalRecords: contractAddress }, undefined, 2)
  );

  const MedicalRecordsArtifact = artifacts.readArtifactSync("MedicalRecords");
  fs.writeFileSync(
    contractsDir + "/MedicalRecords.json",
    JSON.stringify(MedicalRecordsArtifact, null, 2)
  );

  console.log("Frontend configuration files saved to /src/contracts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

