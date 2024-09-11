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
    const transactionStorage = await TransactionStorageFactory.deploy();
    await transactionStorage.waitForDeployment();
    const transactionStorageAddress = await transactionStorage.getAddress();
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
    const rebalancer = await rebalancerFactory.deploy(
        inETHAddress,
        lockboxAddress,
        restakingPoolAddress,
        transactionStorageAddress,
        ratioFeedAddress
    );
    await rebalancer.waitForDeployment();
    const rebalancerAddress = await rebalancer.getAddress();
    console.log(`Rebalancer deployed at: ${rebalancerAddress}`);

    // 9. Assign the Rebalancer as a minter in the InceptionToken (InETH) contract
    console.log(`Assigning Rebalancer (${rebalancerAddress}) as a minter in InceptionToken...`);
    const assignMinterTx = await inETH.assignMinter(rebalancerAddress);
    await assignMinterTx.wait();
    console.log("Rebalancer assigned as minter in InceptionToken");

    // SCENARIO: Call TransactionStorage.handleL2Info() to update data
    console.log("Calling TransactionStorage.handleL2Info() with test data...");

    const chainId = 42161; // Example Chain ID (Arbitrum)
    const timestamp = Math.floor(Date.now() / 1000); // Current timestamp
    const balance = ethers.parseUnits("1000", 18); // Example balance: 1000 ETH
    const totalSupply = ethers.parseUnits("800", 18); // Example total supply: 800 InETH

    // Add the chainId to the TransactionStorage
    const addChainTx = await transactionStorage.addChainId(chainId);
    await addChainTx.wait();

    // Call handleL2Info with test data
    const handleL2InfoTx = await transactionStorage.handleL2Info(chainId, timestamp, balance, totalSupply);
    await handleL2InfoTx.wait();

    console.log("TransactionStorage.handleL2Info() called.");

    // Fetch the updated transaction data from storage
    const updatedTransaction = await transactionStorage.getTransactionData(chainId);

    // Log the updated data to the console for verification
    console.log("Updated Transaction Data:");
    console.log("Timestamp:", updatedTransaction.timestamp);
    console.log("ETH Balance:", ethers.formatUnits(updatedTransaction.ethBalance, 18));
    console.log("InETH Balance:", ethers.formatUnits(updatedTransaction.inEthBalance, 18));

    // Get initial InETH balance of the Lockbox before updating treasury data
    const initialLockboxInETHBalance = await inETH.balanceOf(lockboxAddress);
    console.log(`Initial Lockbox InETH Balance: ${ethers.formatUnits(initialLockboxInETHBalance, 18)} InETH`);

    // Call rebalancer.updateTreasuryData() to update the treasury and sync balances
    const updateTreasuryTx = await rebalancer.updateTreasuryData();
    await updateTreasuryTx.wait();
    console.log("Rebalancer.updateTreasuryData() called.");

    // Get the updated InETH balance of the Lockbox after calling updateTreasuryData()
    const updatedLockboxInETHBalance = await inETH.balanceOf(lockboxAddress);
    console.log(`Updated Lockbox InETH Balance: ${ethers.formatUnits(updatedLockboxInETHBalance, 18)} InETH`);

    // Print final balance, just in case
    const finalBalance: BigInt = BigInt(await deployer.provider!.getBalance(deployer.address));
    console.log(`Deployment completed. Gas spent: ${(initBalance - finalBalance).toString()}`);
} 

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
