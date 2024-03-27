const fs = require("fs");
const { ethers } = require("hardhat");
const { printBalance } = require("../utils");

const DEPLOYER_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const DEPLOYER_NONCE = "59";

const deployFactory = async () => {
  console.log("##################################################################");
  console.log("###################### Factory deployment #######################");
  console.log("##################################################################\n");

  /**
   * PreDeployed Requirements
   */
  // let factoryAddress = (await alreadyDeployed(network, "BridgeFactory", "")).toString();
  // if (factoryAddress != "") {
  //   console.error("BRIDGE IS DEPLOYED");
  // }

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

  /// TODO
  const factory = await ethers.deployContract("BridgeFactory", { maxFeePerGas: "10934783720" });
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
