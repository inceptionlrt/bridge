const { ethers } = require("hardhat");
const { advanceTimeAndBlock } = require("./helpers/evm_utils");
const { expect } = require("chai");
const { parseEther, ZeroAddress } = require("ethers");

const e18 = parseEther("1").toString();

describe("InceptionRatioFeed", function () {
  describe("works with nonrebasing bonds", async () => {
    this.timeout(15000);

    let someToken1, someToken2, someToken1Address, someToken2Address, ratioFeed, ratioThreshold, owner, user;

    before(async function () {
      [owner, user] = await ethers.getSigners();

      const SimpleToken = await ethers.getContractFactory("ERC20Mintable");
      const InceptionRatioFeed = await ethers.getContractFactory("InceptionRatioFeed");

      // initialize some tokens
      someToken1 = await SimpleToken.deploy("SomeToken1", "SMT1");
      someToken2 = await SimpleToken.deploy("SomeToken2", "SMT2");

      someToken1Address = await someToken1.getAddress();
      someToken2Address = await someToken2.getAddress();

      //   // ratio feed
      ratioFeed = await InceptionRatioFeed.deploy();
      await ratioFeed.initialize(owner);
    });

    it("set ratio threshold and init ratio for the tokens", async () => {
      // try to update ratios without setted threshold
      await expect(ratioFeed.updateRatioBatch([someToken1Address, someToken2Address], [e18, e18])).to.revertedWithCustomError(
        ratioFeed,
        "RatioThresholdNotSet"
      );

      // set a ratio threshold more than it requires
      ratioThreshold = "5000000000";

      await expect(ratioFeed.setRatioThreshold(ratioThreshold)).to.be.revertedWithCustomError(ratioFeed, "NewRatioThresholdInvalid");

      // set a ratio threshold to 50%
      ratioThreshold = "50000000";
      let tx = await ratioFeed.setRatioThreshold(ratioThreshold);
      let receipt = await tx.wait();
      let event = receipt.logs.find((e) => e.eventName === "RatioThresholdChanged");
      expect(event.args["prevValue"]).to.be.eq(ZeroAddress);
      expect(event.args["newValue"]).to.be.eq(ratioThreshold);

      // update with init ratios
      tx = await ratioFeed.updateRatioBatch([someToken1Address, someToken2Address], [e18, e18]);
      receipt = await tx.wait();
      let filter = ratioFeed.filters.RatioUpdated;
      let events = await ratioFeed.queryFilter(filter, -1);

      expect(events.length).to.be.eq(2);
      assertRatioUpdatedEvent(events[0], someToken1Address, "0", e18);
      assertRatioUpdatedEvent(events[1], someToken2Address, "0", e18);

      expect((await ratioFeed.getRatioFor(someToken1Address)).toString()).to.be.eq(e18);
      expect((await ratioFeed.getRatioFor(someToken2Address)).toString()).to.be.eq(e18);
    });

    it("update ratio too frequently ", async () => {
      await advanceTimeAndBlock(1);
      // the same ratio
      const newRatio = e18;

      await ratioFeed.updateRatioBatch([someToken1Address, someToken2Address], [newRatio, newRatio]);
      let filter = ratioFeed.filters.RatioNotUpdated;
      let events = await ratioFeed.queryFilter(filter, -1);

      expect(events.length).to.be.eq(2);
      assertRatioNotUpdatedEvent(events[0], someToken1Address, newRatio, "update time range exceeds");
      assertRatioNotUpdatedEvent(events[1], someToken2Address, newRatio, "update time range exceeds");
    });

    it("update ratio after 12 hrs multiple times", async () => {
      const twelveHoursSec = 60 * 60 * 12 + 30; // 12h 0m 30s in seconds
      await advanceTimeAndBlock(twelveHoursSec);

      const newRatio = "999999999999999999";

      await ratioFeed.updateRatioBatch([someToken1Address, someToken2Address], [newRatio, newRatio]);
      let filter = ratioFeed.filters.RatioUpdated;
      let events = await ratioFeed.queryFilter(filter, -1);

      expect(events.length).to.be.eq(2);
      assertRatioUpdatedEvent(events[0], someToken1Address, e18, newRatio.toString());
      assertRatioUpdatedEvent(events[1], someToken2Address, e18, newRatio.toString());

      expect((await ratioFeed.getRatioFor(someToken1Address)).toString()).to.be.eq(newRatio);
      expect((await ratioFeed.getRatioFor(someToken2Address)).toString()).to.be.eq(newRatio);

      await advanceTimeAndBlock(1);

      await ratioFeed.updateRatioBatch([someToken1Address, someToken2Address], [newRatio, newRatio]);
      filter = ratioFeed.filters.RatioNotUpdated;
      events = await ratioFeed.queryFilter(filter, -1);

      expect(events.length).to.be.eq(2);
      assertRatioNotUpdatedEvent(events[0], someToken1Address, newRatio, "update time range exceeds");
      assertRatioNotUpdatedEvent(events[1], someToken2Address, newRatio, "update time range exceeds");
    });

    it("update ratio with too high value", async () => {
      // wait for more than 12 hours
      await advanceTimeAndBlock(43300);

      const newRatio = "10000000000000000000";
      await ratioFeed.updateRatioBatch([someToken2Address], [newRatio]);
      filter = ratioFeed.filters.RatioNotUpdated;
      events = await ratioFeed.queryFilter(filter, -1);

      expect(events.length).to.be.eq(1);
      assertRatioNotUpdatedEvent(events[0], someToken2Address, newRatio, "new ratio is greater than old");
    });

    it("update ratio with too low value", async () => {
      // wait for more than 12 hours
      await advanceTimeAndBlock(43300);

      const newRatio = "100000000000000000";
      await ratioFeed.updateRatioBatch([someToken1Address], [newRatio]);
      filter = ratioFeed.filters.RatioNotUpdated;
      events = await ratioFeed.queryFilter(filter, -1);

      expect(events.length).to.be.eq(1);
      assertRatioNotUpdatedEvent(events[0], someToken1Address, newRatio, "new ratio too low");
    });

    it("update ratio with normal ratio", async () => {
      // wait for more than 12 hours
      await advanceTimeAndBlock(43300);
      const initRatio1 = (await ratioFeed.getRatioFor(someToken1Address)).toString();
      const initRatio2 = (await ratioFeed.getRatioFor(someToken2Address)).toString();

      const newRatio = "956814480611127200";

      await ratioFeed.updateRatioBatch([someToken1Address, someToken2Address], [newRatio, newRatio]);
      filter = ratioFeed.filters.RatioUpdated;
      events = await ratioFeed.queryFilter(filter, -1);

      expect(events.length).to.be.eq(2);
      assertRatioUpdatedEvent(events[0], someToken1Address, initRatio1, newRatio);
      assertRatioUpdatedEvent(events[1], someToken2Address, initRatio2, newRatio);

      // wait for more than 12 hours
      await advanceTimeAndBlock(43300);

      // set a ratio threshold to 0.05%
      ratioThreshold = "50000";
      await ratioFeed.setRatioThreshold(ratioThreshold);

      const newRatio2 = "956759885384198800";
      await ratioFeed.updateRatioBatch([someToken1Address, someToken2Address], [newRatio2, newRatio2]);
      events = await ratioFeed.queryFilter(filter, -1);
      expect(events.length).to.be.eq(2);

      assertRatioUpdatedEvent(events[0], someToken1Address, newRatio, newRatio2);
      assertRatioUpdatedEvent(events[1], someToken2Address, newRatio, newRatio2);
    });

    it("repair ratio by owner", async () => {
      let newRatio = "0";
      await advanceTimeAndBlock(1);
      const initRatio1 = (await ratioFeed.getRatioFor(someToken1Address)).toString();

      await expect(ratioFeed.repairRatioFor(someToken1Address, newRatio)).to.revertedWithCustomError(ratioFeed, "NullParams");
      await expect(ratioFeed.connect(user).repairRatioFor(someToken1Address, newRatio)).to.revertedWithCustomError(
        ratioFeed,
        "OwnableUnauthorizedAccount"
      );

      newRatio = "10000000";
      await ratioFeed.repairRatioFor(someToken1Address, newRatio);
      filter = ratioFeed.filters.RatioUpdated;
      events = await ratioFeed.queryFilter(filter, -1);

      expect(events.length).to.be.eq(1);
      assertRatioUpdatedEvent(events[0], someToken1Address, initRatio1, newRatio.toString());
      expect((await ratioFeed.getRatioFor(someToken1Address)).toString()).to.be.eq(newRatio);
    });
  });
});

const assertRatioUpdatedEvent = (event, tokenAddress, oldRatio, newRatio) => {
  expect(event.args.tokenAddress).to.be.eq(tokenAddress);
  expect(event.args.prevValue).to.be.eq(oldRatio);
  expect(event.args.newValue).to.be.eq(newRatio);
};

const assertRatioNotUpdatedEvent = (event, tokenAddress, failedRatio, reason) => {
  expect(event.args.tokenAddress).to.be.eq(tokenAddress);
  expect(event.args.failedRatio).to.be.eq(failedRatio);
  expect(event.args.reason).to.be.eq(reason);
};
