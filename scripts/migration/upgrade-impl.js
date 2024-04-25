const fs = require("fs");
const { ethers, network } = require("hardhat");
const { printBalance } = require("../utils");

const bridgeProxyAdminAddress = "";
const bridgeProxy = "";

async function deployBridgeImpl() {
  [deployer] = await ethers.getSigners();
  printBalance(deployer);

  const bridgeImplFactory = await ethers.deployContract("InceptionBridge");
  await bridgeImplFactory.waitForDeployment();

  const bridgeImplAddress = await bridgeImplFactory.getAddress();
  console.log(`Bridge factory address: ${bridgeImplAddress}`);

  const proxyAdmin = await ethers.getContractAt("ProxyAdmin", bridgeProxyAdminAddress);
  let tx = await proxyAdmin.upgrade(bridgeProxy, bridgeImplAddress);
  await tx.wait();
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
