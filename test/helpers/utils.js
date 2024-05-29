/** @var web3 {Web3} */
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");

const toWei = (ether) => ethers.parseEther(ether.toString());

const e18 = toWei(1);

function randBigInt(length) {
  if (length > 0) {
    let randomNum = "";
    randomNum += Math.floor(Math.random() * 9) + 1; // generates a random digit 1-9
    for (let i = 0; i < length - 1; i++) {
      randomNum += Math.floor(Math.random() * 10); // generates a random digit 0-9
    }
    return BigInt(randomNum);
  } else {
    return 0n;
  }
}
const advanceTime = async (seconds) => await helpers.time.increase(seconds);

const advanceBlock = async (count = 1) => await helpers.mine(count);

const takeSnapshot = async () => await helpers.takeSnapshot();

module.exports = {
  advanceTime,
  advanceBlock,
  takeSnapshot,
  toWei,
  e18,
  randBigInt
};
