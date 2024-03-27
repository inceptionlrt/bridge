const fs = require("fs").promises;
const path = require("path");
const hre = require("hardhat");

async function printBalance(account) {
  const initBalance = await account.provider.getBalance(account.address);
  console.log("Account balance:", initBalance.toString());
}

/// TODO
async function alreadyDeployed(network, contract, vaultName) {
  let path = "";
  switch (contract) {
    case "XERC20":
      path = `./config/addresses/${contract}/${network.name}_${vaultName}.json`;
      return;
    case "XERC20LockBox":
      path = `./config/addresses/${contract}/${network.name}_${vaultName}.json`;
      return;
  }
  // check whether the file already exists by the generated path
  console.log("alreadyDeployed path:", path);
}

module.exports = {
  printBalance,
  alreadyDeployed,
};
