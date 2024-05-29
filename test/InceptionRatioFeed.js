const { ethers, upgrades } = require("hardhat");
const { advanceTime, takeSnapshot, toWei, e18, randBigInt } = require("./helpers/utils");
const { expect } = require("chai");

describe("InceptionRatioFeed", function () {
  this.timeout(15000);
  let ratioFeed, token1, token2;
  let owner, operator, signer1;
  let ratioThreshold;
  let snapshot;

  async function init(operator) {
    console.log('=== InceptionRatioFeed');
    const RatioFeed = await ethers.getContractFactory("InceptionRatioFeed");
    const ratioFeed = await upgrades.deployProxy(RatioFeed, [operator.address]);
    await expect(ratioFeed.deploymentTransaction())
      .to.emit(ratioFeed, "OperatorUpdated")
      .withArgs(ethers.ZeroAddress, operator.address);

    console.log('=== ERC20Mintable #1');
    const token1 = await ethers.deployContract("ERC20Mintable", ["SomeToken1", "SMT1"]);
    token1.address = await token1.getAddress();
    console.log('=== ERC20Mintable #2');
    const token2 = await ethers.deployContract("ERC20Mintable", ["SomeToken2", "SMT2"]);
    token2.address = await token2.getAddress();

    return [ratioFeed, token1, token2]
  }

  before(async function () {
    [owner, operator, signer1] = await ethers.getSigners();
    [ratioFeed, token1, token2] = await init(operator);
    snapshot = await takeSnapshot();
  });

  describe("works with nonrebasing bonds", function () {
    before(async function () {
      await snapshot.restore()
    })

    it("set ratio threshold and init ratio for the tokens", async () => {
      // try to update ratios without setted threshold
      await expect(ratioFeed.updateRatioBatch([token1.address, token2.address], [e18, e18])).to.revertedWithCustomError(
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
      expect(event.args["prevValue"]).to.be.eq(ethers.ZeroAddress);
      expect(event.args["newValue"]).to.be.eq(ratioThreshold);

      // update with init ratios
      tx = await ratioFeed.updateRatioBatch([token1.address, token2.address], [e18, e18]);
      receipt = await tx.wait();
      let filter = ratioFeed.filters.RatioUpdated;
      let events = await ratioFeed.queryFilter(filter, -1);

      expect(events.length).to.be.eq(2);
      assertRatioUpdatedEvent(events[0], token1.address, "0", e18);
      assertRatioUpdatedEvent(events[1], token2.address, "0", e18);

      expect((await ratioFeed.getRatioFor(token1.address)).toString()).to.be.eq(e18);
      expect((await ratioFeed.getRatioFor(token2.address)).toString()).to.be.eq(e18);
    });

    it("update ratio too frequently ", async () => {
      await advanceTime(1);
      // the same ratio
      const newRatio = e18;

      await ratioFeed.updateRatioBatch([token1.address, token2.address], [newRatio, newRatio]);
      let filter = ratioFeed.filters.RatioNotUpdated;
      let events = await ratioFeed.queryFilter(filter, -1);

      expect(events.length).to.be.eq(2);
      assertRatioNotUpdatedEvent(events[0], token1.address, newRatio, "update time range exceeds");
      assertRatioNotUpdatedEvent(events[1], token2.address, newRatio, "update time range exceeds");
    });

    it("update ratio after 12 hrs multiple times", async () => {
      const twelveHoursSec = 60 * 60 * 12 + 30; // 12h 0m 30s in seconds
      await advanceTime(twelveHoursSec);

      const newRatio = "999999999999999999";

      await ratioFeed.updateRatioBatch([token1.address, token2.address], [newRatio, newRatio]);
      let filter = ratioFeed.filters.RatioUpdated;
      let events = await ratioFeed.queryFilter(filter, -1);

      expect(events.length).to.be.eq(2);
      assertRatioUpdatedEvent(events[0], token1.address, e18, newRatio.toString());
      assertRatioUpdatedEvent(events[1], token2.address, e18, newRatio.toString());

      expect((await ratioFeed.getRatioFor(token1.address)).toString()).to.be.eq(newRatio);
      expect((await ratioFeed.getRatioFor(token2.address)).toString()).to.be.eq(newRatio);

      await advanceTime(1);

      await ratioFeed.updateRatioBatch([token1.address, token2.address], [newRatio, newRatio]);
      filter = ratioFeed.filters.RatioNotUpdated;
      events = await ratioFeed.queryFilter(filter, -1);

      expect(events.length).to.be.eq(2);
      assertRatioNotUpdatedEvent(events[0], token1.address, newRatio, "update time range exceeds");
      assertRatioNotUpdatedEvent(events[1], token2.address, newRatio, "update time range exceeds");
    });

    it("update ratio with too high value", async () => {
      // wait for more than 12 hours
      await advanceTime(43300);

      const newRatio = "10000000000000000000";
      await ratioFeed.updateRatioBatch([token2.address], [newRatio]);
      filter = ratioFeed.filters.RatioNotUpdated;
      events = await ratioFeed.queryFilter(filter, -1);

      expect(events.length).to.be.eq(1);
      assertRatioNotUpdatedEvent(events[0], token2.address, newRatio, "new ratio is greater than old");
    });

    it("update ratio with too low value", async () => {
      // wait for more than 12 hours
      await advanceTime(43300);

      const newRatio = "100000000000000000";
      await ratioFeed.updateRatioBatch([token1.address], [newRatio]);
      filter = ratioFeed.filters.RatioNotUpdated;
      events = await ratioFeed.queryFilter(filter, -1);

      expect(events.length).to.be.eq(1);
      assertRatioNotUpdatedEvent(events[0], token1.address, newRatio, "new ratio too low");
    });

    it("update ratio with normal ratio", async () => {
      // wait for more than 12 hours
      await advanceTime(43300);
      const initRatio1 = (await ratioFeed.getRatioFor(token1.address)).toString();
      const initRatio2 = (await ratioFeed.getRatioFor(token2.address)).toString();

      const newRatio = "956814480611127200";

      await ratioFeed.updateRatioBatch([token1.address, token2.address], [newRatio, newRatio]);
      filter = ratioFeed.filters.RatioUpdated;
      events = await ratioFeed.queryFilter(filter, -1);

      expect(events.length).to.be.eq(2);
      assertRatioUpdatedEvent(events[0], token1.address, initRatio1, newRatio);
      assertRatioUpdatedEvent(events[1], token2.address, initRatio2, newRatio);

      // wait for more than 12 hours
      await advanceTime(43300);

      // set a ratio threshold to 0.05%
      ratioThreshold = "50000";
      await ratioFeed.setRatioThreshold(ratioThreshold);

      const newRatio2 = "956759885384198800";
      await ratioFeed.updateRatioBatch([token1.address, token2.address], [newRatio2, newRatio2]);
      events = await ratioFeed.queryFilter(filter, -1);
      expect(events.length).to.be.eq(2);

      assertRatioUpdatedEvent(events[0], token1.address, newRatio, newRatio2);
      assertRatioUpdatedEvent(events[1], token2.address, newRatio, newRatio2);
    });

    it("repair ratio by owner", async () => {
      let newRatio = "0";
      await advanceTime(1);
      const initRatio1 = (await ratioFeed.getRatioFor(token1.address)).toString();

      await expect(ratioFeed.repairRatioFor(token1.address, newRatio)).to.revertedWithCustomError(ratioFeed, "NullParams");
      await expect(ratioFeed.connect(signer1).repairRatioFor(token1.address, newRatio)).to.revertedWithCustomError(
        ratioFeed,
        "OwnableUnauthorizedAccount"
      );

      newRatio = "10000000";
      await ratioFeed.repairRatioFor(token1.address, newRatio);
      filter = ratioFeed.filters.RatioUpdated;
      events = await ratioFeed.queryFilter(filter, -1);

      expect(events.length).to.be.eq(1);
      assertRatioUpdatedEvent(events[0], token1.address, initRatio1, newRatio.toString());
      expect((await ratioFeed.getRatioFor(token1.address)).toString()).to.be.eq(newRatio);
    });
  });

  describe("Setters", function () {
    describe("setRatioThreshold", function () {
      before(async function () {
        await snapshot.restore();
      })

      const args = [
        {
          name: "Max value -1",
          threshold: async () => await ratioFeed.MAX_THRESHOLD() - 1n
        },
        {
          name: "1",
          threshold: async () => 1n
        },
        {
          name: "Random value",
          threshold: async () => randBigInt(7)
        }
      ]

      args.forEach(function (arg) {
        it(`Set threshold: ${arg.name}`, async function () {
          const threshBefore = await ratioFeed.ratioThreshold();
          const thresh = await arg.threshold();
          await expect(ratioFeed.setRatioThreshold(thresh))
            .to.emit(ratioFeed, "RatioThresholdChanged")
            .withArgs(threshBefore, thresh);

          expect(await ratioFeed.ratioThreshold()).to.be.eq(thresh);
        })
      })

      const invalidArgs = [
        {
          name: "new value equals MAX_THRESHOLD",
          threshold: async () => await ratioFeed.MAX_THRESHOLD(),
          sender: () => owner,
          error: "NewRatioThresholdInvalid"
        },
        {
          name: "new value equals 0",
          threshold: async () => await ratioFeed.MAX_THRESHOLD(),
          sender: () => owner,
          error: "NewRatioThresholdInvalid"
        },
        {
          name: "called by not an owner",
          threshold: async () => await ratioFeed.MAX_THRESHOLD(),
          sender: () => operator,
          error: "OwnableUnauthorizedAccount"
        },
      ]

      invalidArgs.forEach(function (arg) {
        it(`Reverts when ${arg.name}`, async function () {
          const sender = arg.sender();
          const thresh = await arg.threshold();
          await expect(ratioFeed.connect(sender).setRatioThreshold(thresh))
            .to.be.revertedWithCustomError(ratioFeed, arg.error);
        })
      })
    })

    //TODO: finish
    describe("setInceptionOperator", function () {
      before(async function () {
        await snapshot.restore();
      })
    })
  })


  describe("Update ratio batch", function () {
    let threshold;
    let MAX_THRESHOLD;
    before(async function () {
      await snapshot.restore();
      MAX_THRESHOLD = await ratioFeed.MAX_THRESHOLD();
      threshold = MAX_THRESHOLD / 100n; //1%
      await ratioFeed.setRatioThreshold(threshold);
    })

    const args = [
      {
        name: "token1 0->1",
        waitBefore: 0n,
        threshold: async () => threshold,
        tokens: () => [token1.address],
        ratios: () => [e18],
        updatedTokens: () => [0]
      },
      {
        name: "token2 0->1 without delay",
        waitBefore: 0n,
        threshold: async () => threshold,
        tokens: () => [token2.address],
        ratios: () => [e18],
        updatedTokens: () => [0]
      },
      {
        name: "Both tokens to the same value after 12h",
        waitBefore: 12 * 3600,
        threshold: async () => threshold,
        tokens: () => [token1.address, token2.address],
        ratios: () => [e18, e18],
        updatedTokens: () => [0, 1]
      },
      {
        name: "Both tokens in less than 12h - nothing has been updated",
        waitBefore: 11 * 3600,
        threshold: async () => threshold,
        tokens: () => [token1.address, token2.address],
        ratios: () => [toWei("0.99"), toWei("0.99")],
        updatedTokens: () => []
      },
      {
        name: "token1 -> 0.99 after 12 since last update",
        waitBefore: 2 * 3600,
        threshold: async () => threshold,
        tokens: () => [token1.address],
        ratios: () => [toWei("0.99")],
        updatedTokens: () => [0]
      },
      {
        name: "token1 and token2 -> 0.99 but 12h have passed only for token2",
        waitBefore: 3600,
        threshold: async () => threshold,
        tokens: () => [token1.address, token2.address],
        ratios: () => [toWei("0.985"), toWei("0.99")],
        updatedTokens: () => [1]
      },
      {
        name: "2 times for token1 - only the first accepted",
        waitBefore: 12 * 3600,
        threshold: async () => threshold,
        tokens: () => [token1.address, token1.address],
        ratios: () => [toWei("0.985"), toWei("0.984")],
        updatedTokens: () => [0]
      },
    ]

    args.forEach(function (arg) {

      it(`Update ratio batch: ${arg.name}`, async function () {
        if (threshold !== await arg.threshold()) {
          threshold = arg.threshold();
          console.log(`Updating threshold to: ${threshold}`);
          await ratioFeed.setRatioThreshold(threshold);
        }
        if (arg.waitBefore > 0n) {
          await advanceTime(arg.waitBefore);
        }
        const oldRatios = [];
        for (const token of arg.tokens()) {
          const ratio = await ratioFeed.getRatioFor(token);
          oldRatios.push(ratio);
        }

        const tokens = arg.tokens();
        const ratios = arg.ratios();
        console.log(`Operator contract: ${await ratioFeed.inceptionOperator()}`);
        console.log(`Operator address: ${operator.address}`);
        let tx = await ratioFeed.connect(operator).updateRatioBatch(tokens, ratios);
        let rec = await tx.wait();
        const actualUpdates = [];
        const actualFailedUpdates = [];
        rec.logs.forEach(l => {
          if (l.eventName === "RatioUpdated") {
            actualUpdates.push({
              tokenAddr: l.args[0],
              oldRatio: l.args[1],
              newRatio: l.args[2]
            })
          }
          if (l.eventName === "RatioNotUpdated") {
            actualFailedUpdates.push({
              tokenAddr: l.args[0],
              newRatio: l.args[1]
            })
          }
        });
        console.log(`Number of accepted ratios: ${actualUpdates.length}`);
        console.log(`Number of declined ratios: ${actualFailedUpdates.length}`);

        for (const i of arg.updatedTokens()) {
          expect(await ratioFeed.getRatioFor(tokens[i])).to.be.eq(ratios[i]);
        }
        //Events
        const expectedUpdates = [];
        const expectedFailedUpdates = [];
        for (let i = 0; i < tokens.length; i++) {
          if (arg.updatedTokens().includes(i)) {
            expectedUpdates.push({
              tokenAddr: tokens[i],
              oldRatio: oldRatios[i],
              newRatio: ratios[i]
            });
          } else {
            expectedFailedUpdates.push({
              tokenAddr: tokens[i],
              newRatio: ratios[i],
            });
          }
        }
        expect(actualUpdates).to.have.deep.members(expectedUpdates);
        expect(actualFailedUpdates).to.have.deep.members(expectedFailedUpdates);
      })
    })

    const invalidRatios = [
      {
        name: "out of threshold",
        threshold: () => MAX_THRESHOLD / 100n,
        fromRatio: () => e18,
        toRatio: () => toWei(0.99) - 1n,
        sender: () => operator,
        timeWait: 12*3600,
        reason: "new ratio too low",
      },
      {
        name: "new ratio is greater than prior",
        threshold: () => MAX_THRESHOLD / 100n,
        fromRatio: () => toWei(0.99),
        toRatio: () => toWei(0.99) + 1n,
        sender: () => operator,
        timeWait: 12*3600,
        reason: "new ratio is greater than old",
      },
      {
        name: "less than 12h have passed since last update",
        threshold: () => MAX_THRESHOLD / 100n,
        fromRatio: () => e18,
        toRatio: () => toWei(0.99),
        sender: () => operator,
        timeWait: 3600,
        reason: "update time range exceeds",
      },
    ]

    invalidRatios.forEach(function(arg) {
      it(`Skips update when: ${arg.name}`, async function(){
        await snapshot.restore();
        await ratioFeed.setRatioThreshold(arg.threshold());
        await ratioFeed.connect(operator).updateRatioBatch([token1.address], [arg.fromRatio()]);
        await advanceTime(arg.timeWait);

        await expect(ratioFeed.connect(arg.sender()).updateRatioBatch([token1.address], [arg.toRatio()]))
          .to.emit(ratioFeed, "RatioNotUpdated")
          .withArgs(token1.address, arg.toRatio(), arg.reason);
      })
    })

    it("Reverts when threshold is not set", async function() {
      await snapshot.restore();
      await expect(ratioFeed.connect(operator).updateRatioBatch([token1.address], [e18]))
        .to.be.revertedWithCustomError(ratioFeed, "RatioThresholdNotSet")
    })

    it("Reverts when arrays have different length", async function() {
      await snapshot.restore();
      await ratioFeed.setRatioThreshold(MAX_THRESHOLD/100n);
      await expect(ratioFeed.connect(operator).updateRatioBatch([token1.address], [e18, e18]))
        .to.be.revertedWithCustomError(ratioFeed, "InconsistentInputData")
    })

    it("Reverts when paused", async function() {
      await snapshot.restore();
      await ratioFeed.setRatioThreshold(MAX_THRESHOLD/100n);
      await ratioFeed.pause();
      await expect(ratioFeed.connect(operator).updateRatioBatch([token1.address], [e18]))
        .to.be.revertedWithCustomError(ratioFeed, "EnforcedPause")
    })

    it("Reverts when called by not an operator", async function() {
      await snapshot.restore();
      await ratioFeed.setRatioThreshold(MAX_THRESHOLD/100n);
      await expect(ratioFeed.connect(signer1).updateRatioBatch([token1.address], [e18]))
        .to.be.revertedWithCustomError(ratioFeed, "OperatorUnauthorizedAccount")
        .withArgs(signer1.address);
    })

  })

  describe("Ratio history", function() {
    let ratio = e18;
    const step = 1000_000_000_000_000n;
    let historicalRatios = [0n, e18];
    const day = 86400n;
    before(async function () {
      await snapshot.restore();
      await ratioFeed.setRatioThreshold(20_000_000n)//20%
    });

    it("Fill ratio history", async () => {
      let latestOffset = historicalRatios[0]
      for (let i = 0; i < 8; i++) {
        console.log(`i: ${i}`);
        // add 1 day
        await advanceTime(day);
        // update ratio
        ratio = ratio - step;
        console.log(`ratio before: ${await ratioFeed.getRatioFor(token1.address)}`);
        await ratioFeed.connect(operator).updateRatioBatch([token1.address], [ratio]);
        console.log(`ratio after: ${await ratioFeed.getRatioFor(token1.address)}`);
        console.log(`historical data ${await ratioFeed.averagePercentageRate(token1.address, (i)%7+1)}`);
        // update history rate array
        historicalRatios[latestOffset % 8n + 1n] = ratio;
        // increment offset
        latestOffset = latestOffset + 1n
        historicalRatios[0] = latestOffset;
      }
    });

    for (let day = 1n; day < 8n; day++) {
      it(`Ratio history for ${day} day(s)`, async () => {
        const latestOffset = historicalRatios[0];

        let oldestRatio = historicalRatios[((latestOffset - day + 7n) % 8n) + 1n];
        const newestRatio = historicalRatios[(latestOffset + 7n) % 8n + 1n];

        let averageRate = await ratioFeed.averagePercentageRate(token1.address, day);
        let expectedRate = (oldestRatio - newestRatio) * (100n * e18) * 365n / (oldestRatio * day);
        console.log(`Average ratio: ${averageRate}`);
        expect(averageRate).to.be.eq(expectedRate);
      });
    }

    it('averagePercentageRate(): when day is 0', async () => {
      await expect(ratioFeed.averagePercentageRate(token1.address, 0n))
        .to.revertedWithCustomError(ratioFeed, "IncorrectDay")
        .withArgs(0n);
    });

    it('averagePercentageRate(): when day is 8', async () => {
      await expect(ratioFeed.averagePercentageRate(token1.address, 8n))
        .to.revertedWithCustomError(ratioFeed, "IncorrectDay")
        .withArgs(8n);
    });

    it('averagePercentageRate(): when there is no data', async () => {
      console.log(await ratioFeed.averagePercentageRate(ethers.Wallet.createRandom().address, 1n));
    });
  })
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
