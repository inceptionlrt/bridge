const fs = require("fs");
const { ethers } = require("hardhat");
const { printBalance } = require("../utils");

const deployFactory = async () => {
  console.log("##################################################################");
  console.log("###################### Transfering Ownerhips #####################");
  console.log("##################################################################\n");

  const [deployer] = await ethers.getSigners();
  await printBalance(deployer);

  if (hre.network.name == "ethereum") {

    console.log("ethereum");
    
    let tx;
    let xerc20 = await ethers.getContractAt("XERC20", "0x9eFdE41A87fa4dD47BAa584954e8Abd5b8bdBfE7");

    tx = await xerc20.transferOwnership("0x8e6C8799B542E507bfDDCA1a424867e885D96e79"); await tx.wait(); console.log("1");

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