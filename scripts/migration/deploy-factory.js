const fs = require("fs");
const { ethers } = require("hardhat");
const { printBalance } = require("../utils");

const DEPLOYER_ADDRESS = "0x1a8a27A5AD3dE62719e65eEC79507218bF951E28";
const DEPLOYER_NONCE = "0";

const deployFactory = async () => {
  console.log("##################################################################");
  console.log("###################### Factory deployment #######################");
  console.log("##################################################################\n");

  const [deployer] = await ethers.getSigners();
  await printBalance(deployer);

  if ((await deployer.getNonce()).toString() != DEPLOYER_NONCE) {
    console.error("WRONG DEPLOYER NONCE: ", (await deployer.getNonce()).toString());
    return;
  }
  if ((await deployer.getAddress()).toString() != DEPLOYER_ADDRESS) {
    console.error("WRONG DEPLOYER ADDRESS");
    return;
  }

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
