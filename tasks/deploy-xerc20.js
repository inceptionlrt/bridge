const fs = require("fs");
const configTemplate = require("./templates/deploy_template.json");

let factoryAddress;

task("deploy-xerc20", "")
  .addParam("execute", "whether deploy contracts or not (1/0)")
  .setAction(async (taskArgs) => {
    const execute = taskArgs["execute"];

    const factoryPath = `./config/addresses/factory/${network.name}.json`;
    factoryAddress = (await readConfig(factoryPath)).factoryAddress;
    if (factoryAddress.toString() == "") {
      console.error("factory address is null");
    }

    const deployData = await generateCalldata(configTemplate);
    if (execute == "0") {
      console.log(deployData);
    } else {
      await deploy(deployData);
    }
  });

const deploy = async (deployCallData) => {
  const xERC20Address = await deployXERC20(deployCallData);
  console.log("xERC20 address: ", xERC20Address);

  if (deployCallData.homeChain) {
    const lockBoxAddress = await deployLockBox(xERC20Address, deployCallData.tokenAddress);
    console.log("Lockbox address: ", lockBoxAddress);
  }
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

const generateCalldata = async (configFile) => {
  /// get token name and symbol
  let homeChain = false;
  try {
    const token = await hre.ethers.getContractAt("ERC20Mintable", configFile.originTokenAddress);
    await token.name();
    homeChain = true;
  } catch (err) {
    // get from the config file -> destinationChain
    homeChain = false;
  }

  return {
    homeChain: homeChain,
    tokenAddress: configFile.originTokenAddress,
    tokenName: configFile.tokenName,
    tokenSymbol: configFile.tokenSymbol,
  };
};

function readConfig(dirPath) {
  try {
    const fileContent = fs.readFileSync(dirPath, "utf8");
    const jsonData = JSON.parse(fileContent);
    return jsonData;
  } catch (error) {
    console.error("Error reading JSON files:", error);
  }

  return "";
}
