const config = require("dotenv").config();
const fs = require("fs");
const { ethers, network } = require("hardhat");
const { printBalance, readJson } = require("../utils");
// const eth = require("ethereumjs-util");
// const rlp = require("rlp");
// const Web3 = require("web3");
const abiCoder = require("web3-eth-abi");

/** @var web3 {Web3} */

let tx;

async function bridgeInit(initialOwner, operatorAddress) {
  const methodId = abiCoder.encodeFunctionSignature("initialize(address)");
  const params = abiCoder.encodeParameters(["address"], [operatorAddress]);
  return methodId + params.substr(2);
}

/***************************************************
 ************ Implementation Deployment ************
 ***************************************************/

async function deployBridgeImpl() {
  const bridgeImplFactory = await ethers.deployContract("InceptionBridge");
  await bridgeImplFactory.waitForDeployment();

  const bridgeImplAddress = await bridgeImplFactory.getAddress();
  console.log(`Bridge Impl address: ${bridgeImplAddress}`);

  return bridgeImplAddress;
}

/******************************************
 ************ Proxy Deployment ************
 ******************************************/

async function deployBridge(implementationAddress, factoryAddress, notaryAddress) {
  if (implementationAddress == "") {
    console.error("implementation address is null");
  }
  if (factoryAddress == "") {
    console.error("factory address is null");
  }

  /// Init Factory
  const factory = await ethers.getContractAt("BridgeFactory", factoryAddress);

  /// Deploy ProxyAdmin
  const proxyAdmin = await ethers.deployContract("ProxyAdmin");
  await proxyAdmin.waitForDeployment();
  const proxyAdminAddress = await proxyAdmin.getAddress();
  console.log(`ProxyAdmin address: ${proxyAdminAddress}`);

  /// Deploy TransparentUpgradeableProxy
  const ProxyFactory = await ethers.getContractFactory("InitializableTransparentUpgradeableProxy");
  const proxyBytecode = ProxyFactory.bytecode;
  const proxyAddress = (await factory.getDeploymentCreate2Address(proxyBytecode, await deployer.getAddress())).toString();
  console.log(`Bridge Proxy address: ${proxyAddress}`);

  tx = await factory.deployCreate2(proxyBytecode);
  await tx.wait();

  const calldata = await bridgeInit(await deployer.getAddress(), notaryAddress);

  const bridgeProxy = ProxyFactory.attach(proxyAddress);
  tx = await bridgeProxy.initialize(implementationAddress, proxyAdminAddress, calldata);
  await tx.wait();

  return proxyAddress;
}

async function main() {
  const notaryAddress = config.parsed.NOTARY_ADDRESS;
  if (notaryAddress == "") {
    console.error("notary address is null");
  }

  [deployer] = await ethers.getSigners();
  await printBalance(deployer);

  /// 2. get the Factory address from config/addresses
  const factoryPath = `./config/addresses/factory/${network.name}.json`;
  const factoryAddress = (await readJson(factoryPath)).factoryAddress;
  if (factoryAddress == "") {
    console.error("factory address is null");
  }

  const bridgeImplAddress = await deployBridgeImpl();
  const bridgeProxyAddress = await deployBridge(bridgeImplAddress, factoryAddress, notaryAddress);

  // Save the Bridge Impl address
  const bridgeAddresses = {
    proxy: bridgeProxyAddress,
    bridgeImplAddress: bridgeImplAddress,
  };

  const json_addresses = JSON.stringify(bridgeAddresses);
  fs.writeFileSync(`./config/addresses/bridges/${network.name}.json`, json_addresses);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
