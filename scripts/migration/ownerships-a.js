const fs = require("fs");
const { ethers } = require("hardhat");
const { printBalance } = require("../utils");

const deployFactory = async () => {
  console.log("##################################################################");
  console.log("###################### Transfering Ownerhips #####################");
  console.log("##################################################################\n");

  const [deployer] = await ethers.getSigners();
  await printBalance(deployer);

  let multisig = "0x7411242477Ee9CfA06141398224586E65099f035";

  if (hre.network.name == "arbitrum") {

    console.log("arbitrum");
    
    let tx;
    let xerc20 = await ethers.getContractAt("XERC20", "0x9eFdE41A87fa4dD47BAa584954e8Abd5b8bdBfE7");
    let pAdmin = await ethers.getContractAt("XERC20", "0x80579bFB49e62bDfc57817db15539f19b0071813");

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