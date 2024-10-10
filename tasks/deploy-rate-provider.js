const fs = require("fs");

task("deploy-rate-provider", "Deploys a new RateProvider for an asset")
  .addParam("asset", "The name of the vault")
  .setAction(async (taskArgs) => {
    const assetName = taskArgs["asset"].toLowerCase();
    const networkName = network.name;

    const rateFactory = await getRateProviderFactory(assetName);
    if (rateFactory == "") {
      console.error("asset is not supported");
    }

    const { readJson } = require("../scripts/utils");
    const ratioFeedConfig = `./config/addresses/ratio_feeds/${networkName}.json`;
    const ratioFeedAddress = (await readJson(ratioFeedConfig)).ratioFeedAddress;
    if (ratioFeedAddress.toString() == "") {
      console.error("ratioFeed address is null");
    }

    const assetConfig = `./config/addresses/assets/${assetName.toLowerCase()}.json`;
    const assetAddresses = await readJson(assetConfig);
    const assetAddress = assetAddresses[networkName];
    if (assetAddress == undefined || assetAddress.toString() == "") {
      console.error("asset address is null");
    }

    await deployRateProvider(rateFactory, ratioFeedAddress, assetAddress);
  });

const deployRateProvider = async (factoryNameStr, ratioFeedAddress, assetAddress) => {
  const RateProviderFactory = await hre.ethers.getContractFactory(factoryNameStr);
  const rateProvider = await RateProviderFactory.deploy(ratioFeedAddress, assetAddress, { maxFeePerGas: "36216548370" });
  await rateProvider.waitForDeployment();

  const rateProviderAddress = (await rateProvider.getAddress()).toString();
  console.log(`RateProvider address: ${rateProviderAddress}`);

  // Save the RateProvider address
  const json_addresses = JSON.stringify({
    rateProviderAddress: rateProviderAddress,
  });
  fs.writeFileSync(`./config/addresses/rate_providers/${network.name}.json`, json_addresses);
};

const getRateProviderFactory = async (asset) => {
  switch (asset) {
    case "ineth":
      return "InETHRateProvider";
    case "insteth":
      return "InstETHRateProvider";
    case "ineigen":
      return "InEIGENRateProvider";
    case "insfrax":
      return "InsFRAXRateProvider";
    case "inslisbnb":
      return "InslisBNBRateProvider";
    case "intbtc":
      return "IntBTCBNBRateProvider";
    default:
      return "";
  }
};
