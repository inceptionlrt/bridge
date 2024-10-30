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
    // let fraxtalMultisig = "0xc95AB1e2253a1d93cec51ad862ABfA130c14361F";
    // // let paBridge = "0xB5C479CC2Ee8D24b1aE86ac270598F1a571abd6B", prBridge = "0xC00cD5599F7E128FC5Ed5563147a45B12e83B3ac";
    // let paX = "0xf0b06794b6B068f728481b4F44C9AD0bE42fB8aB", prX = "0x157743261C3ba961e92421b268A881AeCe450d41";

    // // let paBridgeC = await ethers.getContractAt("ProxyAdmin", paBridge);
    // // let prBridgeC = await ethers.getContractAt("ProxyAdmin", prBridge);
    // let paXC = await ethers.getContractAt("ProxyAdmin", paX);
    // let prXc = await ethers.getContractAt("ProxyAdmin", prX);

    // // let TX = await paBridgeC.transferOwnership(fraxtalMultisig); await TX.wait(); console.log("1");
    // // TX = await prBridgeC.transferOwnership(fraxtalMultisig); await TX.wait(); console.log("2");
    // TX = await paXC.transferOwnership(fraxtalMultisig); await TX.wait(); console.log("3");
    // TX = await prXc.transferOwnership(fraxtalMultisig); await TX.wait(); console.log("4");
  } else if (hre.network.name == "bsc") {

    console.log("BSC")
    // let bscMultisig = "0x8aAF28382A7D0954Bbe99AE7E34304169FF758f9";
    // let paX = "0xB2F44773e99cfFeCb00AE9ba62913EA14C3B6163";
    // let prX = "0xB2B446386633C6746B0a2735FB57edBb066c5878";

    // let paXC = await ethers.getContractAt("ProxyAdmin", paX);
    // let prXc = await ethers.getContractAt("ProxyAdmin", prX);

    // TX = await paXC.transferOwnership(bscMultisig); await TX.wait(); console.log("3");
    // TX = await prXc.transferOwnership(bscMultisig); await TX.wait(); console.log("4");
  }
  else if (hre.network.name == "ethereum") {

    console.log("ETHEREUM")
    // let ethereumMultisig = "0x8e6C8799B542E507bfDDCA1a424867e885D96e79";
    // // let paX = "0xCdD6b2e8E43c4281F99c44A316bACC3348A873A4", 
    // let prX = "0xB2B446386633C6746B0a2735FB57edBb066c5878";

    // // let paXC = await ethers.getContractAt("ProxyAdmin", paX);
    // let prXc = await ethers.getContractAt("ProxyAdmin", prX);

    // // TX = await paXC.transferOwnership(ethereumMultisig); await TX.wait(); console.log("1");
    // TX = await prXc.transferOwnership(ethereumMultisig); await TX.wait(); console.log("2");
  } else if (hre.network.name == "mode") {
    console.log("MODE");
    // let modeMultisig = "0x7411242477Ee9CfA06141398224586E65099f035";

    // let bridge = await ethers.getContractAt("InceptionBridge", "0xC00cD5599F7E128FC5Ed5563147a45B12e83B3ac");
    // let TX;

    // TX = await bridge.setShortCap("0x5A7a183B6B44Dc4EC2E3d2eF43F98C5152b1d76d", "800000000000000000000"); await TX.wait(); console.log("1");
    // TX = await bridge.setLongCap("0x5A7a183B6B44Dc4EC2E3d2eF43F98C5152b1d76d", "4000000000000000000000"); await TX.wait(); console.log("2");

    // TX = await bridge.setShortCap("0x5A32d48411387577c26a15775cf939494dA8064A", "800000000000000000000"); await TX.wait(); console.log("3");
    // TX = await bridge.setLongCap("0x5A32d48411387577c26a15775cf939494dA8064A", "4000000000000000000000"); await TX.wait(); console.log("4");

    // TX = await bridge.transferOwnership(modeMultisig); await TX.wait(); console.log("5");


  } else if (hre.network.name == "xlayer") {

    console.log("XLAYER");
    
    let tx;
    let bridge = await ethers.getContractAt("InceptionBridge", "0xC00cD5599F7E128FC5Ed5563147a45B12e83B3ac");

    let BridgeFactory = await ethers.getContractFactory("InceptionBridge");
    let bImp = await BridgeFactory.deploy(); await bImp.waitForDeployment(); console.log("1");

    let pa = await ethers.getContractAt("ProxyAdmin", "0xb81e55e7ee6b286af6abfea4efad83f7ba4d1f1e");
    tx = await pa.upgrade(await bridge.getAddress(), await bImp.getAddress()); await tx.wait(); console.log("2");
    
    tx = await bridge.transferOwnership("0xf3B9Ed8597906efD0d6FCA5cD74674B55B13a134"); await tx.wait(); console.log("3");
    
    tx = await pa.upgrade(await bridge.getAddress(), "0xB2F44773e99cfFeCb00AE9ba62913EA14C3B6163"); await tx.wait(); console.log("4");

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
