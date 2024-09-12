import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { log } from "console";
import hre from "hardhat";
import { ethers, network } from "hardhat";
const config = require("../hardhat.config");

describe("Rebalancer, InETH, crossChainAdapter, Lockbox, and LiquidPool Contracts", function () {
    async function deployContractsFixture() {

        const block = await ethers.provider.getBlock("latest");
        console.log(`Starting at block number: ${block.number}`);
        console.log("... Initialization of Inception ....");
        // Get signers
        const [owner] = await ethers.getSigners();

        // Deploy InETH contract
        const InETHFactory = await ethers.getContractFactory("MockInceptionToken");
        const inETH = await InETHFactory.deploy();
        const inETHAddress = await inETH.getAddress();

        // Deploy TxStorage contract
        const transactionStorageFactory = await ethers.getContractFactory("TransactionStorage");
        const transactionStorage = await transactionStorageFactory.deploy();
        const transactionStorageAddress = await transactionStorage.getAddress();

        // Deploy InceptionRatioFeed
        const ratioFeedFactory = await ethers.getContractFactory("InceptionRatioFeed");
        const ratioFeed = await ratioFeedFactory.deploy();
        await ratioFeed.waitForDeployment();
        const ratioFeedAddress = await ratioFeed.getAddress();

        // Deploy RestakingPool mock
        const restakingPoolFactory = await ethers.getContractFactory("MockRestakingPool");
        const restakingPool = await restakingPoolFactory.deploy(inETHAddress, ratioFeedAddress);
        await restakingPool.waitForDeployment();
        const restakingPoolAddress = await restakingPool.getAddress();

        // Deploy ArbcrossChainAdapter
        const adapterFactory = await ethers.getContractFactory("MockCrossChainAdapter");
        const crossChainAdapter = await adapterFactory.deploy(transactionStorageAddress, restakingPoolAddress);
        await crossChainAdapter.waitForDeployment();
        const crossChainAdapterAddress = await crossChainAdapter.getAddress();

        // Deploy Lockbox
        const lockboxFactory = await ethers.getContractFactory("XERC20Lockbox");
        const lockbox = await lockboxFactory.deploy(inETHAddress, inETHAddress, false);
        await lockbox.waitForDeployment();
        const lockboxAddress = await lockbox.getAddress();

        // Update Ratio in InceptionRatioFeed to be less than 1
        const updateRatioThresholdTx = await ratioFeed.setRatioThreshold(10000000);
        await updateRatioThresholdTx.wait();
        const updateRatioTx = await ratioFeed.updateRatioBatch(
            [inETHAddress], // Array of token addresses
            [ethers.parseUnits("0.8", 18)] // New ratio - 0.8 InceptionTokens per 1 ETH
        );
        await updateRatioTx.wait();

        // Deploy Rebalancer
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

        // Assign the Rebalancer as a minter in the InceptionToken (InETH) contract
        const assignMinterTx = await inETH.assignMinter(rebalancerAddress);
        await assignMinterTx.wait();

        return { inETH, rebalancer, crossChainAdapter, lockbox, restakingPool, transactionStorage, owner };
    }

    describe("updateTreasuryData() Function", function () {
        it.only("Should update treasury data when L1 ratio - L2 ratio is lower than MAX_DIFF", async function () {

            const { inETH, rebalancer, transactionStorage, lockbox } = await loadFixture(deployContractsFixture);
            const lockboxAddress = await lockbox.getAddress();

            const block = await ethers.provider.getBlock("latest");
            const chainId = 42161; // Example Chain ID (Arbitrum)
            const timestamp = block.timestamp - 10000000; // Timestamp needs to be in the past
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
            const expectedLockboxBalance = ethers.parseUnits("800");
            expect(updatedLockboxInETHBalance).to.be.eq(expectedLockboxBalance);

            console.log("end!");
        });


    });


});
