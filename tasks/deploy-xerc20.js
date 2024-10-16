const abiCoder = require("web3-eth-abi");
const XERC_TEMPLATE_PATH = "./tasks/templates/xerc20.json";

let factoryAddress, deployer;
let proxyAdminAddress = "0xCdD6b2e8E43c4281F99c44A316bACC3348A873A4";

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
  const xERC20Address = "0x157743261C3ba961e92421b268A881AeCe450d41";
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

async function lockboxCalldata(xerc20, base, native) {
  const methodId = abiCoder.encodeFunctionSignature("initialize(address,address,bool)");
  const params = abiCoder.encodeParameters(["address", "address", "bool"], [xerc20, base, native]);
  return methodId + params.substr(2);
}

async function deployLockBox(xERC20Address, baseTokenAddress) {
  console.log("... Deploying Lockbox ...");

  const lockboxImpAddr = "0x4C858892DEcbF31460603f4bFC4620C328047f37";
  const factory = await hre.ethers.getContractAt("BridgeFactory", factoryAddress);

  console.log(`ProxyAdmin address: ${proxyAdminAddress}`);

  const ProxyFactory = await ethers.getContractFactory("InitializableTransparentUpgradeableProxy");

  let LOCKBOXSALT = ethers.solidityPackedKeccak256(["address", "address", "address"], [xERC20Address, baseTokenAddress, await deployer.getAddress()]);
  let BYTECODE = ethers.solidityPacked(["bytes"], [ProxyFactory.bytecode]);

  let isNative = false;
  // let tx = await factory.deployCreate3(BYTECODE, LOCKBOXSALT);
  // const receipt = await tx.wait();
  // const event = receipt.logs.find((e) => e.eventName === "ContractCreated");

  console.log("Expected Address: " + "0xA6e46BE78064561d212ec61eB744D97c8FC0ac65");

  const calldata = await lockboxCalldata(xERC20Address, baseTokenAddress, isNative);
  const proxy = ProxyFactory.attach("0xA6e46BE78064561d212ec61eB744D97c8FC0ac65");
  tx = await proxy.initialize(lockboxImpAddr, proxyAdminAddress, calldata);
  await tx.wait();

  return "0xA6e46BE78064561d212ec61eB744D97c8FC0ac65";
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
  let originTokenAddress;
  if (hre.network.name == "ethereum") {
    originTokenAddress = config.parsed.ORIGIN_TOKEN_ADDRESS;
  }
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
 