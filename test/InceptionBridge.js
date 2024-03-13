const { ethers, upgrades, network } = require("hardhat");
const { assert, expect } = require("chai");
const web3x = require("web3");
const { encodeTransactionReceipt, encodeProof, randBigInt } = require("./helpers/bridge_utils");
const { signMessageUsingPrivateKey } = require("./helpers/evm_utils");

// Constants
const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
const CHAIN_ID = "31337";
const amount = ethers.parseEther("10");

// Addresses
let deployer, eoa1, eoa2, consensus, treasury;

// Protocol Contracts
let bridge1, bridge2;

let token1, token2;

let encodedProof, rawReceipt, proofSignature, proofHash, receiptHash, receipt;

var tx;

async function initIBridge() {
  [deployer, eoa1, eoa2, consensus, treasury] = await ethers.getSigners();

  const Token = await ethers.getContractFactory("XERC20");
  const InceptionBridge = await ethers.getContractFactory("InceptionBridge");

  token1 = await Token.connect(deployer).deploy();
  await token1.waitForDeployment();

  token2 = await Token.connect(deployer).deploy();
  await token2.waitForDeployment();

  bridge1 = await upgrades.deployProxy(InceptionBridge, [await deployer.getAddress(), consensus.address], {
    initializer: "initialize",
  });
  await bridge1.waitForDeployment();

  bridge2 = await upgrades.deployProxy(InceptionBridge, [await deployer.getAddress(), consensus.address], {
    initializer: "initialize",
  });
  await bridge2.waitForDeployment();

  await token1.connect(deployer).initialize();
  await token2.connect(deployer).initialize();

  await token1.connect(deployer).mint(eoa1.address, ethers.parseEther("100"));

  await bridge1.addBridge(await bridge2.getAddress(), CHAIN_ID);
  await bridge2.addBridge(await bridge1.getAddress(), CHAIN_ID);

  await bridge1.addDestination(await token1.getAddress(), CHAIN_ID, await token2.getAddress());
  await bridge2.addDestination(await token2.getAddress(), CHAIN_ID, await token1.getAddress());

  await token1.rely(await bridge1.getAddress());
  await token2.rely(await bridge2.getAddress());

  await token1.connect(eoa1).approve(await bridge1.getAddress(), ethers.parseEther("1000"));
  await token1.connect(eoa2).approve(await bridge1.getAddress(), ethers.parseEther("1000"));
}

