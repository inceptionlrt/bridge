const { L2ToL1Message, L2ToL1MessageStatus, getL2ToL1Message } = require('@eth-optimism/sdk');
const { ethers } = require('ethers');

const OPTIMISM_RPC = "";
const ETHEREUM_RPC = "";

async function checkMessageStatus(l2TxHash) {
    const l2Provider = new ethers.providers.JsonRpcProvider(OPTIMISM_RPC);
    const l1Provider = new ethers.providers.JsonRpcProvider(ETHEREUM_RPC);

    // Get the message object using the transaction hash on L2
    const l2ToL1Msg = await getL2ToL1Message(l2TxHash, l2Provider, l1Provider);

    // Check the status of the message
    const status = await l2ToL1Msg.status();

    console.log(`Message Status: ${L2ToL1MessageStatus[status]}`);
}

checkMessageStatus("L2_TRANSACTION_HASH");
