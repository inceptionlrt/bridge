const fs = require("fs");
const { ethers } = require("hardhat");
const { printBalance } = require("../utils");

const DEPLOYER_ADDRESS = "";
const DEPLOYER_NONCE = "";

const deployFactory = async () => {
  console.log("##################################################################");
  console.log("###################### Factory deployment #######################");
  console.log("##################################################################\n");

  const [deployer] = await ethers.getSigners();
  if ((await deployer.getNonce()).toString() != DEPLOYER_NONCE) {
    console.error("WRONG DEPLOYER NONCE");
    return;
  }
  if ((await deployer.getAddress()).toString() != DEPLOYER_ADDRESS) {
    console.error("WRONG DEPLOYER NONCE");
    return;
  }

  await printBalance(deployer);

  /**
   * Factory Deployment
   */

  const factory = await ethers.deployContract("BridgeFactory");
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log(`Bridge factory address: ${factoryAddress}`);

  /**
   * Save the Factory address
   */
  const factoryAddresses = {
    factoryAddress: factoryAddress,
  };

  const json_addresses = JSON.stringify(factoryAddresses);
  fs.writeFileSync(`./config/addresses/factory/${network.name}.json`, json_addresses);
};

async function main() {
  await deployFactory();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });