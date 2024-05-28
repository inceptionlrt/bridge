const addressesPath = "./scripts/migration/addresses";
const { readJsonFiles } = require("./utils");

task("deploy-rate-provider", "Deploys a new RateProvider for a vault")
  .addParam("vault", "The name of the vault")
  .setAction(async (taskArgs) => {
    const inputVaultName = taskArgs["vault"];
    const vaults = await readJsonFiles(addressesPath);
    for (const [vaultName, vaultData] of vaults) {
      if (vaultName == inputVaultName) {
        const [factoryNameStr, vaultAddress] = await getRateProviderFactory(vaultName, vaultData);
        await deployRateProvider(factoryNameStr, vaultAddress);
      }
    }
  });

const deployRateProvider = async (factoryNameStr, vaultAddress) => {
  const RateProviderFactory = await hre.ethers.getContractFactory(factoryNameStr);
  const rateProvider = await RateProviderFactory.deploy(vaultAddress);
  await rateProvider.waitForDeployment();

  console.log("RateProvider address: ", (await rateProvider.getAddress()).toString());
};

const getRateProviderFactory = async (asset) => {
  let rateProviderFactory;
  switch (asset) {
    default:
      console.log("the asset is not supported");
  }
  return rateProviderFactory;
};
