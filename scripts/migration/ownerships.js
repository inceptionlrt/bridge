const fs = require("fs");
const { ethers } = require("hardhat");
const { printBalance } = require("../utils");

const deployFactory = async () => {
  console.log("##################################################################");
  console.log("###################### Transfering Ownerhips #####################");
  console.log("##################################################################\n");

  const [deployer] = await ethers.getSigners();
  await printBalance(deployer);

  if (hre.network.name == "fraxtal") {

    console.log("FRAXTAL")
    let fraxtalMultisig = "0xc95AB1e2253a1d93cec51ad862ABfA130c14361F";
    let paBridge = "0xB5C479CC2Ee8D24b1aE86ac270598F1a571abd6B", prBridge = "0xC00cD5599F7E128FC5Ed5563147a45B12e83B3ac";
    let paX = "0x64a6c90871B774C1678dDBC48D99040b03a9b84d", prX = "0xE162075a1C0Ac7e985253972bEcA5e83Da3BBaa4";

    let paBridgeC = await ethers.getContractAt("ProxyAdmin", paBridge);
    let prBridgeC = await ethers.getContractAt("ProxyAdmin", prBridge);
    let paXC = await ethers.getContractAt("ProxyAdmin", paX);
    let prXc = await ethers.getContractAt("ProxyAdmin", prX);

    let TX = await paBridgeC.transferOwnership(fraxtalMultisig); await TX.wait(); console.log("1");
    TX = await prBridgeC.transferOwnership(fraxtalMultisig); await TX.wait(); console.log("2");
    TX = await paXC.transferOwnership(fraxtalMultisig); await TX.wait(); console.log("3");
    TX = await prXc.transferOwnership(fraxtalMultisig); await TX.wait(); console.log("4");
  }
  else if (hre.network.name == "ethereum") {

    console.log("ETHEREUM")
    let ethereumMultisig = "0x8e6C8799B542E507bfDDCA1a424867e885D96e79";
    let paX = "0xef6f479dBE4eaA80eEa939d35fc0638c12473264", prX = "0xE162075a1C0Ac7e985253972bEcA5e83Da3BBaa4";

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
