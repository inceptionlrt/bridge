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
    zircuit: {
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`, `0x${process.env.DEPLOYER_PRIVATE_KEY_FACTORY}`],
      url: `${process.env.RPC_URL_ZIRCUIT}`,
      chainId: 48900,
      gas: 8000000,
    }
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
