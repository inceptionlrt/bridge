const eth = require("ethereumjs-util");
const rlp = require("rlp");
const Web3 = require("web3");
const abiCoder = require("web3-eth-abi");
const { ethers } = require("hardhat");
const { ec: EC } = require("elliptic");

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
  rlpLogs[rlpLogs.length - 1][0] = ethers.ZeroAddress;
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
  rlpLogs[rlpLogs.length - 1][2] = Buffer.from(data.substr(2), "hex");
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

function signMessageUsingPrivateKey(privateKey, data) {
  const { ec: EC } = require("elliptic"),
    ec = new EC("secp256k1");
  let keyPair = ec.keyFromPrivate(privateKey);
  // console.log(keyPair.getPrivate());
  let res = keyPair.sign(data.substring(2));
  const N_DIV_2 = Web3.utils.toBN("7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0", 16);
  const secp256k1N = Web3.utils.toBN("fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141", 16);
  let v = res.recoveryParam;
  let s = res.s;
  if (s.cmp(N_DIV_2) > 0) {
    s = secp256k1N.sub(s);
    v = v === 0 ? 1 : 0;
  }
  return (
    "0x" + Buffer.concat([res.r.toArrayLike(Buffer, "be", 32), s.toArrayLike(Buffer, "be", 32)]).toString("hex") + (v === 0 ? "1b" : "1c")
  );
}

module.exports = {
  createSimpleTokenMetaData,
  encodeTransactionReceiptInvalidContractAddress,
  encodeTransactionReceiptInvalidFromTokenAddress,
  encodeTransactionReceipt,
  encodeProof,
  signMessageUsingPrivateKey,
};
