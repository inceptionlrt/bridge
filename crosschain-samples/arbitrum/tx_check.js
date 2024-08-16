const { L1ToL2MessageStatus, EthBridger } = require('@arbitrum/sdk');
const { ethers } = require('ethers');

async function checkTicketStatus(ticketNumber) {
  const l1Provider = new ethers.providers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/V7Rg4KMuszaJImrE51M51HgTFl5r0pRA");
  const l2Provider = new ethers.providers.JsonRpcProvider("https://arb-sepolia.g.alchemy.com/v2/V7Rg4KMuszaJImrE51M51HgTFl5r0pRA");

  // Instantiate the EthBridger
  const ethBridger = new EthBridger(l1Provider, l2Provider);

  // Check the status of the ticket
  const l1ToL2Msg = await ethBridger.getL1ToL2Msg(ticketNumber);

  // Check the status of the L1-to-L2 message
  const status = await l1ToL2Msg.status();

  console.log(`Ticket Status: ${L1ToL2MessageStatus[status]}`);
}

checkTicketStatus("YOUR_TICKET_NUMBER_HERE")
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
