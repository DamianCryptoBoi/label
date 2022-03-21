require("dotenv").config();

require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
// require("hardhat-gas-reporter");
require("solidity-coverage");
require("@openzeppelin/hardhat-upgrades");
require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-truffle5");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.5.16",
      },
      {
        version: "0.6.6",
      },
      {
        version: "0.7.5",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },

  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      gas: 120000000,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
      timeout: 1800000,
      chainId: 8888,
    },
    rinkeby: {
      url: process.env.PROVIDER_URL,
      accounts: [process.env.PRIVATE_KEY],
      // accounts: [`9b1a1461a714724dbf4e8d2345cf5008545e1140f54914a0c1a62eb1bf1c88a0`],
      gas: 12000000,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
      timeout: 1800000,
    },

    mumbai: {
      url: "https://polygon-mumbai.g.alchemy.com/v2/lntlkFVPzednplmSvNl2t51-kVXPpcvb",
      accounts: [
        `2a7b162564c6ca43e6289d48757bc12261339baa0b7a96271f0e0f99ed52e7a0`,
      ],
      // accounts: [`9b1a1461a714724dbf4e8d2345cf5008545e1140f54914a0c1a62eb1bf1c88a0`],
      gas: "auto",
      allowUnlimitedContractSize: true,
      timeout: 1800000,
      blockGasLimit: 0x1fffffffffffff,
    },
    testBSC: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      accounts: [
        "2a7b162564c6ca43e6289d48757bc12261339baa0b7a96271f0e0f99ed52e7a0",
      ],
      gas: 12000000,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
      timeout: 1800000,
    },
    mainnetETH: {
      url: process.env.PROVIDER_URL,
      accounts: [process.env.PRIVATE_KEY],
      gas: 12000000,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
      timeout: 1800000,
    },

    mainnetPolygon: {
      url: "https://polygon-mainnet.g.alchemy.com/v2/VdMy98z4rRSAGeHErw4hqbROkzZhmJT3",
      accounts: [process.env.PRIVATE_KEY],
      gas: 12000000,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
      timeout: 1800000,
    },

    mainnetBSC: {
      url: "https://bsc-dataseed.binance.org/",
      accounts: [
        "2a7b162564c6ca43e6289d48757bc12261339baa0b7a96271f0e0f99ed52e7a0",
      ],
      gas: 12000000,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
      timeout: 1800000,
    },
  },

  etherscan: {
    // apiKey: process.env.ETHERSCAN_APIKEY,
    // apiKey: 'UVE477915DMJIFSVTM5V3FI9Z17WUBGE2M', // eth
    // apiKey: '9E36GDSJK15GYXXN85186T5GDQI32B29MF', // bsc
    apiKey: "7A5TAKHWI24BHVT5V8CSUDRPVAEM5KUWWP", // polygon
  },

  mocha: {
    timeout: 1800000,
  },

  // contractSizer: {
  //   alphaSort: true,
  //   disambiguatePaths: false,
  //   runOnCompile: true,
  //   strict: true,
  // }
};
