const eth = require("ethereumjs-util");
const rlp = require("rlp");
const Web3 = require("web3");
const abiCoder = require("web3-eth-abi");
const { ethers } = require("hardhat");

/** @var web3 {Web3} */

function nativeAddressByNetwork(networkName) {
  function nativeHash(str) {
    return "0x" + eth.keccak256(Buffer.from(str, "utf8")).slice(0, 20).toString("hex");
  }
  const { symbol } = nameAndSymbolByNetwork(networkName);

  return nativeHash(`CrossChainBridge:${symbol}`);
}

function createSimpleTokenMetaData(symbol, name, chain, origin) {
  return [
    abiCoder.encodeParameters(["bytes32"], [Web3.utils.asciiToHex(symbol)]),
    abiCoder.encodeParameters(["bytes32"], [Web3.utils.asciiToHex(name)]),
    chain,
    origin,
    "0x0000000000000000000000000000000000000000000000000000000000000000",
  ];
}

function encodeTransactionReceipt(txReceipt) {
  const rlpLogs = txReceipt.logs.map((log) => {
    return [
      // address
      log.address,
      // topics
      log.topics,
      // data
      Buffer.from(log.data.substr(2), "hex"),
    ];
  });
  const rlpReceipt = [
    // postStateOrStatus
    Web3.utils.numberToHex(Number(txReceipt.status)),
    // cumulativeGasUsed
    Web3.utils.numberToHex(txReceipt.cumulativeGasUsed.toString()),
    // bloom
    //txReceipt.logsBloom,
    // logs
    rlpLogs,
  ];
  const encodedReceipt = rlp.encode(rlpReceipt);
  const receiptHash = eth.keccak256(encodedReceipt);
  return [`0x${encodedReceipt.toString("hex")}`, `0x${receiptHash.toString("hex")}`];
}

function encodeTransactionReceiptInvalidContractAddress(txReceipt) {
  const rlpLogs = txReceipt.logs.map((log) => {
    return [
      // address
      log.address,
      // topics
      log.topics,
      // data
      Buffer.from(log.data.substr(2), "hex"),
    ];
  });
  rlpLogs[1][0] = ethers.ZeroAddress;
  const rlpReceipt = [
    // postStateOrStatus
    Web3.utils.numberToHex(Number(txReceipt.status)),
    // cumulativeGasUsed
    Web3.utils.numberToHex(txReceipt.cumulativeGasUsed.toString()),
    // bloom
    //txReceipt.logsBloom,
    // logs
    rlpLogs,
  ];
  const encodedReceipt = rlp.encode(rlpReceipt);
  const receiptHash = eth.keccak256(encodedReceipt);
  return [`0x${encodedReceipt.toString("hex")}`, `0x${receiptHash.toString("hex")}`];
}

function encodeTransactionReceiptInvalidFromTokenAddress(txReceipt, data) {
  const rlpLogs = txReceipt.logs.map((log) => {
    return [
      // address
      log.address,
      // topics
      log.topics,
      // data
      Buffer.from(log.data.substr(2), "hex"),
    ];
  });
  rlpLogs[1][2] = Buffer.from(data.substr(2), "hex");
  const rlpReceipt = [
    // postStateOrStatus
    Web3.utils.numberToHex(Number(txReceipt.status)),
    // cumulativeGasUsed
    Web3.utils.numberToHex(txReceipt.cumulativeGasUsed.toString()),
    // bloom
    //txReceipt.logsBloom,
    // logs
    rlpLogs,
  ];
  const encodedReceipt = rlp.encode(rlpReceipt);
  const receiptHash = eth.keccak256(encodedReceipt);
  return [`0x${encodedReceipt.toString("hex")}`, `0x${receiptHash.toString("hex")}`];
}

function encodeProof(chainId, status, txHash, blockNumber, blockHash, txIndex, receiptHash, amount) {
  const proofData = Buffer.concat([
    Buffer.from(abiCoder.encodeParameters(["uint256", "uint256"], [chainId, status]).substr(2), "hex"),
    Buffer.from(txHash.substr(2), "hex"),
    Buffer.from(abiCoder.encodeParameters(["uint256"], [blockNumber]).substr(2), "hex"),
    Buffer.from(blockHash.substr(2), "hex"),
    Buffer.from(abiCoder.encodeParameters(["uint256"], [txIndex]).substr(2), "hex"),
    Buffer.from(receiptHash.substr(2), "hex"),
    Buffer.from(amount.substr(2), "hex"),
  ]);

  return [`0x${proofData.toString("hex")}`, `0x${eth.keccak256(proofData).toString("hex")}`];
}

function randBigInt(length) {
  if (length > 0) {
    let randomNum = "";
    randomNum += Math.floor(Math.random() * 9) + 1; // generates a random digit 1-9
    for (let i = 0; i < length - 1; i++) {
      randomNum += Math.floor(Math.random() * 10); // generates a random digit 0-9
    }
    return BigInt(randomNum);
  } else {
    return 0n;
  }
}

module.exports = {
  createSimpleTokenMetaData,
  createInternetBondMetaData,
  nameAndSymbolByNetwork,
  nativeAddressByNetwork,
  encodeTransactionReceiptInvalidContractAddress,
  encodeTransactionReceiptInvalidFromTokenAddress,
  encodeTransactionReceipt,
  encodeProof,
  randBigInt,
};
