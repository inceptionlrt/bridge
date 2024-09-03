import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("Rebalancer, InETH, CrossChainAdapter, Lockbox, and LiquidPool Contracts", function () {
    async function deployContractsFixture() {
        // Get signers
        const [owner] = await hre.ethers.getSigners();

        // Deploy Rebalancer contract
        const RebalancerFactory = await hre.ethers.getContractFactory("Rebalancer");
        const rebalancer = await RebalancerFactory.deploy(owner.address);

        const rebalancerAddress = await rebalancer.getAddress();

        // Deploy InETH contract
        const InETHFactory = await hre.ethers.getContractFactory("InETH");
        const inETH = await InETHFactory.deploy(owner.address, rebalancerAddress);
        const inEthAddress = await inETH.getAddress();



        // Deploy Lockbox contract
        const LockboxFactory = await hre.ethers.getContractFactory("Lockbox");
        const lockbox = await LockboxFactory.deploy(inEthAddress, owner.address);
        const lockboxAddress = await lockbox.getAddress();

        await inETH.setLockbox(lockboxAddress);

        // Deploy LiquidPool contract
        const LiquidPoolFactory = await hre.ethers.getContractFactory("LiquidPool");
        const liquidPool = await LiquidPoolFactory.deploy(rebalancerAddress, inEthAddress, owner.address);
        const liquidPoolAddress = await liquidPool.getAddress();

        // Set InETH address in Rebalancer
        await rebalancer.setInETHAddress(inEthAddress);

        // Set Rebalancer address in InETH
        await inETH.setRebalancer(rebalancerAddress);

        // Deploy CrossChainAdapter contract
        const CrossChainAdapterFactory = await hre.ethers.getContractFactory("CrossChainAdapter");
        const CrossChainAdapter = await CrossChainAdapterFactory.deploy(owner.address, liquidPoolAddress);
        const CrossChainAdapterAddress = await CrossChainAdapter.getAddress();

        // Set CrossChainAdapter address in Rebalancer
        await rebalancer.setCrossChainAdapter(CrossChainAdapterAddress);

        // Set Rebalancer address in CrossChainAdapter
        await CrossChainAdapter.setRebalancer(rebalancerAddress);

        // Set Lockbox address in Rebalancer
        await rebalancer.setLockboxAddress(lockboxAddress);

        // Set LiquidPool address in Rebalancer (if needed)
        await rebalancer.setLiqPool(liquidPoolAddress);

        return { inETH, rebalancer, CrossChainAdapter, lockbox, liquidPool, owner };
    }

    describe("getRatio() Function", function () {
        it("Should return correct getRatio() when ETH = inETH", async function () {
            const { rebalancer, liquidPool, inETH } = await loadFixture(deployContractsFixture);
            const amount = hre.ethers.parseEther("1000");

            await inETH.mint(amount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${amount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);

            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt((BigInt(1000) * BigInt("1000000000000000000")) / BigInt(1000)));
        });

        it("Should return correct getRatio() when ETH > inETH", async function () {
            const { rebalancer, liquidPool, inETH } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("1500");
            const inEthAmount = hre.ethers.parseEther("1000");

            await inETH.mint(inEthAmount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${ethAmount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);


            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt((BigInt(1000) * BigInt("1000000000000000000")) / BigInt(1500)));
        });

        it("Should return correct getRatio() when ETH < inETH", async function () {
            const { rebalancer, inETH, liquidPool } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("1000");
            const inEthAmount = hre.ethers.parseEther("1500");

            await inETH.mint(inEthAmount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${ethAmount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt((BigInt(1500) * BigInt("1000000000000000000")) / BigInt(1000)));
        });

        it("Should return correct getRatio() when ETH >> inETH (much higher)", async function () {
            const { rebalancer, inETH, liquidPool } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("10000");
            const inEthAmount = hre.ethers.parseEther("100");

            await inETH.mint(inEthAmount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${ethAmount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt((BigInt(100) * BigInt("1000000000000000000")) / BigInt(10000)));
        });

        it("Should return correct getRatio() when ETH << inETH (much lower)", async function () {
            const { rebalancer, inETH, liquidPool } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("100");
            const inEthAmount = hre.ethers.parseEther("10000");

            await inETH.mint(inEthAmount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${ethAmount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt((BigInt(10000) * BigInt("1000000000000000000")) / BigInt(100)));
        });

        it("Should return correct getRatio() when ETH == 0 || inETH == 0", async function () {
            const { rebalancer, inETH, liquidPool } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("0");
            const inEthAmount = hre.ethers.parseEther("1000");

            await inETH.mint(inEthAmount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${ethAmount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt("1000000000000000000"));
        });

        it("Should return correct getRatio() when ETH == 0 && inETH == 0", async function () {
            const { rebalancer, inETH, liquidPool } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("0");
            const inEthAmount = hre.ethers.parseEther("0");

            await inETH.mint(inEthAmount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${ethAmount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt("1000000000000000000"));
        });
    });

    describe("updateTreasuryData() Function", function () {
        it("Should update treasury data when L1 ratio - L2 ratio is lower than MAX_DIFF", async function () {
            const { inETH, rebalancer, CrossChainAdapter, lockbox, liquidPool } = await loadFixture(deployContractsFixture);

            const l1EthAmount = hre.ethers.parseEther("1000");
            const l1InEthAmount = hre.ethers.parseEther("1050"); // L1 ratio = 1050/1000 = 1.05
            await inETH.mint(l1InEthAmount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${l1EthAmount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);

            // Simulate L2 data with a slightly different ratio
            const l2EthAmount = hre.ethers.parseEther("1000");
            const l2InEthAmount = hre.ethers.parseEther("1030"); // L2 ratio = 1030/1000 = 1.03

            const currentTimestamp = await time.latest();  // Get the current block timestamp

            await CrossChainAdapter.receiveL2InfoOptimism(currentTimestamp, l2EthAmount, l2InEthAmount);
            await rebalancer.updateTreasuryData();

            const finalInEthBalance = await inETH.balanceOf(await lockbox.getAddress());
            expect(finalInEthBalance).to.equal(l2InEthAmount);
        });

        it("Should update treasury data when L1 ratio - L2 ratio is higher than MAX_DIFF", async function () {
            const { rebalancer, CrossChainAdapter, liquidPool, inETH } = await loadFixture(deployContractsFixture);

            const l1EthAmount = hre.ethers.parseEther("1000");
            const l1InEthAmount = hre.ethers.parseEther("1000"); // L1 ratio = 1

            await inETH.mint(l1InEthAmount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${l1EthAmount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);

            // Simulate L2 data with a much different ratio
            const l2EthAmount = hre.ethers.parseEther("1000");
            const l2InEthAmount = hre.ethers.parseEther("1500"); // L2 ratio = 1.5

            const currentTimestamp = await time.latest();  // Get the current block timestamp

            await CrossChainAdapter.receiveL2InfoOptimism(currentTimestamp, l2EthAmount, l2InEthAmount);
            await expect(rebalancer.updateTreasuryData()).to.be.revertedWith("Ratio diff bigger than threshold");
        });

        it("Should correctly mint tokens when expected", async function () {
            const { rebalancer, inETH, CrossChainAdapter, lockbox, liquidPool } = await loadFixture(deployContractsFixture);

            const l1EthAmount = hre.ethers.parseEther("1000");
            const l1InEthAmount = hre.ethers.parseEther("1199");
            await inETH.mint(l1InEthAmount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${l1EthAmount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);

            // Simulate L2 data where L2 has more inETH than L1
            const l2EthAmount = hre.ethers.parseEther("1000");
            const l2InEthAmount = hre.ethers.parseEther("1200");

            const currentTimestamp = await time.latest();  // Get the current block timestamp

            await CrossChainAdapter.receiveL2InfoOptimism(currentTimestamp, l2EthAmount, l2InEthAmount);
            await rebalancer.updateTreasuryData();

            const finalInEthBalance = await inETH.balanceOf(await lockbox.getAddress());
            expect(finalInEthBalance).to.equal(l2InEthAmount);
        });

        it("Should correctly burn tokens when expected", async function () {
            const { rebalancer, inETH, CrossChainAdapter, lockbox, liquidPool } = await loadFixture(deployContractsFixture);

            const l1EthAmount = hre.ethers.parseEther("1000");
            const l1InEthAmount = hre.ethers.parseEther("1001");
            await inETH.mint(l1InEthAmount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${l1EthAmount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);

            // Simulate L2 data where L2 has less inETH than L1
            const l2EthAmount = hre.ethers.parseEther("1000");
            const l2InEthAmount = hre.ethers.parseEther("1000");

            const currentTimestamp = await time.latest();  // Get the current block timestamp

            await CrossChainAdapter.receiveL2InfoOptimism(currentTimestamp, l2EthAmount, l2InEthAmount);
            await rebalancer.updateTreasuryData();

            const finalInEthBalance = await inETH.balanceOf(await lockbox.getAddress());
            expect(finalInEthBalance).to.equal(l2InEthAmount);
        });

        it("Should not adjust token quantity when L1 and L2 data matches", async function () {
            const { rebalancer, inETH, CrossChainAdapter, lockbox, liquidPool } = await loadFixture(deployContractsFixture);

            const l1EthAmount = hre.ethers.parseEther("1000");
            const l1InEthAmount = hre.ethers.parseEther("1000");
            await inETH.mint(l1InEthAmount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${l1EthAmount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);

            // Simulate L2 data that exactly matches L1
            const l2EthAmount = hre.ethers.parseEther("1000");
            const l2InEthAmount = hre.ethers.parseEther("1000");

            const currentTimestamp = await time.latest();  // Get the current block timestamp

            await CrossChainAdapter.receiveL2InfoOptimism(currentTimestamp, l2EthAmount, l2InEthAmount);
            await rebalancer.updateTreasuryData();

            const finalInEthBalance = await inETH.balanceOf(await lockbox.getAddress());
            expect(finalInEthBalance).to.equal(l1InEthAmount);
        });


    });

    describe("deposit() Function", function () {
        it("Should deposit ERC20 tokens into the lockbox", async function () {
            const { lockbox, inETH, owner } = await loadFixture(deployContractsFixture);

            const depositAmount = hre.ethers.parseEther("500");

            // Approve and deposit tokens to the lockbox
            await inETH.connect(owner).approve(lockbox.getAddress(), depositAmount);
            await lockbox.connect(owner).deposit(depositAmount);

            const finalBalance = await inETH.balanceOf(lockbox.getAddress());
            expect(finalBalance).to.equal(depositAmount);
        });

        it("Should revert if trying to deposit native token when not supported", async function () {
            const { lockbox, owner } = await loadFixture(deployContractsFixture);

            await expect(lockbox.connect(owner).depositNative({ value: hre.ethers.parseEther("1") })).to.be.revertedWith("Not Native Token");
        });
    });

    describe("getRatio() Function", function () {
        it("Should return correct getRatio() when ETH = inETH", async function () {
            const { rebalancer, liquidPool, inETH } = await loadFixture(deployContractsFixture);
            const amount = hre.ethers.parseEther("1000");

            await inETH.mint(amount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${amount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);

            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt((BigInt(1000) * BigInt("1000000000000000000")) / BigInt(1000)));
        });

        it("Should return correct getRatio() when ETH > inETH", async function () {
            const { rebalancer, liquidPool, inETH } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("1500");
            const inEthAmount = hre.ethers.parseEther("1000");

            await inETH.mint(inEthAmount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${ethAmount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);

            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt((BigInt(1000) * BigInt("1000000000000000000")) / BigInt(1500)));
        });

        it("Should return correct getRatio() when ETH < inETH", async function () {
            const { rebalancer, inETH, liquidPool } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("1000");
            const inEthAmount = hre.ethers.parseEther("1500");

            await inETH.mint(inEthAmount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${ethAmount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt((BigInt(1500) * BigInt("1000000000000000000")) / BigInt(1000)));
        });

        it("Should return correct getRatio() when ETH >> inETH (much higher)", async function () {
            const { rebalancer, inETH, liquidPool } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("10000");
            const inEthAmount = hre.ethers.parseEther("100");

            await inETH.mint(inEthAmount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${ethAmount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt((BigInt(100) * BigInt("1000000000000000000")) / BigInt(10000)));
        });

        it("Should return correct getRatio() when ETH << inETH (much lower)", async function () {
            const { rebalancer, inETH, liquidPool } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("100");
            const inEthAmount = hre.ethers.parseEther("10000");

            await inETH.mint(inEthAmount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${ethAmount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt((BigInt(10000) * BigInt("1000000000000000000")) / BigInt(100)));
        });

        it("Should return correct getRatio() when ETH == 0 || inETH == 0", async function () {
            const { rebalancer, inETH, liquidPool } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("0");
            const inEthAmount = hre.ethers.parseEther("1000");

            await inETH.mint(inEthAmount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${ethAmount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt("1000000000000000000"));
        });

        it("Should return correct getRatio() when ETH == 0 && inETH == 0", async function () {
            const { rebalancer, inETH, liquidPool } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("0");
            const inEthAmount = hre.ethers.parseEther("0");

            await inETH.mint(inEthAmount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${ethAmount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt("1000000000000000000"));
        });
    });

    describe("updateTreasuryData() Function", function () {
        it("Should update treasury data when L1 ratio - L2 ratio is lower than MAX_DIFF", async function () {
            const { inETH, rebalancer, CrossChainAdapter, lockbox, liquidPool } = await loadFixture(deployContractsFixture);

            const l1EthAmount = hre.ethers.parseEther("1000");
            const l1InEthAmount = hre.ethers.parseEther("1050"); // L1 ratio = 1050/1000 = 1.05
            await inETH.mint(l1InEthAmount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${l1EthAmount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);

            // Simulate L2 data with a slightly different ratio
            const l2EthAmount = hre.ethers.parseEther("1000");
            const l2InEthAmount = hre.ethers.parseEther("1030"); // L2 ratio = 1030/1000 = 1.03

            const currentTimestamp = await time.latest();  // Get the current block timestamp

            await CrossChainAdapter.receiveL2InfoOptimism(currentTimestamp, l2EthAmount, l2InEthAmount);
            await rebalancer.updateTreasuryData();

            const finalInEthBalance = await inETH.balanceOf(await lockbox.getAddress());
            expect(finalInEthBalance).to.equal(l2InEthAmount);
        });

        it("Should update treasury data when L1 ratio - L2 ratio is higher than MAX_DIFF", async function () {
            const { rebalancer, CrossChainAdapter, liquidPool, inETH } = await loadFixture(deployContractsFixture);

            const l1EthAmount = hre.ethers.parseEther("1000");
            const l1InEthAmount = hre.ethers.parseEther("1000"); // L1 ratio = 1

            await inETH.mint(l1InEthAmount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${l1EthAmount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);

            // Simulate L2 data with a much different ratio
            const l2EthAmount = hre.ethers.parseEther("1000");
            const l2InEthAmount = hre.ethers.parseEther("1500"); // L2 ratio = 1.5

            const currentTimestamp = await time.latest();  // Get the current block timestamp

            await CrossChainAdapter.receiveL2InfoOptimism(currentTimestamp, l2EthAmount, l2InEthAmount);
            await expect(rebalancer.updateTreasuryData()).to.be.revertedWith("Ratio diff bigger than threshold");
        });

        it("Should correctly mint tokens when expected", async function () {
            const { rebalancer, inETH, CrossChainAdapter, lockbox, liquidPool } = await loadFixture(deployContractsFixture);

            const l1EthAmount = hre.ethers.parseEther("1000");
            const l1InEthAmount = hre.ethers.parseEther("1199");
            await inETH.mint(l1InEthAmount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${l1EthAmount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);

            // Simulate L2 data where L2 has more inETH than L1
            const l2EthAmount = hre.ethers.parseEther("1000");
            const l2InEthAmount = hre.ethers.parseEther("1200");

            const currentTimestamp = await time.latest();  // Get the current block timestamp

            await CrossChainAdapter.receiveL2InfoOptimism(currentTimestamp, l2EthAmount, l2InEthAmount);
            await rebalancer.updateTreasuryData();

            const finalInEthBalance = await inETH.balanceOf(await lockbox.getAddress());
            expect(finalInEthBalance).to.equal(l2InEthAmount);
        });

        it("Should correctly burn tokens when expected", async function () {
            const { rebalancer, inETH, CrossChainAdapter, lockbox, liquidPool } = await loadFixture(deployContractsFixture);

            const l1EthAmount = hre.ethers.parseEther("1000");
            const l1InEthAmount = hre.ethers.parseEther("1001");
            await inETH.mint(l1InEthAmount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${l1EthAmount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);

            // Simulate L2 data where L2 has less inETH than L1
            const l2EthAmount = hre.ethers.parseEther("1000");
            const l2InEthAmount = hre.ethers.parseEther("1000");

            const currentTimestamp = await time.latest();  // Get the current block timestamp

            await CrossChainAdapter.receiveL2InfoOptimism(currentTimestamp, l2EthAmount, l2InEthAmount);
            await rebalancer.updateTreasuryData();

            const finalInEthBalance = await inETH.balanceOf(await lockbox.getAddress());
            expect(finalInEthBalance).to.equal(l2InEthAmount);
        });

        it("Should not adjust token quantity when L1 and L2 data matches", async function () {
            const { rebalancer, inETH, CrossChainAdapter, lockbox, liquidPool } = await loadFixture(deployContractsFixture);

            const l1EthAmount = hre.ethers.parseEther("1000");
            const l1InEthAmount = hre.ethers.parseEther("1000");
            await inETH.mint(l1InEthAmount);
            const liquidPoolAddr = await liquidPool.getAddress();

            // Convert amount to hex string
            const amountInHex = `0x${l1EthAmount.toString(16)}`;

            await hre.network.provider.send("hardhat_setBalance", [
                liquidPoolAddr,
                amountInHex,
            ]);

            // Simulate L2 data that exactly matches L1
            const l2EthAmount = hre.ethers.parseEther("1000");
            const l2InEthAmount = hre.ethers.parseEther("1000");

            const currentTimestamp = await time.latest();  // Get the current block timestamp

            await CrossChainAdapter.receiveL2InfoOptimism(currentTimestamp, l2EthAmount, l2InEthAmount);
            await rebalancer.updateTreasuryData();

            const finalInEthBalance = await inETH.balanceOf(await lockbox.getAddress());
            expect(finalInEthBalance).to.equal(l1InEthAmount);
        });
    });
});
