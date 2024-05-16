const { ethers, network } = require("hardhat");

/***************************************
 ************* Bridge Setup ************
 ***************************************/

async function setupBridge(bridgeConfig) {
  const localChainID = network.config.chainId;
  console.log(`chainID: ${localChainID}`);

  const bridgeSetup = bridgeConfig[localChainID];
  const bridgesToAdd = bridgeSetup["bridgesToAdd"];
  const tokenToAdd = bridgeSetup["tokens"];

  const bridge = await ethers.getContractAt("InceptionBridge", bridgeSetup["bridgeAddress"]);

  console.log("############################################################");
  console.log("################ Set up destination bridges ################");
  console.log("############################################################\n");

  for (let i = 0; i < bridgesToAdd.length; i++) {
    console.log(`new bridge address: ${bridgesToAdd[i].address}; chainID: ${bridgesToAdd[i].destinationChainID}\n`);
    tx = await bridge.addBridge(bridgesToAdd[i].address, bridgesToAdd[i].destinationChainID);
    await tx.wait();
  }

  if (tokenToAdd.length > 0) {
    console.log("#########################################################");
    console.log("################ Set up supported tokens ################");
    console.log("#########################################################\n");

    for (let i = 0; i < tokenToAdd.length; i++) {
      const originalTokenAddress = tokenToAdd[i].fromToken;
      console.log(
        `originalTokenAddress(${originalTokenAddress})\ntoToken: chainID(${tokenToAdd[i].destinationChainID}); address(${tokenToAdd[i].destinationAddress})`
      );

      tx = await bridge.addDestination(originalTokenAddress, tokenToAdd[i].destinationChainID, tokenToAdd[i].destinationAddress);
      await tx.wait();

      console.log(`shortCap: ${tokenToAdd[i].shortCap}; longCap: ${tokenToAdd[i].longCap}`);
      tx = await bridge.setShortCap(originalTokenAddress, tokenToAdd[i].shortCap);
      await tx.wait();
      tx = await bridge.setLongCap(originalTokenAddress, tokenToAdd[i].longCap);
      await tx.wait();

      console.log(`token(${originalTokenAddress}) was added into the bridge`);
    }
  }

  console.log("Setup successfully");
}

module.exports = {
  setupBridge,
};
