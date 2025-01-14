const fs = require("fs");
const { ethers } = require("hardhat");
const { printBalance } = require("../utils");

const deployFactory = async () => {
  console.log("##################################################################");
  console.log("###################### Transfering Ownerhips #####################");
  console.log("##################################################################\n");

  const [deployer] = await ethers.getSigners();
  await printBalance(deployer);
  let multisig = "0x76668e48f6D6b304Cf17a970C474942115AAAEB6";

  if (hre.network.name == "zircuit") {

    console.log("zircuit");
    
    let tx;
    let pa1 = await ethers.getContractAt("InceptionBridge", "0xB81e55e7Ee6B286aF6abFEa4eFad83f7BA4D1f1e");
    let pa2 = await ethers.getContractAt("InceptionBridge", "0x67f199841416388eeAd3bc48178c36651579FA3A");
    let b = await ethers.getContractAt("InceptionBridge", "0xC00cD5599F7E128FC5Ed5563147a45B12e83B3ac");
    let x = await ethers.getContractAt("InceptionBridge", "0x9eFdE41A87fa4dD47BAa584954e8Abd5b8bdBfE7");

    tx = await pa1.transferOwnership(multisig); await tx.wait(); console.log("1");
    tx = await pa2.transferOwnership(multisig); await tx.wait(); console.log("2");
    tx = await b.transferOwnership(multisig); await tx.wait(); console.log("3");
    tx = await x.transferOwnership(multisig); await tx.wait(); console.log("4");

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