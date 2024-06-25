# Inception Bridge

The Inception Bridge provides trustworthy and fast cross-chain asset transfers.

## Contract Addresses

### Mainnet

#### Bridges

The bridges have the same address across all supported chains. The address is `0xC00cD5599F7E128FC5Ed5563147a45B12e83B3ac`

#### Supported Assets

`InETH`

| Chain Name | ChainId | Address                                      | Source Chain |
| ---------- | ------- | -------------------------------------------- | ------------ |
| Ethereum   | 1       | `0xf073bAC22DAb7FaF4a3Dd6c6189a70D54110525C` | _True_       |
| Arbitrum   | 42161   | `0x5A7a183B6B44Dc4EC2E3d2eF43F98C5152b1d76d` | _False_      |
| Optimism   | 10      | `0x5A7a183B6B44Dc4EC2E3d2eF43F98C5152b1d76d` | _False_      |
| BSC        | 56      | `0x5A7a183B6B44Dc4EC2E3d2eF43F98C5152b1d76d` | _False_      |
| Mode       | 34443   | `0x5A7a183B6B44Dc4EC2E3d2eF43F98C5152b1d76d` | _False_      |
| Linea      | 59144   | `0x5A7a183B6B44Dc4EC2E3d2eF43F98C5152b1d76d` | _False_      |
| Blast      | 81457   | `0x5A7a183B6B44Dc4EC2E3d2eF43F98C5152b1d76d` | _False_      |

---

`InankrETH`

| Chain Name | ChainId | Address                                      | Source Chain |
| ---------- | ------- | -------------------------------------------- | ------------ |
| Ethereum   | 1       | `0xfa2629B9cF3998D52726994E0FcdB750224D8B9D` | _True_       |
| Mode       | 34443   | `0x5A32d48411387577c26a15775cf939494dA8064A` | _False_      |

---

`InstETH`

| Chain Name | ChainId | Address                                      | Source Chain |
| ---------- | ------- | -------------------------------------------- | ------------ |
| Ethereum   | 1       | `0x7FA768E035F956c41d6aeaa3Bd857e7E5141CAd5` | _True_       |
| Arbitrum   | 42161   | `0xd08C3F25862077056cb1b710937576Af899a4959` | _False_      |
| Optimism   | 10      | `0xd08C3F25862077056cb1b710937576Af899a4959` | _False_      |
| Linea      | 59144   | `0xd08C3F25862077056cb1b710937576Af899a4959` | _False_      |

---

`InwbETH`

| Chain Name | ChainId | Address                                      | Source Chain |
| ---------- | ------- | -------------------------------------------- | ------------ |
| Ethereum   | 1       | `0xDA9B11Cd701e10C2Ec1a284f80820eDD128c5246` | _True_       |
| BSC        | 56      | `0x3059a337b134Cc89851c8DE18A00D880fa1D5519` | _False_      |

#### Rate Providers

| Asset   | Chain Name | ChainId | Address                                      |
| ------- | ---------- | ------- | -------------------------------------------- |
| inETH   | Arbitrum   | 42161   | `0x971b35225361535D04828F16442AAA54009efE1a` |
| inETH   | Linea      | 59144   | `0xBf47307F7Bd75a8db3c8f69F913e9B77fc222e84` |
| inETH   | Mode       | 34443   | `0x971b35225361535D04828F16442AAA54009efE1a` |
| inETH   | Blast      | 81457   | `0xC0660932C5dCaD4A1409b7975d147203B1e9A2B6` |
| instETH | Arbitrum   | 42161   | `0x57a5a0567187FF4A8dcC1A9bBa86155E355878F2` |

#### RatioFeeds

| Chain Name | ChainId | Address                                      |
| ---------- | ------- | -------------------------------------------- |
| Arbitrum   | 42161   | `0xfE715358368416E01d3A961D3a037b7359735d5e`  |
| Blast      | 81457   | `0xA9F8c770661BeE8DF2D026edB1Cb6FF763C780FF` |
| Mode       | 34443   | `0xfE715358368416E01d3A961D3a037b7359735d5e`  |
| BSC        | 56      | `0x9181f633E9B9F15A32d5e37094F4C93b333e0E92` |
| Optimism   | 10      | `0xfD07fD5EBEa6F24888a397997E262179Bf494336` |
| Linea      | 59144   | `0x048a2F5CD64B89f750cf14a5F36922Ae7b07221c` |

### Testnet

#### Bridges

| Chain Name | ChainId   | Address                                      |
| ---------- | --------- | -------------------------------------------- |
| Holesky    | 17000     | `0xCDeA808c1C43F95309C8ca398DF41a257aF2Dc8a` |
| Arbitrum   | 421614    | `0xCDeA808c1C43F95309C8ca398DF41a257aF2Dc8a` |
| Linea      | 59141     | `0xCDeA808c1C43F95309C8ca398DF41a257aF2Dc8a` |
| BSC        | 97        | `0x983c2239ad08307F978096844166c67E0f1b2630` |
| Blast      | 168587773 | `0x983c2239ad08307F978096844166c67E0f1b2630` |
| Optimism   | 11155420  | `0x983c2239ad08307F978096844166c67E0f1b2630` |

#### Supported Assets

`InETH`

| Chain Name | ChainId   | Address                                      | Source Chain |
| ---------- | --------- | -------------------------------------------- | ------------ |
| Holesky    | 17000     | `0x76944d54c9eF0a7A563E43226e998F382714C92f` | _True_       |
| Arbitrum   | 421614    | `0xb1692ed9b08f8dd641f4109568ed6f471166c7e5` | _False_      |
| Optimism   | 11155420  | `0xb1692ed9b08f8dd641f4109568ed6f471166c7e5` | _False_      |
| BSC        | 97        | `0xb1692ed9b08f8dd641f4109568ed6f471166c7e5` | _False_      |
| Blast      | 168587773 | `0xb1692ed9b08f8dd641f4109568ed6f471166c7e5` | _False_      |

#### Rate Providers

| Asset | Chain Name | ChainId | Address                                      |
| ----- | ---------- | ------- | -------------------------------------------- |
| inETH | BSC        | 97      | `0xFea428946A2c602C09c0F737Ea65BC16298b0415` |
| inETH | Linea      | 59141   | `0x5d944729CDdfd8270be5c557E53868353cF80A46` |

#### RatioFeeds

| Chain Name | ChainId | Address                                      |
| ---------- | ------- | -------------------------------------------- |
| BSC        | 97      | `0x05aAC4a15972C333A3832298609b61A8adcD0623` |
| Linea      | 59141   | `0xFea428946A2c602C09c0F737Ea65BC16298b0415` |

## Deployment Flow

1. **Choose the Network**: Select the network to deploy to, such as `bsc` or `blast_testnet`.

2. **Deploy Factory**:

   ```
   npx hardhat run ./scripts/migration/deploy-factory.js --network {network}
   ```

3. **Deploy Bridge.** This step involves two deployments, particularly the bridge's implementation deployment and the bridge's proxy deployment, followed by further initialization.

   ```
   npx hardhat run ./scripts/migration/deploy-bridge.js --network {network}
   ```

4. **Deploy the set of XERC20 contracts.** Additionally, it sets the bridge's minting/burning limits.

   ```
   npx hardhat deploy-xerc20 --execute 1 --network {network}
   ```

5. **Setup the bridge allowances.**

   ```
   npx hardhat setup-bridge --network {network}`
   ```