describe("InceptionBridge", function () {
  this.timeout(15000);

  describe("Bridge Token to Token", async () => {
    before(async () => {
      await initIBridge();
      await bridge1.setShortCap(await token1.getAddress(), ethers.parseEther("100"));
      await bridge1.setLongCap(await token1.getAddress(), ethers.parseEther("100"));

      await bridge2.setShortCap(await token2.getAddress(), ethers.parseEther("100"));
      await bridge2.setLongCap(await token2.getAddress(), ethers.parseEther("100"));
    });

    it("Deposit XERC20_1", async () => {
      await token1.connect(eoa1).approve(await bridge1.getAddress(), ethers.parseEther("10"));

      expect((await token1.balanceOf(await eoa1.getAddress())).toString()).to.be.equal(ethers.parseEther("100").toString());
      expect((await token1.totalSupply()).toString()).to.be.equal(ethers.parseEther("100").toString());

      let tx1 = await bridge1.connect(eoa1).deposit(await token1.getAddress(), CHAIN_ID, await eoa2.getAddress(), amount);
      receipt = await tx1.wait();

      expect((await token1.balanceOf(eoa1.address)).toString()).to.be.equal(ethers.parseEther("90").toString());
      expect((await token1.totalSupply()).toString()).to.be.equal(ethers.parseEther("90").toString());

      /// TODO

      // assert.equal(receipt.events[1].event, "Deposited");
      // assert.equal(receipt.events[1].args["sender"].toString(), eoa1.address, "Wrong toChain");
      // assert.equal(receipt.events[1].args["receiver"].toString(), eoa2.address, "Wrong toAddress");
      // assert.equal(receipt.events[1].args["fromToken"].toString(), await token1.getAddress(), "Wrong fromToken");
      // assert.equal(receipt.events[1].args["toToken"].toString(), await token2.getAddress(), "Wrong toToken");
      // assert.equal(receipt.events[1].args["amount"].toString(), amount, "Wrong amount");
      // // assert.equal(receipt.events[1].args["nonce"].toString(), 1, "Wrong _contractNonce");
      // assert.equal(receipt.events[1].args["metadata"].symbol.toString(), ethers.utils.formatBytes32String("WTKN"), "Wrong symbol");
      // assert.equal(receipt.events[1].args["metadata"].name.toString(), ethers.utils.formatBytes32String("Token"), "Wrong name");
      // assert.equal(receipt.events[1].args["metadata"].originChain, 0, "Wrong originChain");
      // assert.equal(receipt.events[1].args["metadata"].originAddress, NULL_ADDRESS, "Wrong originToken");
    });

    it("Withdraw XERC20_2", async function () {
      // Process proofs
      [encodedProof, rawReceipt, proofSignature, proofHash] = generateWithdrawalData(consensus, receipt);

      expect((await token2.balanceOf(eoa2.address)).toString()).to.be.equal(ethers.parseEther("0").toString());
      expect((await token2.totalSupply()).toString()).to.be.equal(ethers.parseEther("0").toString());

      let tx2 = await bridge2.connect(eoa2).withdraw(encodedProof, rawReceipt, proofSignature);

      // let tx2 = await bridge2.connect(eoa2).withdraw(encodedProof, rawReceipt, proofSignature, proofHash);
      receipt = await tx2.wait();

      expect((await token2.totalSupply()).toString()).to.be.equal(ethers.parseEther("10").toString());
      expect((await token2.balanceOf(eoa2.address)).toString()).to.be.equal(ethers.parseEther("10").toString());

      // assert.equal(receipt.events[1].event, "Withdrawn");
      // assert.equal(receipt.events[1].args["receiptHash"].toString(), receiptHash, "Wrong receiptHash");
      // assert.equal(receipt.events[1].args["fromAddress"].toString(), eoa1.address, "Wrong fromAddress");
      // assert.equal(receipt.events[1].args["toAddress"].toString(), eoa2.address, "Wrong toAddress");
      // assert.equal(receipt.events[1].args["fromToken"].toString(), await token1.getAddress(), "Wrong fromToken");
      // assert.equal(receipt.events[1].args["toToken"].toString(), await token2.getAddress(), "Wrong toToken");
      // assert.equal(receipt.events[1].args["amount"].toString(), amount, "Wrong amount");
    });

    it("Deposit XERC20_2", async () => {
      await token2.connect(eoa2).approve(await bridge2.getAddress(), ethers.parseEther("10"));

      expect((await token2.balanceOf(eoa2.address)).toString()).to.be.equal(ethers.parseEther("10").toString());
      expect((await token2.totalSupply()).toString()).to.be.equal(ethers.parseEther("10").toString());

      let tx1 = await bridge2.connect(eoa2).deposit(await token2.getAddress(), CHAIN_ID, eoa1.address, amount);
      receipt = await tx1.wait();

      expect((await token2.balanceOf(eoa2.address)).toString()).to.be.equal(ethers.parseEther("0").toString());
      expect((await token2.totalSupply()).toString()).to.be.equal(ethers.parseEther("0").toString());

      // assert.equal(receipt.events[1].event, "Deposited");
      // assert.equal(receipt.events[1].args["fromAddress"].toString(), eoa2.address, "Wrong toChain");
      // assert.equal(receipt.events[1].args["toAddress"].toString(), eoa1.address, "Wrong toAddress");
      // assert.equal(receipt.events[1].args["fromToken"].toString(), await token2.getAddress(), "Wrong fromToken");
      // assert.equal(receipt.events[1].args["toToken"].toString(), await token1.getAddress(), "Wrong toToken");
      // assert.equal(receipt.events[1].args["amount"].toString(), amount, "Wrong amount");
      // // assert.equal(receipt.events[1].args["nonce"].toString(), 1, "Wrong _contractNonce");
      // assert.equal(receipt.events[1].args["metadata"].symbol.toString(), ethers.utils.formatBytes32String("WTKN"), "Wrong symbol");
      // assert.equal(receipt.events[1].args["metadata"].name.toString(), ethers.utils.formatBytes32String("Token"), "Wrong name");
      // assert.equal(receipt.events[1].args["metadata"].originChain, 0, "Wrong originChain");
      // assert.equal(receipt.events[1].args["metadata"].originAddress, NULL_ADDRESS, "Wrong originToken");
    });

    it("Withdraw XERC20_1", async function () {
      // Process proofs
      [encodedProof, rawReceipt, proofSignature, proofHash] = generateWithdrawalData(consensus, receipt);

      expect((await token1.balanceOf(eoa1.address)).toString()).to.be.equal(ethers.parseEther("90").toString());
      expect((await token1.totalSupply()).toString()).to.be.equal(ethers.parseEther("90").toString());

      let tx2 = await bridge1.connect(eoa1).withdraw(encodedProof, rawReceipt, proofSignature);
      receipt = await tx2.wait();

      expect((await token1.totalSupply()).toString()).to.be.equal(ethers.parseEther("100").toString());
      expect((await token1.balanceOf(eoa1.address)).toString()).to.be.equal(ethers.parseEther("100").toString());

      // assert.equal(receipt.events[1].event, "Withdrawn");
      // assert.equal(receipt.events[1].args["receiptHash"].toString(), receiptHash, "Wrong receiptHash");
      // assert.equal(receipt.events[1].args["fromAddress"].toString(), eoa2.address, "Wrong fromAddress");
      // assert.equal(receipt.events[1].args["toAddress"].toString(), eoa1.address, "Wrong toAddress");
      // assert.equal(receipt.events[1].args["fromToken"].toString(), await token2.getAddress(), "Wrong fromToken");
      // assert.equal(receipt.events[1].args["toToken"].toString(), await token1.getAddress(), "Wrong toToken");
      // assert.equal(receipt.events[1].args["amount"].toString(), amount, "Wrong amount");
    });
    return;
    it("reverts: Non-consensus signing", async () => {
      await token1.connect(eoa1).approve(await bridge1.getAddress(), ethers.parseEther("10"));

      expect((await token1.balanceOf(eoa1.address)).toString()).to.be.equal(ethers.parseEther("100").toString());
      expect((await token1.totalSupply()).toString()).to.be.equal(ethers.parseEther("100").toString());

      let tx1 = await bridge1.connect(eoa1).deposit(await token1.getAddress(), CHAIN_ID, eoa2.address, amount);
      receipt = await tx1.wait();

      expect((await token1.balanceOf(eoa1.address)).toString()).to.be.equal(ethers.parseEther("90").toString());
      expect((await token1.totalSupply()).toString()).to.be.equal(ethers.parseEther("90").toString());

      assert.equal(receipt.events[1].event, "Deposited");
      assert.equal(receipt.events[1].args["fromAddress"].toString(), eoa1.address, "Wrong toChain");
      assert.equal(receipt.events[1].args["toAddress"].toString(), eoa2.address, "Wrong toAddress");
      assert.equal(receipt.events[1].args["fromToken"].toString(), await token1.getAddress(), "Wrong fromToken");
      assert.equal(receipt.events[1].args["toToken"].toString(), await token2.getAddress(), "Wrong toToken");
      assert.equal(receipt.events[1].args["amount"].toString(), amount, "Wrong amount");
      // assert.equal(receipt.events[1].args["nonce"].toString(), 1, "Wrong _contractNonce");
      assert.equal(receipt.events[1].args["metadata"].symbol.toString(), ethers.utils.formatBytes32String("WTKN"), "Wrong symbol");
      assert.equal(receipt.events[1].args["metadata"].name.toString(), ethers.utils.formatBytes32String("Token"), "Wrong name");
      assert.equal(receipt.events[1].args["metadata"].originChain, 0, "Wrong originChain");
      assert.equal(receipt.events[1].args["metadata"].originAddress, NULL_ADDRESS, "Wrong originToken");

      [encodedProof, rawReceipt, proofSignature, proofHash] = generateWithdrawalData(treasury, receipt);

      expect((await token2.balanceOf(eoa2.address)).toString()).to.be.equal(ethers.parseEther("0").toString());
      expect((await token2.totalSupply()).toString()).to.be.equal(ethers.parseEther("0").toString());

      await expect(bridge2.connect(eoa2).withdraw(encodedProof, rawReceipt, proofSignature)).to.be.revertedWith(
        "InceptionBridge/bad-signature"
      );
    });
  });

  describe("Capacity", function () {
    const shortCapDuration = 3600;
    const longCapDuration = 86400;

    describe("Capacity growth with each transaction", function () {
      before(async () => {
        await initIBridge();
        await bridge1.setShortCap(await token1.getAddress(), ethers.parseEther("100"));
        await bridge1.setLongCap(await token1.getAddress(), ethers.parseEther("100"));

        await bridge2.setShortCap(await token2.getAddress(), ethers.parseEther("100"));
        await bridge2.setLongCap(await token2.getAddress(), ethers.parseEther("100"));

        await token1.connect(deployer).mint(eoa2.address, ethers.parseEther("100"));
      });

      const args = [
        { amount: randBigInt(19), signer: () => eoa1 },
        { amount: randBigInt(19), signer: () => eoa1 },
        { amount: randBigInt(19), signer: () => eoa2 },
        { amount: randBigInt(19), signer: () => eoa2 },
        { amount: 1n, signer: () => eoa1 },
        { amount: 0n, signer: () => eoa1 },
      ];
      let token1DepositDayCap = 0n;
      let token2WithdrawDayCap = 0n;
      args.forEach(function (arg) {
        it(`CapsDeposit growth with deposits: ${arg.amount}`, async () => {
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
        it(`CapsWithdraw growths with withdrawals: ${arg.amount}`, async () => {
          [encodedProof, rawReceipt, proofSignature, proofHash] = generateWithdrawalData(consensus, receipt);
          await bridge2.connect(eoa2).withdraw(encodedProof, rawReceipt, proofSignature);
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

      before(async () => {
        await initIBridge();
        await bridge1.setShortCap(await token1.getAddress(), ethers.parseEther("10"));
        await bridge1.setLongCap(await token1.getAddress(), ethers.parseEther("100"));

        await bridge2.setShortCap(await token2.getAddress(), ethers.parseEther("10"));
        await bridge2.setLongCap(await token2.getAddress(), ethers.parseEther("100"));

        await token1.connect(deployer).mint(eoa2.address, ethers.parseEther("100"));
      });

      const args = [
        { amount: BigInt(ethers.parseEther("10")), signer: () => eoa1 },
        { amount: BigInt(ethers.parseEther("10")), signer: () => eoa1 },
        { amount: BigInt(ethers.parseEther("10")), signer: () => eoa2 },
      ];
      args.forEach(function (arg) {
        it(`depositCapDay per hour: ${arg.amount}`, async () => {
          await toNextHour();

          const signer = arg.signer();
          await token1.connect(signer).approve(await bridge1.getAddress(), arg.amount);
          let tx1 = await bridge1.connect(signer).deposit(await token1.getAddress(), CHAIN_ID, eoa2.address, arg.amount);
          receipt = await tx1.wait();
          token1DepositDayCap += arg.amount;

          const short = await bridge1.getCurrentStamp(shortCapDuration);
          const long = await bridge1.getCurrentStamp(longCapDuration);
          expect(await bridge1.shortCapsDeposit(await token1.getAddress(), short)).to.be.eq(arg.amount);
          expect(await bridge1.longCapsDeposit(await token1.getAddress(), long)).to.be.eq(token1DepositDayCap);
          expect(await bridge1.shortCapsWithdraw(await token1.getAddress(), short)).to.be.eq(0n);
          expect(await bridge1.longCapsWithdraw(await token1.getAddress(), long)).to.be.eq(0n);
        });
        it(`withdrawTxCap per hour: ${arg.amount}`, async () => {
          [encodedProof, rawReceipt, proofSignature, proofHash] = generateWithdrawalData(consensus, receipt);
          await bridge2.connect(eoa2).withdraw(encodedProof, rawReceipt, proofSignature);
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
      beforeEach(async () => {
        await initIBridge();
        await bridge1.setShortCap(await token1.getAddress(), ethers.parseEther("10"));
        await bridge1.setLongCap(await token1.getAddress(), ethers.parseEther("100"));
        await token1.connect(deployer).mint(eoa2.address, ethers.parseEther("100"));
      });

      const args = [
        {
          name: "Exceed with multiple txs and the same signer",
          successfulDeposits: [randBigInt(17), randBigInt(17)],
          lastSigner: () => eoa1,
          lastDeposit: async (amount) => BigInt(await bridge1.shortCaps(await token1.getAddress())) - amount + 1n,
        },
        {
          name: "Exceed with multiple txs and different signers",
          successfulDeposits: [randBigInt(17), randBigInt(17)],
          lastSigner: () => eoa2,
          lastDeposit: async (amount) => BigInt(await bridge1.shortCaps(await token1.getAddress())) - amount + 1n,
        },
        {
          name: "Exceed with 1 tx",
          successfulDeposits: [],
          lastSigner: () => eoa1,
          lastDeposit: async (amount) => BigInt(await bridge1.shortCaps(await token1.getAddress())) - amount + 1n,
        },
      ];
      args.forEach(function (arg) {
        it(`Reverts when: ${arg.name}`, async () => {
          let tokenShortCap = 0n;
          for (const amount of arg.successfulDeposits) {
            tx = await bridge1.connect(eoa1).deposit(await token1.getAddress(), CHAIN_ID, eoa1.address, amount);
            await tx.wait();
            tokenShortCap += amount;
          }
          const lastAmount = await arg.lastDeposit(tokenShortCap);
          await expect(
            bridge1.connect(arg.lastSigner()).deposit(await token1.getAddress(), CHAIN_ID, eoa1.address, lastAmount)
          ).to.be.revertedWith("InceptionBridge/short-caps-exceeded");
        });
      });
    });

    describe("shortCap limit can not be exceeded on withdraw", function () {
      beforeEach(async () => {
        await initIBridge();
        await bridge1.setShortCap(await token1.getAddress(), ethers.parseEther("1000"));
        await bridge1.setLongCap(await token1.getAddress(), ethers.parseEther("1000"));
        await bridge2.setShortCap(await token2.getAddress(), ethers.parseEther("10"));
        await bridge2.setLongCap(await token2.getAddress(), ethers.parseEther("1000"));
        await token1.connect(deployer).mint(eoa2.address, ethers.parseEther("100"));
      });

      const args = [
        {
          name: "Exceed with multiple txs and the same signer",
          successfulDeposits: [randBigInt(17), randBigInt(17)],
          lastSigner: () => eoa1,
          lastDeposit: async (amount) => BigInt(await bridge2.shortCaps(await token2.getAddress())) - amount + 1n,
        },
        {
          name: "Exceed with multiple txs and different signers",
          successfulDeposits: [randBigInt(17), randBigInt(17)],
          lastSigner: () => eoa2,
          lastDeposit: async (amount) => BigInt(await bridge2.shortCaps(await token2.getAddress())) - amount + 1n,
        },
        {
          name: "Exceed with 1 tx",
          successfulDeposits: [],
          lastSigner: () => eoa1,
          lastDeposit: async (amount) => BigInt(await bridge2.shortCaps(await token2.getAddress())) - amount + 1n,
        },
      ];
      args.forEach(function (arg) {
        it(`Reverts when: ${arg.name}`, async () => {
          let tokenShortCap = 0n;
          for (const amount of arg.successfulDeposits) {
            tx = await bridge1.connect(eoa1).deposit(await token1.getAddress(), CHAIN_ID, eoa1.address, amount);
            receipt = await tx.wait();
            [encodedProof, rawReceipt, proofSignature, proofHash] = generateWithdrawalData(consensus, receipt);
            await bridge2.connect(eoa1).withdraw(encodedProof, rawReceipt, proofSignature);
            tokenShortCap += amount;
          }

          const lastAmount = await arg.lastDeposit(tokenShortCap);
          const tx1 = await bridge1.connect(eoa1).deposit(await token1.getAddress(), CHAIN_ID, arg.lastSigner().address, lastAmount);
          receipt = await tx1.wait();
          [encodedProof, rawReceipt, proofSignature, proofHash] = generateWithdrawalData(consensus, receipt);
          await expect(bridge2.connect(arg.lastSigner()).withdraw(encodedProof, rawReceipt, proofSignature)).to.be.revertedWith(
            "InceptionBridge/short-caps-exceeded"
          );
        });
      });
    });

    describe("longCaps reset each day", function () {
      before(async () => {
        await initIBridge();
        await bridge1.setShortCap(await token1.getAddress(), ethers.parseEther("10"));
        await bridge1.setLongCap(await token1.getAddress(), ethers.parseEther("10"));
        await bridge2.setShortCap(await token2.getAddress(), ethers.parseEther("10"));
        await bridge2.setLongCap(await token2.getAddress(), ethers.parseEther("10"));
        await token1.connect(deployer).mint(eoa2.address, ethers.parseEther("100"));
      });

      const args = [
        { amount: BigInt(ethers.parseEther("10")), signer: () => eoa1 },
        { amount: BigInt(ethers.parseEther("10")), signer: () => eoa1 },
        { amount: BigInt(ethers.parseEther("10")), signer: () => eoa2 },
      ];
      args.forEach(function (arg) {
        it(`depositCapDay per day: ${arg.amount}`, async () => {
          await toNextDay();

          const signer = arg.signer();
          await token1.connect(signer).approve(await bridge1.getAddress(), arg.amount);
          let tx1 = await bridge1.connect(signer).deposit(await token1.getAddress(), CHAIN_ID, eoa2.address, arg.amount);
          receipt = await tx1.wait();

          const short = await bridge1.getCurrentStamp(shortCapDuration);
          const long = await bridge1.getCurrentStamp(longCapDuration);
          expect(await bridge1.shortCapsDeposit(await token1.getAddress(), short)).to.be.eq(arg.amount);
          expect(await bridge1.longCapsDeposit(await token1.getAddress(), long)).to.be.eq(arg.amount);
          expect(await bridge1.shortCapsWithdraw(await token1.getAddress(), short)).to.be.eq(0n);
          expect(await bridge1.longCapsWithdraw(await token1.getAddress(), long)).to.be.eq(0n);
        });
        it(`withdrawTxCap per day: ${arg.amount}`, async () => {
          [encodedProof, rawReceipt, proofSignature, proofHash] = generateWithdrawalData(consensus, receipt);
          await bridge2.connect(eoa2).withdraw(encodedProof, rawReceipt, proofSignature);

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
      beforeEach(async () => {
        await initIBridge();
        await bridge1.setShortCap(await token1.getAddress(), ethers.parseEther("1000"));
        await bridge1.setLongCap(await token1.getAddress(), ethers.parseEther("10"));
        await token1.connect(deployer).mint(eoa2.address, ethers.parseEther("100"));
      });

      const args = [
        {
          name: "Exceed with multiple txs and the same signer",
          successfulDeposits: [randBigInt(17), randBigInt(17)],
          lastSigner: () => eoa1,
          lastDeposit: async (amount) => BigInt(await bridge1.longCaps(await token1.getAddress())) - amount + 1n,
        },
        {
          name: "Exceed with multiple txs and different signers",
          successfulDeposits: [randBigInt(17), randBigInt(17)],
          lastSigner: () => eoa2,
          lastDeposit: async (amount) => BigInt(await bridge1.longCaps(await token1.getAddress())) - amount + 1n,
        },
        {
          name: "Exceed with 1 tx",
          successfulDeposits: [],
          lastSigner: () => eoa1,
          lastDeposit: async (amount) => BigInt(await bridge1.longCaps(await token1.getAddress())) - amount + 1n,
        },
      ];
      args.forEach(function (arg) {
        it(`Reverts when: ${arg.name}`, async () => {
          let tokenLongCap = 0n;
          for (const amount of arg.successfulDeposits) {
            tx = await bridge1.connect(eoa1).deposit(await token1.getAddress(), CHAIN_ID, eoa1.address, amount);
            await tx.wait();
            tokenLongCap += amount;
          }
          const lastAmount = await arg.lastDeposit(tokenLongCap);
          await expect(
            bridge1.connect(arg.lastSigner()).deposit(await token1.getAddress(), CHAIN_ID, eoa1.address, lastAmount)
          ).to.be.revertedWith("InceptionBridge/long-caps-exceeded");
        });
      });
    });

    describe("longCap limit can not be exceeded on withdraw", function () {
      beforeEach(async () => {
        await initIBridge();
        await bridge1.setShortCap(await token1.getAddress(), ethers.parseEther("1000"));
        await bridge1.setLongCap(await token1.getAddress(), ethers.parseEther("1000"));
        await bridge2.setShortCap(await token2.getAddress(), ethers.parseEther("1000"));
        await bridge2.setLongCap(await token2.getAddress(), ethers.parseEther("10"));
        await token1.connect(deployer).mint(eoa2.address, ethers.parseEther("100"));
      });

      const args = [
        {
          name: "Exceed with multiple txs and the same signer",
          successfulDeposits: [randBigInt(18), randBigInt(18)],
          lastSigner: () => eoa1,
          lastDeposit: async (amount) => BigInt(await bridge2.longCaps(await token2.getAddress())) - amount + 1n,
        },
        {
          name: "Exceed with multiple txs and different signers",
          successfulDeposits: [randBigInt(18), randBigInt(18)],
          lastSigner: () => eoa2,
          lastDeposit: async (amount) => BigInt(await bridge2.longCaps(await token2.getAddress())) - amount + 1n,
        },
        {
          name: "Exceed with 1 tx",
          successfulDeposits: [],
          lastSigner: () => eoa1,
          lastDeposit: async (amount) => BigInt(await bridge2.longCaps(await token2.getAddress())) - amount + 1n,
        },
      ];
      args.forEach(function (arg) {
        it(`Reverts when: ${arg.name}`, async () => {
          let tokenLongCap = 0n;
          for (const amount of arg.successfulDeposits) {
            tx = await bridge1.connect(eoa1).deposit(await token1.getAddress(), CHAIN_ID, eoa1.address, amount);
            receipt = await tx.wait();
            [encodedProof, rawReceipt, proofSignature, proofHash] = generateWithdrawalData(consensus, receipt);
            await bridge2.connect(eoa1).withdraw(encodedProof, rawReceipt, proofSignature);
            tokenLongCap += amount;
          }

          const lastAmount = await arg.lastDeposit(tokenLongCap);
          const tx1 = await bridge1.connect(eoa1).deposit(await token1.getAddress(), CHAIN_ID, arg.lastSigner().address, lastAmount);
          receipt = await tx1.wait();
          [encodedProof, rawReceipt, proofSignature, proofHash] = generateWithdrawalData(consensus, receipt);
          await expect(bridge2.connect(arg.lastSigner()).withdraw(encodedProof, rawReceipt, proofSignature)).to.be.revertedWith(
            "InceptionBridge/long-caps-exceeded"
          );
        });
      });
    });

    describe("Caps setters", function () {
      beforeEach(async () => {
        await initIBridge();
      });

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
        await expect(bridge1.connect(eoa1).setShortCap(await token1.getAddress(), amount)).to.revertedWith(
          "Ownable: caller is not the owner"
        );
      });

      it("setShortCapDuration: sets new duration for short cap", async function () {
        const oldDur = await bridge1.shortCapDuration();
        const newDur = randBigInt(5);
        await expect(bridge1.setShortCapDuration(newDur)).to.emit(bridge1, "ShortCapDurationChanged").withArgs(oldDur, newDur);
        expect(await bridge1.shortCapDuration()).to.be.eq(newDur);
      });

      it("setShortCapDuration: reverts when called by not an owner", async function () {
        const newDur = randBigInt(5);
        await expect(bridge1.connect(eoa1).setShortCapDuration(newDur)).to.revertedWith("Ownable: caller is not the owner");
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
        await expect(bridge1.connect(eoa1).setLongCap(await token1.getAddress(), amount)).to.revertedWith(
          "Ownable: caller is not the owner"
        );
      });

      it("setLongCapDuration: sets new duration for short cap", async function () {
        const oldDur = await bridge1.longCapDuration();
        const newDur = randBigInt(5);
        await expect(bridge1.setLongCapDuration(newDur)).to.emit(bridge1, "LongCapDurationChanged").withArgs(oldDur, newDur);
        expect(await bridge1.longCapDuration()).to.be.eq(newDur);
      });

      it("setLongCapDuration: reverts when called by not an owner", async function () {
        const newDur = randBigInt(5);
        await expect(bridge1.connect(eoa1).setLongCapDuration(newDur)).to.revertedWith("Ownable: caller is not the owner");
      });
    });
  });
});

function generateWithdrawalData(signer, receipt) {
  [rawReceipt, receiptHash] = encodeTransactionReceipt(receipt);

  [encodedProof, proofHash] = encodeProof(
    CHAIN_ID,
    1,
    receipt.hash,
    receipt.blockNumber,
    receipt.blockHash,
    receipt.index,
    receiptHash,
    web3x.utils.padLeft(web3x.utils.toHex(amount.toString()), 64)
  );

  const accounts = config.networks.hardhat.accounts;
  const mn = ethers.Mnemonic.fromPhrase(accounts.mnemonic);

  for (i = 0; ; i++) {
    const wallet1 = ethers.HDNodeWallet.fromMnemonic(mn, `m/44'/60'/0'/0/${i}`);
    if (wallet1.address === signer.address) {
      const privateKey = wallet1.privateKey.substring(2);
      proofSignature = signMessageUsingPrivateKey(privateKey, proofHash);
      break;
    }
  }

  return [encodedProof, rawReceipt, proofSignature, proofHash];
}

async function increaseTime(seconds) {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
}

async function toNextDay() {
  const block = await ethers.provider.getBlock("latest");
  const nextDayTs = Math.floor(block.timestamp / 86400 + 1) * 86400;
  await increaseTime(nextDayTs - block.timestamp);
}

async function toNextHour() {
  const block = await ethers.provider.getBlock("latest");
  const nextDayTs = Math.floor(block.timestamp / 3600 + 1) * 3600;
  await increaseTime(nextDayTs - block.timestamp);
}
