require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
//require("@nomicfoundation/hardhat-verify");

/**
 * Hardhat tasks
 * For more details, kindly proceed to README.md
 */

require("./tasks/setup-bridge");
require("./tasks/deploy-xerc20");
require("./tasks/deploy-rate-provider");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545/",
    },
    ethereum: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`],
      url: `${process.env.RPC_URL_ETHEREUM}`,
      chainId: 1,
      gas: 8000000,
    },
    holesky: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY_TESTNET}`],
      url: `${process.env.RPC_URL_HOLESKY}`,
      chainId: 17000,
      gas: 8000000,
    },
    arbitrum: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`],
      url: `${process.env.RPC_URL_ARBITRUM}`,
      chainId: 42161,
      gas: 8000000,
    },
    arbitrum_testnet: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY_TESTNET}`],
      url: `${process.env.RPC_URL_ARBITRUM_TESTNET}`,
      chainId: 421614,
      gas: 8000000,
    },
    mode: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`],
      url: `${process.env.RPC_URL_MODE}`,
      chainId: 34443,
      gas: 8000000,
    },
    mode_testnet: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY_TESTNET}`],
      url: `${process.env.RPC_URL_MODE_TESTNET}`,
      chainId: 919,
      gas: 8000000,
    },
    xlayer: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`],
      url: `${process.env.RPC_URL_XLAYER}`,
      chainId: 196,
      gas: 8000000,
    },
    xlayer_testnet: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY_TESTNET}`],
      url: `${process.env.RPC_URL_XLAYER_TESTNET}`,
      chainId: 195,
      gas: 8000000,
    },
    linea: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`],
      url: `${process.env.RPC_URL_LINEA}`,
      chainId: 59144,
      gas: 8000000,
    },
    linea_testnet: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY_TESTNET}`],
      url: `${process.env.RPC_URL_LINEA_TESTNET}`,
      chainId: 59141,
      gas: 8000000,
    },
    blast: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`],
      url: `${process.env.RPC_URL_BLAST}`,
      chainId: 81457,
      gas: 8000000,
    },
    blast_testnet: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY_TESTNET}`],
      url: `${process.env.RPC_URL_BLAST_TESTNET}`,
      chainId: 168587773,
      gas: 8000000,
    },
    bsc: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`],
      url: `${process.env.RPC_URL_BSC}`,
      chainId: 56,
      gas: 8000000,
    },
    bsc_testnet: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY_TESTNET}`],
      url: `${process.env.RPC_URL_BSC_TESTNET}`,
      chainId: 97,
      gas: 8000000,
    },
    optimism: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`],
      url: `${process.env.RPC_URL_OPTIMISM}`,
      chainId: 10,
      gas: 8000000,
    },
    optimism_testnet: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY_TESTNET}`],
      url: `${process.env.RPC_URL_OPTIMISM_TESTNET}`,
      chainId: 11155420,
      gas: 8000000,
    },
    base: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`, `0x${process.env.DEPLOYER_PRIVATE_KEY_FACTORY}`],
      url: `${process.env.RPC_URL_BASE}`,
      chainId: 8453,
      gas: 8000000,
    },
    base_testnet: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY_TESTNET}`, `0x${process.env.DEPLOYER_PRIVATE_KEY_TESTNET_FACTORY}`],
      url: `${process.env.RPC_URL_BASE_TESTNET}`,
      chainId: 84532,
      gas: 8000000,
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
};
