require('dotenv').config(); // Load environment variables from .env file

const { ethers } = require('ethers');

// Retrieve environment variables from the .env file
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL;
const POLYGON_ZKEVM_RPC_URL = process.env.POLYGON_ZKEVM_RPC_URL;
const L1_CROSS_DOMAIN_MESSENGER_ADDRESS = process.env.L1_CROSS_DOMAIN_MESSENGER_ADDRESS;
const L2_CROSS_DOMAIN_MESSENGER_ADDRESS = process.env.L2_CROSS_DOMAIN_MESSENGER_ADDRESS;

// Create providers for L1 (Ethereum) and L2 (Polygon zkEVM)
const l1Provider = new ethers.providers.JsonRpcProvider(ETHEREUM_RPC_URL);
const l2Provider = new ethers.providers.JsonRpcProvider(POLYGON_ZKEVM_RPC_URL);

// ABI for the cross-domain messenger
const crossDomainMessengerABI = [
    'function xDomainMessageSender() external view returns (address)',
    'function sendMessage(address target, bytes calldata message) external',
    'event RelayedMessage(bytes32 indexed msgHash)',
    'event SentMessage(bytes32 indexed msgHash, address indexed target, address sender, bytes data)'
];

async function checkRelayStatus(l1TransactionHash) {
    // Get the transaction receipt from L1 (Ethereum)
    const l1TxReceipt = await l1Provider.getTransactionReceipt(l1TransactionHash);

    if (!l1TxReceipt) {
        console.error('Transaction not found on L1.');
        return;
    }

    // Parse logs from the L1 transaction to find the cross-domain message
    const l1Messenger = new ethers.Contract(L1_CROSS_DOMAIN_MESSENGER_ADDRESS, crossDomainMessengerABI, l1Provider);
    const sentMessageEvent = l1Messenger.interface.getEvent('SentMessage');
    const sentMessageTopic = l1Messenger.interface.getEventTopic(sentMessageEvent);
    
    const sentLogs = l1TxReceipt.logs.filter(log => log.topics[0] === sentMessageTopic);

    if (sentLogs.length === 0) {
        console.error('No cross-chain message found in this transaction.');
        return;
    }

    // Get the message hash from the L1 event
    const parsedLog = l1Messenger.interface.parseLog(sentLogs[0]);
    const messageHash = parsedLog.args.msgHash;

    console.log(`Message Hash: ${messageHash}`);

    // Check the relay status on L2 (Polygon zkEVM)
    const l2Messenger = new ethers.Contract(L2_CROSS_DOMAIN_MESSENGER_ADDRESS, crossDomainMessengerABI, l2Provider);
    
    const relayedFilter = l2Messenger.filters.RelayedMessage(messageHash);
    const relayedEvents = await l2Messenger.queryFilter(relayedFilter);

    if (relayedEvents.length > 0) {
        console.log('Message has been successfully relayed to L2.');
    } else {
        console.log('Message is not yet relayed to L2.');
    }
}

// Example usage with a transaction hash from L1
const l1TransactionHash = '0xYourL1TransactionHash';
checkRelayStatus(l1TransactionHash);
