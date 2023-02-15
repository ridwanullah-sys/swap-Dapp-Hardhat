"use strict";

require("@nomiclabs/hardhat-waffle");

require("@nomiclabs/hardhat-etherscan");

require("hardhat-deploy");

require("solidity-coverage");

require("hardhat-gas-reporter");

require("hardhat-contract-sizer");

require("dotenv").config();

var RINKEBY_RPC_URL = process.env.RINKEBY_RPC_URL || "https://eth-rinkeby";
var GOERLY_RPC_URL = process.env.GOERLY_RPC_URL || "https://eth-goerly";
var PRIVATE_KEY = process.env.PRIVATE_KEY || "0xkey";
var ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "key";
var COINMARKET_API_KEY = process.env.COINMARKET_API_KEY || "key";
var MAINNET_RPC_URL = process.env.MAINNET_RPC_URL || "key";
module.exports = {
  solidity: {
    compilers: [{
      version: "0.7.6"
    }, {
      version: "0.7.0"
    }, {
      version: "0.6.0"
    }, {
      version: "0.7.5"
    }, {
      version: "0.6.2"
    }]
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
      forking: {
        url: MAINNET_RPC_URL
      }
    },
    localhost: {
      chainId: 31337
    },
    rinkeby: {
      url: RINKEBY_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 4,
      blockConfirmations: 1
    },
    goerly: {
      url: GOERLY_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 5,
      blockConfirmations: 1
    }
  },
  gasReporter: {
    enabled: false,
    outputFile: "gas-reporter.txt",
    noColors: true,
    currency: "USD",
    coinmarketcap: COINMARKET_API_KEY,
    token: "ETH"
  },
  namedAccounts: {
    deployer: {
      "default": 0
    },
    user: {
      "default": 1
    }
  },
  mocha: {
    timeout: 300000 // 300 sec max

  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  }
};