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

  if (bridgesToAdd !== undefined) {
    for (let i = 0; i < bridgesToAdd.length; i++) {
      try {
        // tx = await bridge.addBridge(bridgesToAdd[i].address, bridgesToAdd[i].destinationChainID);
        // await tx.wait();
        console.log(`new bridge address: ${bridgesToAdd[i].address}; chainID: ${bridgesToAdd[i].destinationChainID} was added\n`);
      } catch (e) {
        console.warn(`the bridge ${bridgesToAdd[i].address} to ${bridgesToAdd[i].destinationChainID} was skipped`);
      }
    }
  }

  if (tokenToAdd.length > 0) {
    console.log("\n#########################################################");
    console.log("################ Set up supported tokens ################");
    console.log("#########################################################\n");

    for (let i = 0; i < tokenToAdd.length; i++) {
      const originalTokenAddress = tokenToAdd[i].fromToken;
      console.log(
        `originalTokenAddress(${originalTokenAddress})\ntoToken: chainID(${tokenToAdd[i].destinationChainID}); address(${tokenToAdd[i].destinationAddress})`
      );

      const destination = (await bridge.getDestination(originalTokenAddress, tokenToAdd[i].destinationChainID)).toString();
      if (destination == "0x0000000000000000000000000000000000000000") {
        // tx = await bridge.addDestination(originalTokenAddress, tokenToAdd[i].destinationChainID, tokenToAdd[i].destinationAddress);
        // await tx.wait();
      }

      const currentShortCap = (await bridge.shortCaps(originalTokenAddress)).toString();
      const currentLongCap = (await bridge.longCaps(originalTokenAddress)).toString();

      console.log(`new caps short: ${tokenToAdd[i].shortCap}; long: ${tokenToAdd[i].longCap}`);
      console.log(`curr caps short: ${currentShortCap}; long: ${currentLongCap}`);

      if (currentShortCap == "0") {
        tx = await bridge.setShortCap(originalTokenAddress, tokenToAdd[i].shortCap);
        await tx.wait();
      }
      if (currentLongCap == "0") {
        tx = await bridge.setLongCap(originalTokenAddress, tokenToAdd[i].longCap);
        await tx.wait();
      }

      console.log(`token(${originalTokenAddress}) was added into the bridge\n\n`);
    }
  }

  console.log("Setup successfully");
}

module.exports = {
  setupBridge,
};
