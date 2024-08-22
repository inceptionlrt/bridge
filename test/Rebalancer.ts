import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("Rebalancer and InETH Contracts", function () {
    async function deployContractsFixture() {
        // Get signers
        const [owner, addr1] = await hre.ethers.getSigners();

        // Deploy Rebalancer contract
        const RebalancerFactory = await hre.ethers.getContractFactory("Rebalancer");
        const rebalancer = await RebalancerFactory.deploy(owner.address);

        const rebalancerAddress = await rebalancer.getAddress();

        // Deploy InETH contract
        const InETHFactory = await hre.ethers.getContractFactory("InETH");
        const inETH = await InETHFactory.deploy(owner.address, rebalancerAddress);
        const inEthAddress = await inETH.getAddress();



        // Set InETH address in Rebalancer
        await rebalancer.setInETHAddress(inEthAddress);
        // Set Rebalancer address in InETH
        await inETH.setRebalancer(rebalancerAddress);

        return { inETH, rebalancer, owner };
    }

    describe("getRatio() Function", function () {
        it("Should return correct getRatio() when ETH = inETH", async function () {
            const { rebalancer } = await loadFixture(deployContractsFixture);
            const amount = hre.ethers.parseEther("1000");

            await rebalancer.mintAdmin(amount, amount);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt((BigInt(1000) * BigInt("1000000000000000000")) / BigInt(1000)));
        });

        it("Should return correct getRatio() when ETH > inETH", async function () {
            const { rebalancer } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("1500");
            const inEthAmount = hre.ethers.parseEther("1000");

            await rebalancer.mintAdmin(inEthAmount, ethAmount);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt((BigInt(1000) * BigInt("1000000000000000000")) / BigInt(1500)));
        });

        it("Should return correct getRatio() when ETH < inETH", async function () {
            const { rebalancer } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("1000");
            const inEthAmount = hre.ethers.parseEther("1500");

            await rebalancer.mintAdmin(inEthAmount, ethAmount);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt((BigInt(1500) * BigInt("1000000000000000000")) / BigInt(1000)));
        });

        it("Should return correct getRatio() when ETH >> inETH (much higher)", async function () {
            const { rebalancer } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("10000");
            const inEthAmount = hre.ethers.parseEther("100");

            await rebalancer.mintAdmin(inEthAmount, ethAmount);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt((BigInt(100) * BigInt("1000000000000000000")) / BigInt(10000)));
        });

        it("Should return correct getRatio() when ETH << inETH (much lower)", async function () {
            const { rebalancer } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("100");
            const inEthAmount = hre.ethers.parseEther("10000");

            await rebalancer.mintAdmin(inEthAmount, ethAmount);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt((BigInt(10000) * BigInt("1000000000000000000")) / BigInt(100)));
        });

        it("Should return correct getRatio() when ETH == 0 || inETH == 0", async function () {
            const { rebalancer } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("0");
            const inEthAmount = hre.ethers.parseEther("1000");

            await rebalancer.mintAdmin(inEthAmount, ethAmount);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt("1000000000000000000"));
        });

        it("Should return correct getRatio() when ETH == 0 && inETH == 0", async function () {
            const { rebalancer } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("0");
            const inEthAmount = hre.ethers.parseEther("0");

            await rebalancer.mintAdmin(inEthAmount, ethAmount);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt("1000000000000000000"));
        });
    });

    describe("updateTreasuryData() Function", function () {
        it("Should update treasury data when L1 ratio - L2 ratio is lower than MAX_DIFF", async function () {
            const { inETH, rebalancer } = await loadFixture(deployContractsFixture);

            const l1EthAmount = hre.ethers.parseEther("1000");
            const l1InEthAmount = hre.ethers.parseEther("1050"); // L1 ratio = 1050/1000 = 1.05
            await rebalancer.mintAdmin(l1InEthAmount, l1EthAmount);

            // Simulate L2 data with a slightly different ratio
            const l2EthAmount = hre.ethers.parseEther("1000");
            const l2InEthAmount = hre.ethers.parseEther("1030"); // L2 ratio = 1030/1000 = 1.03

            const currentTimestamp = await time.latest();  // Get the current block timestamp

            await rebalancer.receiveL2InfoOptimism(currentTimestamp, l2EthAmount, l2InEthAmount);
            await rebalancer.updateTreasuryData();

            const finalInEthBalance = await inETH.balanceOf(await rebalancer.getAddress());
            expect(finalInEthBalance).to.equal(l2InEthAmount);
        });

        it("Should update treasury data when L1 ratio - L2 ratio is higher than MAX_DIFF", async function () {
            const { rebalancer, inETH } = await loadFixture(deployContractsFixture);

            const l1EthAmount = hre.ethers.parseEther("1000");
            const l1InEthAmount = hre.ethers.parseEther("1000"); // L1 ratio = 1
            await rebalancer.mintAdmin(l1InEthAmount, l1EthAmount);

            // Simulate L2 data with a much different ratio
            const l2EthAmount = hre.ethers.parseEther("1000");
            const l2InEthAmount = hre.ethers.parseEther("1500"); // L2 ratio = 1.5

            const currentTimestamp = await time.latest();  // Get the current block timestamp

            await rebalancer.receiveL2InfoOptimism(currentTimestamp, l2EthAmount, l2InEthAmount);
            await expect(rebalancer.updateTreasuryData()).to.be.revertedWith("Ratio diff bigger than threshold");
        });

        it("Should correctly mint tokens when expected", async function () {
            const { rebalancer, inETH } = await loadFixture(deployContractsFixture);

            const l1EthAmount = hre.ethers.parseEther("1000");
            const l1InEthAmount = hre.ethers.parseEther("1000");
            await rebalancer.mintAdmin(l1InEthAmount, l1EthAmount);

            // Simulate L2 data where L2 has more inETH than L1
            const l2EthAmount = hre.ethers.parseEther("1000");
            const l2InEthAmount = hre.ethers.parseEther("1200");

            const currentTimestamp = await time.latest();  // Get the current block timestamp

            await rebalancer.receiveL2InfoOptimism(currentTimestamp, l2EthAmount, l2InEthAmount);
            await rebalancer.updateTreasuryData();

            const finalInEthBalance = await inETH.balanceOf(await rebalancer.getAddress());
            expect(finalInEthBalance).to.equal(l2InEthAmount);
        });

        it("Should correctly burn tokens when expected", async function () {
            const { rebalancer, inETH } = await loadFixture(deployContractsFixture);

            const l1EthAmount = hre.ethers.parseEther("1000");
            const l1InEthAmount = hre.ethers.parseEther("1200");
            await rebalancer.mintAdmin(l1InEthAmount, l1EthAmount);

            // Simulate L2 data where L2 has less inETH than L1
            const l2EthAmount = hre.ethers.parseEther("1000");
            const l2InEthAmount = hre.ethers.parseEther("1000");

            const currentTimestamp = await time.latest();  // Get the current block timestamp

            await rebalancer.receiveL2InfoOptimism(currentTimestamp, l2EthAmount, l2InEthAmount);
            await rebalancer.updateTreasuryData();

            const finalInEthBalance = await inETH.balanceOf(await rebalancer.getAddress());
            expect(finalInEthBalance).to.equal(l2InEthAmount);
        });

        it("Should not adjust token quantity when L1 and L2 data matches", async function () {
            const { rebalancer, inETH } = await loadFixture(deployContractsFixture);

            const l1EthAmount = hre.ethers.parseEther("1000");
            const l1InEthAmount = hre.ethers.parseEther("1000");
            await rebalancer.mintAdmin(l1InEthAmount, l1EthAmount);

            // Simulate L2 data that exactly matches L1
            const l2EthAmount = hre.ethers.parseEther("1000");
            const l2InEthAmount = hre.ethers.parseEther("1000");

            const currentTimestamp = await time.latest();  // Get the current block timestamp

            await rebalancer.receiveL2InfoOptimism(currentTimestamp, l2EthAmount, l2InEthAmount);
            await rebalancer.updateTreasuryData();

            const finalInEthBalance = await inETH.balanceOf(await rebalancer.getAddress());
            expect(finalInEthBalance).to.equal(l1InEthAmount);
        });
    });
});
