const fs = require("fs").promises;
// const path = require("path");
// const hre = require("hardhat");

async function printBalance(account) {
  const initBalance = await account.provider.getBalance(account.address);
  console.log(`Account(${account.address}) balance: ${initBalance.toString()}`);
}

async function readJson(dirPath) {
  try {
    const fileContent = await fs.readFile(dirPath, "utf8");
    const jsonData = JSON.parse(fileContent);
    return jsonData;
  } catch (error) {
    console.error("Error reading JSON files:", error);
  }

  return "";
}

module.exports = {
  printBalance,
  readJson,
};
