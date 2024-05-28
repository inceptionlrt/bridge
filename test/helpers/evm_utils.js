/** @var web3 {Web3} */
const Web3 = require("web3");

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

const advanceTime = async (time) => {
  await network.provider.request({
    method: "evm_increaseTime",
    params: [time],
  });
};

async function advanceBlock() {
  await network.provider.send("evm_mine");
}

async function advanceBlocks(count) {
  for (let i = 0; i < count; i++) {
    await advanceBlock();
  }
}

async function takeSnapshot() {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "evm_snapshot",
        id: new Date().getTime(),
      },
      (err, snapshotId) => {
        if (err) {
          return reject(err);
        }
        return resolve(snapshotId);
      }
    );
  });
}

async function advanceTimeAndBlock(time) {
  await advanceTime(time);
  await advanceBlock();
}

module.exports = {
  signMessageUsingPrivateKey,
  advanceTime,
  advanceBlock,
  advanceBlocks,
  advanceTimeAndBlock,
  takeSnapshot,
};
