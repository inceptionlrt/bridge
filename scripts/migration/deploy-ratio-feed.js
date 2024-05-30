const fs = require("fs");
const config = require("dotenv").config();
const { ethers } = require("hardhat");
const { printBalance } = require("../utils");

const INIT_THRESHOLD = "80000";

const deployRatioFeed = async () => {
  console.log("###################################################################");
  console.log("###################### RatioFeed deployment #######################");
  console.log("###################################################################\n");

  const operatorAddress = config.parsed.OPERATOR_ADDRESS;
  if (operatorAddress == "") {
    console.error("operator address is null");
  }

  const [deployer] = await ethers.getSigners();
  await printBalance(deployer);

  const InceptionRatioFeedFactory = await hre.ethers.getContractFactory("InceptionRatioFeed");
  const ratioFeed = await upgrades.deployProxy(InceptionRatioFeedFactory, [operatorAddress], { kind: "transparent" });
  await ratioFeed.waitForDeployment();
  const ratioFeedAddress = await ratioFeed.getAddress();
  console.log(`InceptionRatioFeed address: ${ratioFeedAddress}\n`);

  // set the init ratio threshold
  await ratioFeed.setRatioThreshold(INIT_THRESHOLD);

  // Save the RatioFeed address
  const ratioFeedConfig = {
    ratioFeedAddress: ratioFeedAddress,
  };

  const json_addresses = JSON.stringify(ratioFeedConfig);
  fs.writeFileSync(`./config/addresses/ratio_feeds/${network.name}.json`, json_addresses);
};

async function main() {
  await deployRatioFeed();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
