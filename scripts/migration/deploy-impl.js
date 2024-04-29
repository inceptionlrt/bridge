const fs = require("fs");
const { ethers, network } = require("hardhat");
const { printBalance } = require("../utils");

async function deployBridgeImpl() {
  [deployer] = await ethers.getSigners();
  await printBalance(deployer);

  const bridgeImplFactory = await ethers.deployContract("InceptionBridge");
  await bridgeImplFactory.waitForDeployment();

  const bridgeImplAddress = await bridgeImplFactory.getAddress();
  console.log(`Bridge factory address: ${bridgeImplAddress}`);

  /**
   * Save the Bridge Impl address
   */
  const bridgeAddresses = {
    bridgeImplAddress: bridgeImplAddress,
  };

  const json_addresses = JSON.stringify(bridgeAddresses);
  console.log(json_addresses);
  fs.writeFileSync(`./config/addresses/bridges/${network.name}.json`, json_addresses);
}

async function main() {
  await deployBridgeImpl();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
