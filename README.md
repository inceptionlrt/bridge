# Inception Bridge

The Inception Bridge provides trustworthy and fast cross-chain asset transfers.

## Crosschain flow overview.

### Deployment

1. Deploy Factory
   `npx hardhat run ./scripts/migration/deploy-factory.js --network {network}`

2. Deploy Bridge Implementation
   `npx hardhat run ./scripts/migration/deploy-impl.js --network {network}`

3. Deploy Bridge Proxy via Factory and initialized the Bridge.
   `npx hardhat deploy-bridge --network {network}`
