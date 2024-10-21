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
    // let paBridge = "0xB5C479CC2Ee8D24b1aE86ac270598F1a571abd6B", prBridge = "0xC00cD5599F7E128FC5Ed5563147a45B12e83B3ac";
    let paX = "0xf0b06794b6B068f728481b4F44C9AD0bE42fB8aB", prX = "0x157743261C3ba961e92421b268A881AeCe450d41";

    // let paBridgeC = await ethers.getContractAt("ProxyAdmin", paBridge);
    // let prBridgeC = await ethers.getContractAt("ProxyAdmin", prBridge);
    let paXC = await ethers.getContractAt("ProxyAdmin", paX);
    let prXc = await ethers.getContractAt("ProxyAdmin", prX);

    // let TX = await paBridgeC.transferOwnership(fraxtalMultisig); await TX.wait(); console.log("1");
    // TX = await prBridgeC.transferOwnership(fraxtalMultisig); await TX.wait(); console.log("2");
    TX = await paXC.transferOwnership(fraxtalMultisig); await TX.wait(); console.log("3");
    TX = await prXc.transferOwnership(fraxtalMultisig); await TX.wait(); console.log("4");
  } else if (hre.network.name == "bsc") {

    console.log("BSC")
    let bscMultisig = "0x8aAF28382A7D0954Bbe99AE7E34304169FF758f9";
    let paX = "0xB2F44773e99cfFeCb00AE9ba62913EA14C3B6163";
    let prX = "0xB2B446386633C6746B0a2735FB57edBb066c5878";

    let paXC = await ethers.getContractAt("ProxyAdmin", paX);
    let prXc = await ethers.getContractAt("ProxyAdmin", prX);

    TX = await paXC.transferOwnership(bscMultisig); await TX.wait(); console.log("3");
    TX = await prXc.transferOwnership(bscMultisig); await TX.wait(); console.log("4");
  }
  else if (hre.network.name == "ethereum") {

    console.log("ETHEREUM")
    let ethereumMultisig = "0x8e6C8799B542E507bfDDCA1a424867e885D96e79";
    // let paX = "0xCdD6b2e8E43c4281F99c44A316bACC3348A873A4", 
    let prX = "0xB2B446386633C6746B0a2735FB57edBb066c5878";

    // let paXC = await ethers.getContractAt("ProxyAdmin", paX);
    let prXc = await ethers.getContractAt("ProxyAdmin", prX);

    // TX = await paXC.transferOwnership(ethereumMultisig); await TX.wait(); console.log("1");
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
