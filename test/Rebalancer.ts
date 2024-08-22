import {
    time,
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("Rebalancer and InETH Contracts", function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deployContractsFixture() {
        // Get signers
        const [owner, addr1, addr2] = await hre.ethers.getSigners();

        // Deploy InETH contract
        const InETHFactory = await hre.ethers.getContractFactory("InETH");
        const inETH = await InETHFactory.deploy(owner.address, addr1.address);

        // Deploy Rebalancer contract
        const RebalancerFactory = await hre.ethers.getContractFactory("Rebalancer");
        const rebalancer = await RebalancerFactory.deploy(owner.address);

        // Set InETH address in Rebalancer
        await rebalancer.setInETHAddress(inETH.address);
        // Set Rebalancer address in InETH
        await inETH.setRebalancer(rebalancer.address);

        return { inETH, rebalancer, owner, addr1, addr2 };
    }

    describe("Deployment", function () {
        it("Should deploy both contracts correctly", async function () {
            const { inETH, rebalancer } = await loadFixture(deployContractsFixture);

            expect(inETH.address).to.properAddress;
            expect(rebalancer.address).to.properAddress;
        });


    });

    describe("getRatio() Function", function () {
        it("Should return correct getRatio() when ETH = inETH", async function () {
            const { rebalancer } = await loadFixture(deployContractsFixture);
            const amount = hre.ethers.parseEther("1000");

            await rebalancer.mintAdmin(amount, amount);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt(1e18)); // Ratio should be 1 (ETH/inETH = 1)
        });

        it("Should return correct getRatio() when ETH > inETH", async function () {
            const { rebalancer } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("1500");
            const inEthAmount = hre.ethers.parseEther("1000");

            await rebalancer.mintAdmin(inEthAmount, ethAmount);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt((1000n * 1e18n) / 1500n)); // Ratio should be < 1
        });

        it("Should return correct getRatio() when ETH < inETH", async function () {
            const { rebalancer } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("1000");
            const inEthAmount = hre.ethers.parseEther("1500");

            await rebalancer.mintAdmin(inEthAmount, ethAmount);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt((1500n * 1e18n) / 1000n)); // Ratio should be > 1
        });

        it("Should return correct getRatio() when ETH >> inETH (much higher)", async function () {
            const { rebalancer } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("10000");
            const inEthAmount = hre.ethers.parseEther("100");

            await rebalancer.mintAdmin(inEthAmount, ethAmount);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt((100n * 1e18n) / 10000n)); // Ratio should be much < 1
        });

        it("Should return correct getRatio() when ETH << inETH (much lower)", async function () {
            const { rebalancer } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("100");
            const inEthAmount = hre.ethers.parseEther("10000");

            await rebalancer.mintAdmin(inEthAmount, ethAmount);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt((10000n * 1e18n) / 100n)); // Ratio should be much > 1
        });

        it("Should return correct getRatio() when ETH == 0 || inETH == 0", async function () {
            const { rebalancer } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("0");
            const inEthAmount = hre.ethers.parseEther("1000");

            await rebalancer.mintAdmin(inEthAmount, ethAmount);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt(1e18)); // Ratio should be 1 (by default condition)
        });

        it("Should return correct getRatio() when ETH == 0 && inETH == 0", async function () {
            const { rebalancer } = await loadFixture(deployContractsFixture);
            const ethAmount = hre.ethers.parseEther("0");
            const inEthAmount = hre.ethers.parseEther("0");

            await rebalancer.mintAdmin(inEthAmount, ethAmount);
            const ratio = await rebalancer.getRatio();

            expect(ratio).to.equal(hre.ethers.toBigInt(1e18)); // Ratio should be 1 (by default condition)
        });
    });
});

