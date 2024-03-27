require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");

/**
 * Hardhat tasks
 * For more details, kindly proceed to README.md
 */

require("./tasks/deploy-bridge");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545/",
    },
    // mainnet: {
    //   accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`],
    //   url: `${process.env.RPC_URL_ETHEREUM}`,
    //   chainId: 1,
    //   gas: 8000000,
    // },
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
