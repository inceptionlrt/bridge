const { ethers, upgrades, network } = require("hardhat");
const { time, takeSnapshot } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const web3x = require("web3");
const { encodeTransactionReceipt, encodeProof, randBigInt } = require("./helpers/bridge_utils");
const { signMessageUsingPrivateKey } = require("./helpers/evm_utils");
const { parseEther } = require("ethers");

// Constants
const CHAIN_ID = "31337";

// Addresses
var deployer, consensus, treasury, signer1, signer2;
// Protocol Contracts
var bridge1, bridge2, bridge3, bridgeFactory;
var token1, token2, token3, tokenFactory;
var tx, receipt;

async function initIBridge() {
  [deployer, consensus, treasury, signer1, signer2] = await ethers.getSigners();

  //Tokens
  tokenFactory = await ethers.getContractFactory("XERC20");
  console.log("=== Token1");
  token1 = await upgrades.deployProxy(tokenFactory, ["Token_1", "XERC20_1"], { initializer: "initialize" });
  await token1.waitForDeployment();
  console.log("=== Token2");
  token2 = await upgrades.deployProxy(tokenFactory, ["Token_2", "XERC20_2"], { initializer: "initialize" });
  await token2.waitForDeployment();
  console.log("=== Token3");
  token3 = await upgrades.deployProxy(tokenFactory, ["Token_3", "XERC20_3"], { initializer: "initialize" });
  await token3.waitForDeployment();

  //Bridge
  console.log("=== Bridge1");
  bridgeFactory = await ethers.getContractFactory("InceptionBridge");
  bridge1 = await upgrades.deployProxy(bridgeFactory, [await deployer.getAddress(), consensus.address], { initializer: "initialize" });
  await bridge1.waitForDeployment();
  console.log("=== Bridge2");
  bridge2 = await upgrades.deployProxy(bridgeFactory, [await deployer.getAddress(), consensus.address], { initializer: "initialize" });
  await bridge2.waitForDeployment();
  console.log("=== Bridge3");
  bridge3 = await upgrades.deployProxy(bridgeFactory, [await deployer.getAddress(), consensus.address], { initializer: "initialize" });
  await bridge3.waitForDeployment();

  //Connect bridges
  await bridge1.addBridge(await bridge2.getAddress(), CHAIN_ID);
  await bridge2.addBridge(await bridge1.getAddress(), CHAIN_ID);
  await bridge1.addDestination(await token1.getAddress(), CHAIN_ID, await token2.getAddress());
  await bridge2.addDestination(await token2.getAddress(), CHAIN_ID, await token1.getAddress());
  await token1.rely(await bridge1.getAddress());
  await token2.rely(await bridge2.getAddress());
  await token3.rely(await bridge3.getAddress());

  //Set default capacities
  await bridge1.setShortCap(await token1.getAddress(), ethers.parseEther("1000"));
  await bridge1.setLongCap(await token1.getAddress(), ethers.parseEther("1000"));
  await bridge2.setShortCap(await token2.getAddress(), ethers.parseEther("1000"));
  await bridge2.setLongCap(await token2.getAddress(), ethers.parseEther("1000"));
  await bridge3.setShortCap(await token3.getAddress(), ethers.parseEther("1000"));
  await bridge3.setLongCap(await token3.getAddress(), ethers.parseEther("1000"));

  await token1.connect(deployer).mint(signer1.address, ethers.parseEther("100"));
  await token1.connect(signer1).approve(await bridge1.getAddress(), ethers.parseEther("1000"));
  await token1.connect(signer2).approve(await bridge1.getAddress(), ethers.parseEther("1000"));
}

