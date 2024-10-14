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
    arbitrum: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`],
      url: `${process.env.RPC_URL_ARBITRUM}`,
      chainId: 42161,
      gas: 8000000,
    },
    mode: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`],
      url: `${process.env.RPC_URL_MODE}`,
      chainId: 34443,
      gas: 8000000,
    },
    xlayer: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`],
      url: `${process.env.RPC_URL_XLAYER}`,
      chainId: 196,
      gas: 8000000,
    },
    linea: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`],
      url: `${process.env.RPC_URL_LINEA}`,
      chainId: 59144,
      gas: 8000000,
    },
    blast: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`],
      url: `${process.env.RPC_URL_BLAST}`,
      chainId: 81457,
      gas: 8000000,
    },
    bsc: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`],
      url: `${process.env.RPC_URL_BSC}`,
      chainId: 56,
      gas: 8000000,
    },
    optimism: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`],
      url: `${process.env.RPC_URL_OPTIMISM}`,
      chainId: 10,
      gas: 8000000,
    },
    base: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`, `0x${process.env.DEPLOYER_PRIVATE_KEY_FACTORY}`],
      url: `${process.env.RPC_URL_BASE}`,
      chainId: 8453,
      gas: 8000000,
    },
    fraxtal: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`, `0x${process.env.DEPLOYER_PRIVATE_KEY_FACTORY}`],
      url: `${process.env.RPC_URL_FRAXTAL}`,
      chainId: 252,
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
