const fs = require("fs");
const { ethers } = require("hardhat");
const { printBalance } = require("../utils");

const deployFactory = async () => {
  console.log("##################################################################");
  console.log("###################### Transfering Ownerhips #####################");
  console.log("##################################################################\n");

  const [deployer] = await ethers.getSigners();
  await printBalance(deployer);

  if (hre.network.name == "base") {

    console.log("BASE")
    let baseMultisig = "0x03e2157773e48d59592C26EC5B6F976D85622Cce";
    let paBridge = "0xB81e55e7Ee6B286aF6abFEa4eFad83f7BA4D1f1e", prBridge = "0xC00cD5599F7E128FC5Ed5563147a45B12e83B3ac";
    let paX = "0x67f199841416388eeAd3bc48178c36651579FA3A", prX = "0xb655932EE66A3C609D57cC24309a0e2c594C944e";

    let paBridgeC = await ethers.getContractAt("ProxyAdmin", paBridge);
    let prBridgeC = await ethers.getContractAt("ProxyAdmin", prBridge);
    let paXC = await ethers.getContractAt("ProxyAdmin", paX);
    let prXc = await ethers.getContractAt("ProxyAdmin", prX);

    let TX = await paBridgeC.transferOwnership(baseMultisig); await TX.wait(); console.log("1");
    TX = await prBridgeC.transferOwnership(baseMultisig); await TX.wait(); console.log("2");
    TX = await paXC.transferOwnership(baseMultisig); await TX.wait(); console.log("3");
    TX = await prXc.transferOwnership(baseMultisig); await TX.wait(); console.log("4");
  }
  else if (hre.network.name == "ethereum") {

    console.log("ETHEREUM")
    let ethereumMultisig = "0x8e6C8799B542E507bfDDCA1a424867e885D96e79";
    let paX = "0x10D9A419478FeE5aa35c9f3b36B37025E9Ff8110", prX = "0xb655932EE66A3C609D57cC24309a0e2c594C944e";

    let paXC = await ethers.getContractAt("ProxyAdmin", paX);
    let prXc = await ethers.getContractAt("ProxyAdmin", prX);

    TX = await paXC.transferOwnership(ethereumMultisig); await TX.wait(); console.log("1");
    TX = await prXc.transferOwnership(ethereumMultisig); await TX.wait(); console.log("2");
  } else throw ("Incorrect Network");
};

async function main() {
  await deployFactory();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
