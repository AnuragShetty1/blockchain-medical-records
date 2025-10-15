const { ethers, upgrades, artifacts } = require("hardhat");
const fs = require("fs");
const path = require("path");

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
  saveBackendFiles(contractAddress);
}

function saveFrontendFiles(contractAddress) {
  const contractsDir = path.join(__dirname, "/../src/contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    path.join(contractsDir, "/contract-address.json"),
    JSON.stringify({ MedicalRecords: contractAddress }, undefined, 2)
  );

  const MedicalRecordsArtifact = artifacts.readArtifactSync("MedicalRecords");
  fs.writeFileSync(
    path.join(contractsDir, "/MedicalRecords.json"),
    JSON.stringify(MedicalRecordsArtifact, null, 2)
  );

  console.log("Frontend configuration files saved to /src/contracts");
}

function saveBackendFiles(contractAddress) {
    const backendDir = path.join(__dirname, '/../backend');
    const envFilePath = path.join(backendDir, '.env');

    if (!fs.existsSync(backendDir)) {
        fs.mkdirSync(backendDir);
    }
    
    let envContent = {};

    // If .env file exists, read its contents
    if (fs.existsSync(envFilePath)) {
        const fileContent = fs.readFileSync(envFilePath, { encoding: 'utf8' });
        fileContent.split('\n').forEach(line => {
            if (line) {
                const [key, ...valueParts] = line.split('=');
                // Re-join value parts in case the value itself contains '='
                const value = valueParts.join('=');
                // Remove quotes if they exist
                envContent[key.trim()] = value.trim().replace(/^"(.*)"$/, '$1');
            }
        });
    }

    // Update or add the necessary variables
    envContent['CONTRACT_ADDRESS'] = contractAddress;
    envContent['PROVIDER_URL'] = "http://127.0.0.1:8545/";

    // Ensure placeholders exist if not already set
    if (!envContent['MONGO_URI']) {
        envContent['MONGO_URI'] = "mongodb://127.0.0.1:27017/medical_records_db";
    }
    if (!envContent['JWT_SECRET']) {
        envContent['JWT_SECRET'] = "YOUR_SUPER_SECRET_JWT_KEY";
    }

    // Format the content back to KEY="VALUE" strings
    const newEnvFileContent = Object.entries(envContent)
        .map(([key, value]) => `${key}="${value}"`)
        .join('\n');
    
    fs.writeFileSync(envFilePath, newEnvFileContent);

    console.log(`Backend .env file created/updated at ${envFilePath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
