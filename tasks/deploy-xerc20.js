const abiCoder = require("web3-eth-abi");
const XERC_TEMPLATE_PATH = "./tasks/templates/xerc20.json";

let factoryAddress, deployer;
let proxyAdminAddress;

task("deploy-xerc20", "it deploys the set of XERC20 contracts")
  .addParam("execute", "whether deploy contracts or not (1 / 0)")
  .setAction(async (taskArgs) => {
    const { readJson } = require("../scripts/utils");

    const execute = taskArgs["execute"];

    const factoryPath = `./config/addresses/factory/${network.name}.json`;
    factoryAddress = (await readJson(factoryPath)).factoryAddress;
    if (factoryAddress.toString() == "") {
      console.error("factory address is null");
    }

    const bridgePath = `./config/addresses/bridges/${network.name}.json`;
    const bridgeAddress = (await readJson(bridgePath)).proxy;
    if (bridgeAddress.toString() == "") {
      console.error("bridge address is null");
    }

    [d] = await ethers.getSigners();
    deployer = d;

    const configTemplate = await readJson(XERC_TEMPLATE_PATH);
    const deployData = await generateCalldata(configTemplate);
    if (execute == "0") {
      console.log(deployData);
    } else {
      const xerc20Address = await deploy(deployData);
      await setAllowances(xerc20Address, bridgeAddress, configTemplate);
    }
  });

const deploy = async (deployCallData) => {
  const xERC20Address = await deployXERC20(deployCallData);
  console.log("xERC20 Address  : " + xERC20Address);

  if (deployCallData.homeChain) {
    const lockBoxAddress = await deployLockBox(xERC20Address, deployCallData.tokenAddress);
    console.log("Lockbox Address : " + lockBoxAddress);

    let xerc20 = await ethers.getContractAt("XERC20", xERC20Address);
    let tx = await xerc20.setLockbox(lockBoxAddress);
    await tx.wait();
    console.log("Lockbox is set");
  }

  return xERC20Address;
};

async function xERC20Calldata(name, symbol) {
  const methodId = abiCoder.encodeFunctionSignature("initialize(string,string,address)");
  const params = abiCoder.encodeParameters(["string", "string", "address"], [name, symbol, factoryAddress]);
  return methodId + params.substr(2);
}

async function lockboxCalldata(xerc20, base, native) {
  const methodId = abiCoder.encodeFunctionSignature("initialize(address,address,bool)");
  const params = abiCoder.encodeParameters(["address", "address", "bool"], [xerc20, base, native]);
  return methodId + params.substr(2);
}

async function deployXERC20Imp() {
  const xERC20ImplFactory = await ethers.deployContract("XERC20");
  await xERC20ImplFactory.waitForDeployment();

  const xERC20ImplAddress = await xERC20ImplFactory.getAddress();
  console.log(`XERC20 Impl address: ${xERC20ImplAddress}`);

  return xERC20ImplAddress;
}

async function deployLockboxImp() {
  const lockboxImplFactory = await ethers.deployContract("XERC20Lockbox");
  await lockboxImplFactory.waitForDeployment();

  const lockboxImplAddress = await lockboxImplFactory.getAddress();
  console.log(`Lockbox Impl address: ${lockboxImplAddress}`);

  return lockboxImplAddress;
}

async function deployXERC20(xERC20Config) {
  console.log("... Deploying xERC20 token ...");

  const xERC20ImpAddr = await deployXERC20Imp();
  const factory = await hre.ethers.getContractAt("BridgeFactory", factoryAddress);

  const proxyAdmin = await ethers.deployContract("ProxyAdmin");
  await proxyAdmin.waitForDeployment();
  proxyAdminAddress = await proxyAdmin.getAddress();
  console.log(`ProxyAdmin address: ${proxyAdminAddress}`);

  const ProxyFactory = await ethers.getContractFactory("InitializableTransparentUpgradeableProxy");

  let tx = await factory.deployXERC20(xERC20Config.tokenName, xERC20Config.tokenSymbol);
  const receipt = await tx.wait();
  let event = receipt.logs.find((e) => e.eventName === "XERC20Deployed");

  let xERC20Address = await factory.getDeploymentCreate3XERC20Address(xERC20Config.tokenName, xERC20Config.tokenSymbol, deployer.getAddress());
  console.log("Expected Address: " + xERC20Address);

  const calldata = await xERC20Calldata(xERC20Config.tokenName, xERC20Config.tokenSymbol)
  const proxy = ProxyFactory.attach(xERC20Address);
  tx = await proxy.initialize(xERC20ImpAddr, proxyAdminAddress, calldata);
  await tx.wait();

  return event.args._xerc20;
}

async function deployLockBox(xERC20Address,baseTokenAddress) {
  console.log("... Deploying Lockbox ...");

  const lockboxImpAddr = await deployLockboxImp();
  const factory = await hre.ethers.getContractAt("BridgeFactory", factoryAddress);

  // const proxyAdmin = await ethers.deployContract("ProxyAdmin");
  // await proxyAdmin.waitForDeployment();
  // const proxyAdminAddress = await proxyAdmin.getAddress();
  console.log(`ProxyAdmin address: ${proxyAdminAddress}`);

  const ProxyFactory = await ethers.getContractFactory("InitializableTransparentUpgradeableProxy");

  let isNative = false;
  let tx = await factory.deployLockbox(xERC20Address, baseTokenAddress, isNative);
  const receipt = await tx.wait();
  const event = receipt.logs.find((e) => e.eventName === "LockboxDeployed");

  let lockboxAddress = await factory.getDeploymentCreate3LockboxAddress(xERC20Address, baseTokenAddress, deployer.getAddress());
  console.log("Expected Address: " + lockboxAddress);

  const calldata = await lockboxCalldata(xERC20Address, baseTokenAddress, isNative);
  const proxy = ProxyFactory.attach(lockboxAddress);
  tx = await proxy.initialize(lockboxImpAddr, proxyAdminAddress, calldata);
  await tx.wait();

  return event.args._lockbox;
}

async function setAllowances(xerc20Address, bridgeAddress, config) {
  console.log("... Setting allowances ...");
  const xerc20 = await hre.ethers.getContractAt("XERC20", xerc20Address);
  if (config.mintingAllowances == "" || config.mintingAllowances == "0") {
    console.log("allowances are null");
    return;
  }
  if (config.burningAllowances == "" || config.burningAllowances == "0") {
    console.log("allowances are null");
    return;
  }

  let tx = await xerc20.setBridgeLimits(bridgeAddress, config.mintingAllowances, config.burningAllowances);
  await tx.wait();
  console.log("Success");
}

const generateCalldata = async (configFile) => {
  const config = require("dotenv").config();
  const originTokenAddress = config.parsed.ORIGIN_TOKEN_ADDRESS;
  if (originTokenAddress == "") {
    console.error("origin token address is null");
  }
  /// get token name and symbol
  let homeChain = false;
  try {
    const token = await hre.ethers.getContractAt("ERC20Mintable", originTokenAddress);
    await token.name();
    homeChain = true;
  } catch (err) {
    // get from the config file -> destinationChain
    homeChain = false;
  }

  return {
    homeChain: homeChain,
    tokenAddress: originTokenAddress,
    tokenName: configFile.tokenName,
    tokenSymbol: configFile.tokenSymbol,
  };
};
