const XERC_TEMPLATE_PATH = "./tasks/templates/xerc20.json";

let factoryAddress;

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
  console.log("xERC20 address: ", xERC20Address);

  if (deployCallData.homeChain) {
    const lockBoxAddress = await deployLockBox(xERC20Address, deployCallData.tokenAddress);
    console.log("Lockbox address: ", lockBoxAddress);
  }

  return xERC20Address;
};

async function deployXERC20(xERC20Config) {
  console.log("... Deploying of xERC20 token ...");
  const factory = await hre.ethers.getContractAt("IFactory", factoryAddress);

  const tx = await factory.deployXERC20(xERC20Config.tokenName, xERC20Config.tokenSymbol);
  const receipt = await tx.wait();
  let event = receipt.logs.find((e) => e.eventName === "XERC20Deployed");

  return event.args._xerc20;
}

async function deployLockBox(xERC20Address, baseTokenAddress) {
  console.log("... Deploying of Lockbox ...");
  const factory = await hre.ethers.getContractAt("IFactory", factoryAddress);

  let tx = await factory.deployLockbox(xERC20Address, baseTokenAddress, false);
  const receipt = await tx.wait();
  const event = receipt.logs.find((e) => e.eventName === "LockboxDeployed");

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