describe("InceptionBridge", function () {
  this.timeout(15000);

  let snapshot;
  before(async function () {
    await initIBridge();
    snapshot = await takeSnapshot();
  })

  describe("Bridge", function() {

    describe("From one chain to another", function() {
      before(async function() {
        await snapshot.restore();
      });

      const args= [
        {
          name: "from token1 to token2",
          fromToken: () => token1,
          fromBridge: () => bridge1,
          toToken: () => token2,
          toBridge: () => bridge2,
          sender: () => signer1,
          recipient: () => signer2,
        },
        {
          name: "from token2 to token1",
          fromToken: () => token2,
          fromBridge: () => bridge2,
          toToken: () => token1,
          toBridge: () => bridge1,
          sender: () => signer2,
          recipient: () => signer1,
        },
      ]

      let amount;
      args.forEach(function(arg) {
        it(`Deposit ${arg.name}`, async function() {
          amount = parseEther("10");
          const fromToken = arg.fromToken();
          const toToken = arg.toToken();
          const fromBridge = arg.fromBridge();
          const sender = arg.sender();
          const recipient = arg.recipient();

          await fromToken.connect(sender).approve(await fromBridge.getAddress(), amount);
          const senderBalanceBefore = await fromToken.balanceOf(sender);
          const totalSupplyBefore = await fromToken.totalSupply();

          let tx1 = await fromBridge.connect(sender).deposit(await fromToken.getAddress(), CHAIN_ID, recipient, amount);
          receipt = await tx1.wait();
          const event = receipt.logs.find((e) => e.eventName === "Deposited");
          expect(event.args["destinationChain"]).to.be.eq(CHAIN_ID);
          expect(event.args["sender"]).to.be.eq(sender.address);
          expect(event.args["receiver"]).to.be.eq(recipient.address);
          expect(event.args["fromToken"]).to.be.eq(await fromToken.getAddress());
          expect(event.args["toToken"]).to.be.eq(await toToken.getAddress());
          expect(event.args["amount"]).to.be.eq(amount);
          expect(event.args["metadata"].name).to.be.eq(ethers.encodeBytes32String(await fromToken.name()));
          expect(event.args["metadata"].symbol).to.be.eq(ethers.encodeBytes32String(await fromToken.symbol()));
          expect(event.args["metadata"].originChain).to.be.eq(0);
          expect(event.args["metadata"].originAddress).to.be.eq(ethers.ZeroAddress);

          const senderBalanceAfter = await fromToken.balanceOf(sender);
          const totalSupplyAfter = await fromToken.totalSupply();
          expect(senderBalanceBefore - senderBalanceAfter).to.be.eq(amount);
          expect(totalSupplyBefore - totalSupplyAfter).to.be.eq(amount);
        });

        it(`Withdraw ${arg.name}`, async function () {
          // Process proofs
          const fromToken = arg.fromToken();
          const toToken = arg.toToken();
          const toBridge = arg.toBridge();
          const sender = arg.sender();
          const recipient = arg.recipient();

          const [encodedProof, rawReceipt, proofSignature, proofHash, receiptHash] = generateWithdrawalData(consensus, receipt);
          const recipientBalanceBefore = await toToken.balanceOf(recipient);
          const totalSupplyBefore = await toToken.totalSupply();

          let tx2 = await toBridge.connect(recipient).withdraw(encodedProof, rawReceipt, proofSignature);
          receipt = await tx2.wait();
          const event = receipt.logs.find((e) => e.eventName === "Withdrawn");
          expect(event.args["receiptHash"]).to.be.eq(receiptHash);
          expect(event.args["sender"]).to.be.eq(sender.address);
          expect(event.args["receiver"]).to.be.eq(recipient.address);
          expect(event.args["fromToken"]).to.be.eq(await fromToken.getAddress());
          expect(event.args["toToken"]).to.be.eq(await toToken.getAddress());
          expect(event.args["amount"]).to.be.eq(amount);

          const recipientBalanceAfter = await toToken.balanceOf(recipient);
          const totalSupplyAfter = await toToken.totalSupply();
          expect(recipientBalanceAfter - recipientBalanceBefore).to.be.eq(amount);
          expect(totalSupplyAfter - totalSupplyBefore).to.be.eq(amount);
        });
      })
    })

    describe("Deposit negative cases", function() {
      before(async function() {
        await snapshot.restore();
      });

      it("deposit: reverts when fromToken not supported", async function() {
        const amount = parseEther("10");
        await token3.connect(signer1).approve(await bridge1.getAddress(), amount);

        await expect(bridge1.connect(signer1).deposit(await token3.getAddress(), CHAIN_ID, signer2.address, amount))
          .to.be.revertedWithCustomError(bridge1, "UnknownDestinationChain");
      });

      it("deposit: reverts when destination chain not supported", async function() {
        const amount = parseEther("10");
        await token1.connect(signer1).approve(await bridge1.getAddress(), amount);

        await expect(bridge1.connect(signer1).deposit(await token1.getAddress(), 666, signer2.address, amount))
          .to.be.revertedWithCustomError(bridge1, "UnknownDestinationChain");
      });

      it("deposit: reverts when paused", async function() {
        await bridge1.pause();
        const amount = parseEther("10");
        await expect(bridge1.connect(signer1).deposit(await token1.getAddress(), CHAIN_ID, signer2, amount))
          .to.be.revertedWithCustomError(bridge1, "EnforcedPause");
      });
    })

    describe("Withdraw negative cases", function() {
      beforeEach(async function() {
        await snapshot.restore();
      });

      it("withdraw: reverts when chain is wrong", async function() {
        await bridge1.addBridge(await bridge3.getAddress(), 666);
        await bridge1.addDestination(await token1.getAddress(), 666, await token2.getAddress());

        const amount = parseEther("1");
        await token1.connect(signer1).approve(await bridge1.getAddress(), amount);

        let tx1 = await bridge1.connect(signer1).deposit(await token1.getAddress(), 666, signer2.address, amount);
        receipt = await tx1.wait();

        const [encodedProof, rawReceipt, proofSignature, proofHash] = generateWithdrawalData(consensus, receipt);
        await expect(bridge2.connect(signer2).withdraw(encodedProof, rawReceipt, proofSignature))
          .to.be.revertedWithCustomError(bridge2, "ReceiptWrongChain")
          .withArgs(CHAIN_ID, 666);
      });

      it("withdraw: reverts when source bridge is unknown", async function() {
        await bridge2.removeBridge(CHAIN_ID);

        const amount = parseEther("1");
        await token1.connect(signer1).approve(await bridge1.getAddress(), amount);

        let tx1 = await bridge1.connect(signer1).deposit(await token1.getAddress(), CHAIN_ID, signer2.address, amount);
        receipt = await tx1.wait();

        const [encodedProof, rawReceipt, proofSignature, proofHash] = generateWithdrawalData(consensus, receipt);
        await expect(bridge2.connect(signer2).withdraw(encodedProof, rawReceipt, proofSignature))
          .to.be.revertedWithCustomError(bridge2, "UnknownBridge");
      });

      it("withdraw: reverts when destination is unknown", async function() {
        await bridge1.removeDestination(await token1.getAddress(), CHAIN_ID, await token2.getAddress());
        await bridge1.addDestination(await token1.getAddress(), CHAIN_ID, await token3.getAddress());
        const amount = parseEther("1");
        await token1.connect(signer1).approve(await bridge1.getAddress(), amount);

        let tx1 = await bridge1.connect(signer1).deposit(await token1.getAddress(), CHAIN_ID, signer2.address, amount);
        receipt = await tx1.wait();

        const [encodedProof, rawReceipt, proofSignature, proofHash] = generateWithdrawalData(consensus, receipt);
        await expect(bridge2.connect(signer2).withdraw(encodedProof, rawReceipt, proofSignature))
          .to.be.revertedWithCustomError(bridge2, "UnknownDestination");
      });

      it("withdraw: reverts when signed by not a consensus", async function() {
        const amount = parseEther("1");
        await token1.connect(signer1).approve(await bridge1.getAddress(), amount);

        let tx1 = await bridge1.connect(signer1).deposit(await token1.getAddress(), CHAIN_ID, signer2.address, amount);
        receipt = await tx1.wait();

        const [encodedProof, rawReceipt, proofSignature, proofHash] = generateWithdrawalData(treasury, receipt);
        await expect(bridge2.connect(signer2).withdraw(encodedProof, rawReceipt, proofSignature))
          .to.be.revertedWithCustomError(bridge2, "WrongSignature");
      });

      it("withdraw: reverts when has been used already", async function() {
        const amount = parseEther("1");
        await token1.connect(signer1).approve(await bridge1.getAddress(), amount);

        let tx1 = await bridge1.connect(signer1).deposit(await token1.getAddress(), CHAIN_ID, signer2.address, amount);
        receipt = await tx1.wait();

        const [encodedProof, rawReceipt, proofSignature, proofHash] = generateWithdrawalData(consensus, receipt);
        await bridge2.connect(signer2).withdraw(encodedProof, rawReceipt, proofSignature);

        await expect(bridge2.connect(signer2).withdraw(encodedProof, rawReceipt, proofSignature))
          .to.be.revertedWithCustomError(bridge2, "WithdrawalProofUsed");
      });

      it("withdraw: reverts when paused", async function() {
        const amount = parseEther("1");
        await token1.connect(signer1).approve(await bridge1.getAddress(), amount);

        let tx1 = await bridge1.connect(signer1).deposit(await token1.getAddress(), CHAIN_ID, signer2.address, amount);
        receipt = await tx1.wait();
        const [encodedProof, rawReceipt, proofSignature, proofHash] = generateWithdrawalData(consensus, receipt);

        await bridge2.pause();
        await expect(bridge2.connect(signer2).withdraw(encodedProof, rawReceipt, proofSignature))
          .to.be.revertedWithCustomError(bridge1, "EnforcedPause");
      });
    })




  });

  describe("Capacity limits", function () {
    const shortCapDuration = 3600;
    const longCapDuration = 86400;

    describe("Capacity growth with each transaction", function () {
      before(async function() {
        await snapshot.restore();
        await token1.connect(deployer).mint(signer2.address, ethers.parseEther("100"));
      });

      const args = [
        { amount: randBigInt(19), signer: () => signer1 },
        { amount: randBigInt(19), signer: () => signer1 },
        { amount: randBigInt(19), signer: () => signer2 },
        { amount: randBigInt(19), signer: () => signer2 },
        { amount: 1n, signer: () => signer1 },
        { amount: 0n, signer: () => signer1 },
      ];
      let token1DepositDayCap = 0n;
      let token2WithdrawDayCap = 0n;
      args.forEach(function (arg) {
        it(`CapsDeposit growth with deposits: ${arg.amount}`, async function() {
          const signer = arg.signer();
          const tx1 = await bridge1.connect(signer).deposit(await token1.getAddress(), CHAIN_ID, signer.address, arg.amount);
          receipt = await tx1.wait();
          token1DepositDayCap += arg.amount;

          const short = await bridge1.getCurrentStamp(shortCapDuration);
          const long = await bridge1.getCurrentStamp(longCapDuration);
          expect(await bridge1.shortCapsDeposit(await token1.getAddress(), short)).to.be.eq(token1DepositDayCap);
          expect(await bridge1.longCapsDeposit(await token1.getAddress(), long)).to.be.eq(token1DepositDayCap);
          expect(await bridge1.shortCapsWithdraw(await token1.getAddress(), short)).to.be.eq(0n);
          expect(await bridge1.longCapsWithdraw(await token1.getAddress(), long)).to.be.eq(0n);
        });
        it(`CapsWithdraw growths with withdrawals: ${arg.amount}`, async function() {
          const [encodedProof, rawReceipt, proofSignature, proofHash, receiptHash] = generateWithdrawalData(consensus, receipt);
          await bridge2.connect(signer2).withdraw(encodedProof, rawReceipt, proofSignature);
          token2WithdrawDayCap += arg.amount;

          const short = await bridge2.getCurrentStamp(shortCapDuration);
          const long = await bridge2.getCurrentStamp(longCapDuration);
          expect(await bridge2.shortCapsDeposit(await token2.getAddress(), short)).to.be.eq(0n);
          expect(await bridge2.longCapsDeposit(await token2.getAddress(), long)).to.be.eq(0n);
          expect(await bridge2.shortCapsWithdraw(await token2.getAddress(), short)).to.be.eq(token2WithdrawDayCap);
          expect(await bridge2.longCapsWithdraw(await token2.getAddress(), long)).to.be.eq(token2WithdrawDayCap);
        });
      });
    });

    describe("shortCaps reset each hour", function () {
      let token1DepositDayCap = 0n;
      let token2WithdrawDayCap = 0n;

      before(async function() {
        await snapshot.restore();

        await bridge1.setShortCap(await token1.getAddress(), ethers.parseEther("10"));
        await bridge2.setShortCap(await token2.getAddress(), ethers.parseEther("10"));
        await token1.connect(deployer).mint(signer2.address, ethers.parseEther("100"));
      });

      const args = [
        { amount: BigInt(ethers.parseEther("10")), signer: () => signer1 },
        { amount: BigInt(ethers.parseEther("10")), signer: () => signer1 },
        { amount: BigInt(ethers.parseEther("10")), signer: () => signer2 },
      ];
      args.forEach(function (arg) {
        it(`depositCapDay per hour: ${arg.amount}`, async function() {
          await toNextHour();

          const signer = arg.signer();
          await token1.connect(signer).approve(await bridge1.getAddress(), arg.amount);
          let tx1 = await bridge1.connect(signer).deposit(await token1.getAddress(), CHAIN_ID, signer2.address, arg.amount);
          receipt = await tx1.wait();
          token1DepositDayCap += arg.amount;

          const short = await bridge1.getCurrentStamp(shortCapDuration);
          const long = await bridge1.getCurrentStamp(longCapDuration);
          expect(await bridge1.shortCapsDeposit(await token1.getAddress(), short)).to.be.eq(arg.amount);
          expect(await bridge1.longCapsDeposit(await token1.getAddress(), long)).to.be.eq(token1DepositDayCap);
          expect(await bridge1.shortCapsWithdraw(await token1.getAddress(), short)).to.be.eq(0n);
          expect(await bridge1.longCapsWithdraw(await token1.getAddress(), long)).to.be.eq(0n);
        });
        it(`withdrawTxCap per hour: ${arg.amount}`, async function() {
          const [encodedProof, rawReceipt, proofSignature, proofHash, receiptHash] = generateWithdrawalData(consensus, receipt);
          await bridge2.connect(signer2).withdraw(encodedProof, rawReceipt, proofSignature);
          token2WithdrawDayCap += arg.amount;

          const short = await bridge2.getCurrentStamp(shortCapDuration);
          const long = await bridge2.getCurrentStamp(longCapDuration);
          expect(await bridge2.shortCapsDeposit(await token2.getAddress(), short)).to.be.eq(0n);
          expect(await bridge2.longCapsDeposit(await token2.getAddress(), long)).to.be.eq(0n);
          expect(await bridge2.shortCapsWithdraw(await token2.getAddress(), short)).to.be.eq(arg.amount);
          expect(await bridge2.longCapsWithdraw(await token2.getAddress(), long)).to.be.eq(token2WithdrawDayCap);
        });
      });
    });

    describe("shortCap limit can not be exceeded on deposit", function () {
      beforeEach(async function() {
        await snapshot.restore();

        await bridge1.setShortCap(await token1.getAddress(), ethers.parseEther("10"));
        await token1.connect(deployer).mint(signer2.address, ethers.parseEther("100"));
      });

      const args = [
        {
          name: "Exceed with multiple txs and the same signer",
          successfulDeposits: [randBigInt(17), randBigInt(17)],
          lastSigner: () => signer1,
          lastDeposit: async (amount) => BigInt(await bridge1.shortCaps(await token1.getAddress())) - amount + 1n,
        },
        {
          name: "Exceed with multiple txs and different signers",
          successfulDeposits: [randBigInt(17), randBigInt(17)],
          lastSigner: () => signer2,
          lastDeposit: async (amount) => BigInt(await bridge1.shortCaps(await token1.getAddress())) - amount + 1n,
        },
        {
          name: "Exceed with 1 tx",
          successfulDeposits: [],
          lastSigner: () => signer1,
          lastDeposit: async (amount) => BigInt(await bridge1.shortCaps(await token1.getAddress())) - amount + 1n,
        },
      ];
      args.forEach(function (arg) {
        it(`Reverts when: ${arg.name}`, async function() {
          let tokenShortCap = 0n;
          for (const amount of arg.successfulDeposits) {
            tx = await bridge1.connect(signer1).deposit(await token1.getAddress(), CHAIN_ID, signer1.address, amount);
            await tx.wait();
            tokenShortCap += amount;
          }
          const lastAmount = await arg.lastDeposit(tokenShortCap);
          const shortCap = await bridge1.shortCaps(await token1.getAddress());
          await expect(bridge1.connect(arg.lastSigner()).deposit(await token1.getAddress(), CHAIN_ID, signer1.address, lastAmount))
            .to.be.revertedWithCustomError(bridge1, "ShortCapExceeded")
            .withArgs(shortCap, tokenShortCap+lastAmount);
        });
      });
    });

    describe("shortCap limit can not be exceeded on withdraw", function () {
      beforeEach(async function() {
        await snapshot.restore();

        await bridge2.setShortCap(await token2.getAddress(), ethers.parseEther("10"));
        await token1.connect(deployer).mint(signer2.address, ethers.parseEther("100"));
      });

      const args = [
        {
          name: "Exceed with multiple txs and the same signer",
          successfulDeposits: [randBigInt(17), randBigInt(17)],
          lastSigner: () => signer1,
          lastDeposit: async (amount) => BigInt(await bridge2.shortCaps(await token2.getAddress())) - amount + 1n,
        },
        {
          name: "Exceed with multiple txs and different signers",
          successfulDeposits: [randBigInt(17), randBigInt(17)],
          lastSigner: () => signer2,
          lastDeposit: async (amount) => BigInt(await bridge2.shortCaps(await token2.getAddress())) - amount + 1n,
        },
        {
          name: "Exceed with 1 tx",
          successfulDeposits: [],
          lastSigner: () => signer1,
          lastDeposit: async (amount) => BigInt(await bridge2.shortCaps(await token2.getAddress())) - amount + 1n,
        },
      ];
      args.forEach(function (arg) {
        it(`Reverts when: ${arg.name}`, async function() {
          let tokenShortCap = 0n;
          for (const amount of arg.successfulDeposits) {
            tx = await bridge1.connect(signer1).deposit(await token1.getAddress(), CHAIN_ID, signer1.address, amount);
            receipt = await tx.wait();
            const [encodedProof, rawReceipt, proofSignature, proofHash, receiptHash] = generateWithdrawalData(consensus, receipt);
            await bridge2.connect(signer1).withdraw(encodedProof, rawReceipt, proofSignature);
            tokenShortCap += amount;
          }

          const lastAmount = await arg.lastDeposit(tokenShortCap);
          const tx1 = await bridge1.connect(signer1).deposit(await token1.getAddress(), CHAIN_ID, arg.lastSigner().address, lastAmount);
          receipt = await tx1.wait();
          const [encodedProof, rawReceipt, proofSignature, proofHash, receiptHash] = generateWithdrawalData(consensus, receipt);
          const shortCap = await bridge2.shortCaps(await token2.getAddress());
          await expect(bridge2.connect(arg.lastSigner()).withdraw(encodedProof, rawReceipt, proofSignature))
            .to.be.revertedWithCustomError(bridge2, "ShortCapExceeded")
            .withArgs(shortCap, tokenShortCap+lastAmount);
        });
      });
    });

    describe("longCaps reset each day", function () {
      before(async function() {
        await snapshot.restore();

        await bridge1.setShortCap(await token1.getAddress(), ethers.parseEther("10"));
        await bridge1.setLongCap(await token1.getAddress(), ethers.parseEther("10"));
        await bridge2.setShortCap(await token2.getAddress(), ethers.parseEther("10"));
        await bridge2.setLongCap(await token2.getAddress(), ethers.parseEther("10"));

        await token1.connect(deployer).mint(signer2.address, ethers.parseEther("100"));
      });

      const args = [
        { amount: BigInt(ethers.parseEther("10")), signer: () => signer1 },
        { amount: BigInt(ethers.parseEther("10")), signer: () => signer1 },
        { amount: BigInt(ethers.parseEther("10")), signer: () => signer2 },
      ];
      args.forEach(function (arg) {
        it(`depositCapDay per day: ${arg.amount}`, async function() {
          await toNextDay();

          const signer = arg.signer();
          await token1.connect(signer).approve(await bridge1.getAddress(), arg.amount);
          let tx1 = await bridge1.connect(signer).deposit(await token1.getAddress(), CHAIN_ID, signer2.address, arg.amount);
          receipt = await tx1.wait();

          const short = await bridge1.getCurrentStamp(shortCapDuration);
          const long = await bridge1.getCurrentStamp(longCapDuration);
          expect(await bridge1.shortCapsDeposit(await token1.getAddress(), short)).to.be.eq(arg.amount);
          expect(await bridge1.longCapsDeposit(await token1.getAddress(), long)).to.be.eq(arg.amount);
          expect(await bridge1.shortCapsWithdraw(await token1.getAddress(), short)).to.be.eq(0n);
          expect(await bridge1.longCapsWithdraw(await token1.getAddress(), long)).to.be.eq(0n);
        });
        it(`withdrawTxCap per day: ${arg.amount}`, async function() {
          const [encodedProof, rawReceipt, proofSignature, proofHash, receiptHash] = generateWithdrawalData(consensus, receipt);
          await bridge2.connect(signer2).withdraw(encodedProof, rawReceipt, proofSignature);

          const short = await bridge2.getCurrentStamp(shortCapDuration);
          const long = await bridge2.getCurrentStamp(longCapDuration);
          expect(await bridge2.shortCapsDeposit(await token2.getAddress(), short)).to.be.eq(0n);
          expect(await bridge2.longCapsDeposit(await token2.getAddress(), long)).to.be.eq(0n);
          expect(await bridge2.shortCapsWithdraw(await token2.getAddress(), short)).to.be.eq(arg.amount);
          expect(await bridge2.longCapsWithdraw(await token2.getAddress(), long)).to.be.eq(arg.amount);
        });
      });
    });

    describe("longCap limit can not be exceeded on deposit", function () {
      beforeEach(async function() {
        await snapshot.restore();

        await bridge1.setLongCap(await token1.getAddress(), ethers.parseEther("10"));
        await token1.connect(deployer).mint(signer2.address, ethers.parseEther("100"));
      });

      const args = [
        {
          name: "Exceed with multiple txs and the same signer",
          successfulDeposits: [randBigInt(17), randBigInt(17)],
          lastSigner: () => signer1,
          lastDeposit: async (amount) => BigInt(await bridge1.longCaps(await token1.getAddress())) - amount + 1n,
        },
        {
          name: "Exceed with multiple txs and different signers",
          successfulDeposits: [randBigInt(17), randBigInt(17)],
          lastSigner: () => signer2,
          lastDeposit: async (amount) => BigInt(await bridge1.longCaps(await token1.getAddress())) - amount + 1n,
        },
        {
          name: "Exceed with 1 tx",
          successfulDeposits: [],
          lastSigner: () => signer1,
          lastDeposit: async (amount) => BigInt(await bridge1.longCaps(await token1.getAddress())) - amount + 1n,
        },
      ];
      args.forEach(function (arg) {
        it(`Reverts when: ${arg.name}`, async function() {
          let tokenLongCap = 0n;
          for (const amount of arg.successfulDeposits) {
            tx = await bridge1.connect(signer1).deposit(await token1.getAddress(), CHAIN_ID, signer1.address, amount);
            await tx.wait();
            tokenLongCap += amount;
          }

          const lastAmount = await arg.lastDeposit(tokenLongCap);
          const longCap = await bridge1.longCaps(await token1.getAddress());
          await expect(bridge1.connect(arg.lastSigner()).deposit(await token1.getAddress(), CHAIN_ID, signer1.address, lastAmount))
            .to.be.revertedWithCustomError(bridge1, "LongCapExceeded")
            .withArgs(longCap, tokenLongCap+lastAmount);
        });
      });
    });

    describe("longCap limit can not be exceeded on withdraw", function () {
      beforeEach(async function() {
        await snapshot.restore();

        await bridge2.setLongCap(await token2.getAddress(), ethers.parseEther("10"));
        await token1.connect(deployer).mint(signer2.address, ethers.parseEther("100"));
      });

      const args = [
        {
          name: "Exceed with multiple txs and the same signer",
          successfulDeposits: [randBigInt(18), randBigInt(18)],
          lastSigner: () => signer1,
          lastDeposit: async (amount) => BigInt(await bridge2.longCaps(await token2.getAddress())) - amount + 1n,
        },
        {
          name: "Exceed with multiple txs and different signers",
          successfulDeposits: [randBigInt(18), randBigInt(18)],
          lastSigner: () => signer2,
          lastDeposit: async (amount) => BigInt(await bridge2.longCaps(await token2.getAddress())) - amount + 1n,
        },
        {
          name: "Exceed with 1 tx",
          successfulDeposits: [],
          lastSigner: () => signer1,
          lastDeposit: async (amount) => BigInt(await bridge2.longCaps(await token2.getAddress())) - amount + 1n,
        },
      ];
      args.forEach(function (arg) {
        it(`Reverts when: ${arg.name}`, async function() {
          let tokenLongCap = 0n;
          for (const amount of arg.successfulDeposits) {
            tx = await bridge1.connect(signer1).deposit(await token1.getAddress(), CHAIN_ID, signer1.address, amount);
            receipt = await tx.wait();
            const [encodedProof, rawReceipt, proofSignature, proofHash, receiptHash] = generateWithdrawalData(consensus, receipt);
            await bridge2.connect(signer1).withdraw(encodedProof, rawReceipt, proofSignature);
            tokenLongCap += amount;
          }

          const lastAmount = await arg.lastDeposit(tokenLongCap);
          const tx1 = await bridge1.connect(signer1).deposit(await token1.getAddress(), CHAIN_ID, arg.lastSigner().address, lastAmount);
          receipt = await tx1.wait();
          const [encodedProof, rawReceipt, proofSignature, proofHash, receiptHash] = generateWithdrawalData(consensus, receipt);
          const longCap = await bridge2.longCaps(await token2.getAddress());
          await expect(bridge2.connect(arg.lastSigner()).withdraw(encodedProof, rawReceipt, proofSignature))
            .to.be.revertedWithCustomError(bridge2, "LongCapExceeded")
            .withArgs(longCap, tokenLongCap+lastAmount);
        });
      });
    });
  });

  describe("Management", function () {
    const ANOTHER_CHAIN = 666;

    beforeEach(async function() {
      await snapshot.restore();
    });

    describe("Add bridge", function() {
      it("addBridge adds bridge address for the chain", async function() {
        await expect(bridge3.addBridge(await bridge1.getAddress(), ANOTHER_CHAIN))
          .to.emit(bridge3, "BridgeAdded")
          .withArgs(await bridge1.getAddress(), ANOTHER_CHAIN);

        await expect(bridge3.addBridge(await bridge2.getAddress(), CHAIN_ID))
          .to.emit(bridge3, "BridgeAdded")
          .withArgs(await bridge2.getAddress(), CHAIN_ID);
      })

      it("addBridge: reverts when bridge address is 0", async function() {
        await expect(bridge3.addBridge(ethers.ZeroAddress, ANOTHER_CHAIN))
          .to.revertedWithCustomError(bridge3, "NullAddress");
      })

      it("addBridge: reverts when destination chain has bridge", async function() {
        await bridge3.addBridge(await bridge1.getAddress(), ANOTHER_CHAIN);

        await expect(bridge3.addBridge(ethers.Wallet.createRandom(), ANOTHER_CHAIN))
          .to.revertedWithCustomError(bridge3, "BridgeAlreadyAdded");
      })

      it("addBridge: reverts when destination chain is 0", async function() {
        await expect(bridge3.addBridge(await bridge1.getAddress(), 0))
          .to.revertedWithCustomError(bridge3, "InvalidChain");
      })

      it("addBridge: reverts when called by not an owner", async function() {
        await expect(bridge3.connect(signer1).addBridge(await bridge1.getAddress(), ANOTHER_CHAIN))
          .to.revertedWithCustomError(bridge3, "OwnableUnauthorizedAccount");
      })
    })

    describe("Remove bridge", function() {
      it("removeBridge removes bridge address for the chain", async function() {
        await bridge3.addBridge(await bridge1.getAddress(), ANOTHER_CHAIN);
        await bridge3.addDestination(await token3.getAddress(), ANOTHER_CHAIN, await token1.getAddress());

        await expect(bridge3.removeBridge(ANOTHER_CHAIN))
          .to.emit(bridge3, "BridgeRemoved")
          .withArgs(await bridge1.getAddress(), ANOTHER_CHAIN);

        const amount = parseEther("10");
        await token3.connect(signer1).approve(await bridge3.getAddress(), amount);
        await expect(bridge3.connect(signer1).deposit(await token3.getAddress(), ANOTHER_CHAIN, signer2.address, amount))
          .to.be.revertedWithCustomError(bridge3, "UnknownDestinationChain");
      })

      it("removeBridge: reverts when not exists", async function() {
        await bridge3.addBridge(await bridge1.getAddress(), ANOTHER_CHAIN);
        await bridge3.addDestination(await token3.getAddress(), ANOTHER_CHAIN, await token1.getAddress());
        await bridge3.removeBridge(ANOTHER_CHAIN);

        await expect(bridge3.removeBridge(ANOTHER_CHAIN))
          .to.be.revertedWithCustomError(bridge3, "BridgeNotExist");
      })

      it("removeBridge: reverts when called by not an owner", async function() {
        await bridge3.addBridge(await bridge1.getAddress(), ANOTHER_CHAIN);

        await expect(bridge3.connect(signer1).removeBridge(ANOTHER_CHAIN))
          .to.revertedWithCustomError(bridge3, "OwnableUnauthorizedAccount");
      })
    })

    describe("Add destination", function() {

      it("addDestination adds destination token and chain", async function () {
        await bridge3.addBridge(await bridge1.getAddress(), ANOTHER_CHAIN);
        await expect(bridge3.addDestination(await token3.getAddress(), ANOTHER_CHAIN, await token1.getAddress()))
          .to.emit(bridge3, "DestinationAdded")
          .withArgs(await token3.getAddress(), await token1.getAddress(), ANOTHER_CHAIN);

        await bridge3.addBridge(await bridge2.getAddress(), CHAIN_ID);
        await expect(bridge3.addDestination(await token3.getAddress(), CHAIN_ID, await token2.getAddress()))
          .to.emit(bridge3, "DestinationAdded")
          .withArgs(await token3.getAddress(), await token2.getAddress(), CHAIN_ID);
      })

      it("addDestination: reverts when destination exists", async function () {
        await bridge3.addBridge(await bridge1.getAddress(), ANOTHER_CHAIN);
        await bridge3.addDestination(await token3.getAddress(), ANOTHER_CHAIN, await token1.getAddress())

        await expect(bridge3.addDestination(await token3.getAddress(), ANOTHER_CHAIN, await token1.getAddress()))
          .to.revertedWithCustomError(bridge3, "DestinationAlreadyExists");

        await expect(bridge3.addDestination(await token3.getAddress(), ANOTHER_CHAIN, await token2.getAddress()))
          .to.revertedWithCustomError(bridge3, "DestinationAlreadyExists");
      })

      it("addDestination: reverts when called by not an owner", async function () {
        await bridge3.addBridge(await bridge1.getAddress(), ANOTHER_CHAIN);
        await expect(bridge3.connect(signer1).addDestination(await token3.getAddress(), ANOTHER_CHAIN, await token1.getAddress()))
          .to.revertedWithCustomError(bridge3, "OwnableUnauthorizedAccount");
      })
    })

    describe("Remove destination", function() {

/*      it("addDestination adds destination token and chain", async function () {
        await bridge3.addBridge(await bridge1.getAddress(), ANOTHER_CHAIN);
        await expect(bridge3.addDestination(await token3.getAddress(), ANOTHER_CHAIN, await token1.getAddress()))
          .to.emit(bridge3, "DestinationAdded")
          .withArgs(await token3.getAddress(), await token1.getAddress(), ANOTHER_CHAIN);

        await bridge3.addBridge(await bridge2.getAddress(), CHAIN_ID);
        await expect(bridge3.addDestination(await token3.getAddress(), CHAIN_ID, await token2.getAddress()))
          .to.emit(bridge3, "DestinationAdded")
          .withArgs(await token3.getAddress(), await token2.getAddress(), CHAIN_ID);
      })

      it("addDestination: reverts when destination exists", async function () {
        await bridge3.addBridge(await bridge1.getAddress(), ANOTHER_CHAIN);
        await bridge3.addDestination(await token3.getAddress(), ANOTHER_CHAIN, await token1.getAddress())

        await expect(bridge3.addDestination(await token3.getAddress(), ANOTHER_CHAIN, await token1.getAddress()))
          .to.revertedWithCustomError(bridge3, "DestinationAlreadyExists");

        await expect(bridge3.addDestination(await token3.getAddress(), ANOTHER_CHAIN, await token2.getAddress()))
          .to.revertedWithCustomError(bridge3, "DestinationAlreadyExists");
      })

      it("addDestination: reverts when called by not an owner", async function () {
        await bridge3.addBridge(await bridge1.getAddress(), ANOTHER_CHAIN);
        await expect(bridge3.connect(signer1).addDestination(await token3.getAddress(), ANOTHER_CHAIN, await token1.getAddress()))
          .to.revertedWithCustomError(bridge3, "OwnableUnauthorizedAccount");
      })*/
    })

    describe("Capacity setters", function() {
      it("setShortCap: sets new value for short cap", async function () {
        const xAmount = await bridge1.shortCaps(await token1.getAddress());
        const amount = randBigInt(19);
        await expect(bridge1.setShortCap(await token1.getAddress(), amount))
          .to.emit(bridge1, "ShortCapChanged")
          .withArgs(await token1.getAddress(), xAmount, amount);
        expect(await bridge1.shortCaps(await token1.getAddress())).to.be.eq(amount);
      });

      it("setShortCap: reverts when called by not an owner", async function () {
        const amount = randBigInt(19);
        await expect(bridge1.connect(signer1).setShortCap(await token1.getAddress(), amount))
          .to.revertedWithCustomError(bridge1, "OwnableUnauthorizedAccount");
      });

      it("setShortCapDuration: sets new duration for short cap", async function () {
        const oldDur = await bridge1.shortCapDuration();
        const newDur = randBigInt(5);
        await expect(bridge1.setShortCapDuration(newDur)).to.emit(bridge1, "ShortCapDurationChanged").withArgs(oldDur, newDur);
        expect(await bridge1.shortCapDuration()).to.be.eq(newDur);
      });

      it("setShortCapDuration: reverts when called by not an owner", async function () {
        const newDur = randBigInt(5);
        await expect(bridge1.connect(signer1).setShortCapDuration(newDur))
          .to.revertedWithCustomError(bridge1, "OwnableUnauthorizedAccount");
      });

      it("setLongCap: sets new value for long cap", async function () {
        const xAmount = await bridge1.longCaps(await token1.getAddress());
        const amount = randBigInt(19);
        await expect(bridge1.setLongCap(await token1.getAddress(), amount))
          .to.emit(bridge1, "LongCapChanged")
          .withArgs(await token1.getAddress(), xAmount, amount);
        expect(await bridge1.longCaps(await token1.getAddress())).to.be.eq(amount);
      });

      it("setLongCap: reverts when called by not an owner", async function () {
        const amount = randBigInt(19);
        await expect(bridge1.connect(signer1).setLongCap(await token1.getAddress(), amount))
          .to.revertedWithCustomError(bridge1, "OwnableUnauthorizedAccount");
      });

      it("setLongCapDuration: sets new duration for short cap", async function () {
        const oldDur = await bridge1.longCapDuration();
        const newDur = randBigInt(5);
        await expect(bridge1.setLongCapDuration(newDur)).to.emit(bridge1, "LongCapDurationChanged").withArgs(oldDur, newDur);
        expect(await bridge1.longCapDuration()).to.be.eq(newDur);
      });

      it("setLongCapDuration: reverts when called by not an owner", async function () {
        const newDur = randBigInt(5);
        await expect(bridge1.connect(signer1).setLongCapDuration(newDur))
          .to.revertedWithCustomError(bridge1, "OwnableUnauthorizedAccount");
      });
    })
  });

});

