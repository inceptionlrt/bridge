# Inception Bridge

The Inception Bridge provides trustworthy and fast cross-chain asset transfers.

## Crosschain Flow Overview.

### Deployment Flow

1. **Choose the Network**: Select the network to deploy to, such as `bsc` or `blast_testnet`.

2. **Deploy Factory**:

   ```
   npx hardhat run ./scripts/migration/deploy-factory.js --network {network}
   ```

3. **Deploy Bridge.** This step involves two deployments, particularly the bridge's implementation deployment and the bridge's proxy deployment, followed by further initialization.

   ```
   npx hardhat run ./scripts/migration/deploy-impl.js --network {network}
   ```

4. **Deploy the set of XERC20 contracts.** Additionally, it sets the bridge's minting/burning limits.

   ```
   npx hardhat deploy-xerc20 --execute 1 --network {network}
   ```

5. **Setup the bridge allowances.**

   ```
   npx hardhat setup-bridge --network {network}`
   ```
