const fs = require("fs");
const { ethers, network } = require("hardhat");
const { printBalance } = require("./utils");
const eth = require("ethereumjs-util");
const rlp = require("rlp");
const Web3 = require("web3");
const abiCoder = require("web3-eth-abi");

/***************************************
 ************* Bridge Setup ************
 ***************************************/

async function setupBridge(bridgeTokens, bridgesToAdd) {
  if (bridgesToAdd && bridgesToAdd.length > 0) {
    console.log("############################################################");
    console.log("################ Set up destination bridges ################");
    console.log("############################################################\n");

    for (let i = 0; i < bridgesToAdd.length; i++) {
      console.log(`new bridge to add\n  address:${bridgesToAdd[i].address}; chainID: ${bridge[i].chainID}\n\n`);
      tx = await bridge.addBridge(bridgesToAdd[i].address, bridge[i].chainID);
      await tx.wait();
    }
  }

  if (bridgesToAdd && bridgeTokens.length > 0) {
    console.log("#########################################################");
    console.log("################ Set up supported tokens ################");
    console.log("#########################################################\n");

    for (let i = 0; i < bridgeTokens.length; i++) {
      const originalTokenAddress = bridgeTokens[i].fromToken;
      tx = await bridge.addDestination(originalTokenAddress, bridgeTokens[i].destinationChainID, bridgeTokens[i].destinationToken);
      await tx.wait();

      tx = await bridge.setShortCap(originalTokenAddress, ethers.parseEther("1000"));
      await tx.wait();
      tx = await bridge.setLongCap(originalTokenAddress, ethers.parseEther("1000"));
      await tx.wait();

      console.log(`token(${originalTokenAddress}) was added into the bridge`);
    }
  }

  console.log(`Bridge for the network ${deployer.network} was deployed successfully`);
}

module.exports = {
  setupBridge,
};
