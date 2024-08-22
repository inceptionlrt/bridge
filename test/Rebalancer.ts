import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
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
});
