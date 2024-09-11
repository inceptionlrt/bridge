import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log(`Deploying contracts with the account: ${deployer.address}`);

    // Use BigInt for balance calculations
    const initBalance: BigInt = BigInt(await deployer.provider!.getBalance(deployer.address));
    console.log("Account balance:", initBalance.toString());

    // 1. Deploy InceptionToken (InETH)
    const inETHFactory = await ethers.getContractFactory("MockInceptionToken");
    const inETH = await inETHFactory.deploy();
    await inETH.waitForDeployment();
    const inETHAddress = await inETH.getAddress();
    console.log(`InceptionToken deployed at: ${inETHAddress}`);

    // 2. Deploy TransactionStorage
    const TransactionStorageFactory = await ethers.getContractFactory("TransactionStorage");
    const TransactionStorage = await TransactionStorageFactory.deploy();
    await TransactionStorage.waitForDeployment();
    const transactionStorageAddress = await inETH.getAddress();
    console.log(`TransactionStorage deployed at: ${transactionStorageAddress}`);

    // 3. Deploy InceptionRatioFeed
    const ratioFeedFactory = await ethers.getContractFactory("InceptionRatioFeed");
    const ratioFeed = await ratioFeedFactory.deploy();
    await ratioFeed.waitForDeployment();
    const ratioFeedAddress = await ratioFeed.getAddress();
    console.log(`InceptionRatioFeed deployed at: ${ratioFeedAddress}`);

    // 4. Deploy RestakingPool
    const restakingPoolFactory = await ethers.getContractFactory("MockRestakingPool");
    const restakingPool = await restakingPoolFactory.deploy(inETHAddress, ratioFeedAddress);
    await restakingPool.waitForDeployment();
    const restakingPoolAddress = await restakingPool.getAddress();
    console.log(`RestakingPool deployed at: ${restakingPoolAddress}`);

    // 5. Deploy ArbCrossChainAdapter
    const adapterFactory = await ethers.getContractFactory("MockCrossChainAdapter");
    const crossChainAdapter = await adapterFactory.deploy(transactionStorageAddress, restakingPoolAddress);
    await crossChainAdapter.waitForDeployment();
    const crossChainAdapterAddress = await crossChainAdapter.getAddress();
    console.log(`ArbCrossChainAdapter deployed at: ${crossChainAdapterAddress}`);

    // 6. Deploy Lockbox
    const lockboxFactory = await ethers.getContractFactory("XERC20Lockbox");
    const lockbox = await lockboxFactory.deploy(inETHAddress, inETHAddress, false);
    await lockbox.waitForDeployment();
    const lockboxAddress = await lockbox.getAddress();
    console.log(`XERC20Lockbox deployed at: ${lockboxAddress}`);

    // 7. Update Ratio in InceptionRatioFeed to be less than 1
    const updateRatioThresholdTx = await ratioFeed.setRatioThreshold(10000000);
    await updateRatioThresholdTx.wait();
    const updateRatioTx = await ratioFeed.updateRatioBatch(
        [inETHAddress], // Array of token addresses
        [ethers.parseUnits("0.8", 18)] // New ratio - 0.8 InceptionTokens per 1 ETH
    );
    await updateRatioTx.wait();
    console.log("Updated the ratio for InceptionToken in InceptionRatioFeed");


    // 8. Deploy Rebalancer
    const rebalancerFactory = await ethers.getContractFactory("Rebalancer");
    const rebalancer = await rebalancerFactory.deploy(inETHAddress, lockboxAddress, restakingPoolAddress, transactionStorageAddress, ratioFeedAddress);
    await rebalancer.waitForDeployment();
    const rebalancerAddress = await rebalancer.getAddress();
    console.log(`Rebalancer deployed at: ${rebalancerAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
