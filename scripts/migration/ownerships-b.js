const fs = require("fs");
const { ethers } = require("hardhat");
const { printBalance } = require("../utils");

const deployFactory = async () => {
  console.log("##################################################################");
  console.log("###################### Transfering Ownerhips #####################");
  console.log("##################################################################\n");

  const [deployer] = await ethers.getSigners();
  await printBalance(deployer);

  let multisig = "0x03e2157773e48d59592C26EC5B6F976D85622Cce";

  if (hre.network.name == "base") {

    console.log("base");
    
    let tx;
    let xerc20 = await ethers.getContractAt("XERC20", "0x9eFdE41A87fa4dD47BAa584954e8Abd5b8bdBfE7");
    let pAdmin = await ethers.getContractAt("XERC20", "0x4878F636A9Aa314B776Ac51A25021C44CAF86bEd");

    tx = await xerc20.transferOwnership(multisig); await tx.wait(); console.log("1");
    tx = await pAdmin.transferOwnership(multisig); await tx.wait(); console.log("2");
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