function generateWithdrawalData(consensus, receipt) {
  const event = receipt.logs.find((e) => e.eventName === "Deposited");
  const [rawReceipt, receiptHash] = encodeTransactionReceipt(receipt);
  const [encodedProof, proofHash] = encodeProof(
    CHAIN_ID,
    1,
    receipt.hash,
    receipt.blockNumber,
    receipt.blockHash,
    receipt.index,
    receiptHash,
    web3x.utils.padLeft(web3x.utils.toHex(event.args["amount"].toString()), 64)
  );

  const accounts = config.networks.hardhat.accounts;
  const mnemonic = ethers.Mnemonic.fromPhrase(accounts.mnemonic);
  let proofSignature;
  for (let i = 0; ; i++) {
    const wallet1 = ethers.HDNodeWallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${i}`);
    if (wallet1.address === consensus.address) {
      const privateKey = wallet1.privateKey.substring(2);
      proofSignature = signMessageUsingPrivateKey(privateKey, proofHash);
      break;
    }
  }

  return [encodedProof, rawReceipt, proofSignature, proofHash, receiptHash];
}

async function toNextDay() {
  const block = await ethers.provider.getBlock("latest");
  const nextDayTs = Math.floor(block.timestamp / 86400 + 1) * 86400;
  await time.increase(nextDayTs - block.timestamp);
}

async function toNextHour() {
  const block = await ethers.provider.getBlock("latest");
  const nextHourTs = Math.floor(block.timestamp / 3600 + 1) * 3600;
  await time.increase(nextHourTs - block.timestamp);
}
