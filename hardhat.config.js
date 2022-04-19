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
 const ALCHEMY_API_KEY = "-ouNvueg5iUjso0-hDsTCcCmmvIZ-tiS";

 // Replace this private key with your Ropsten account private key
 // To export your private key from Metamask, open Metamask and
 // go to Account Details > Export Private Key
 // Be aware of NEVER putting real Ether into testing accounts
 const ROPSTEN_PRIVATE_KEY = "42cedf3184b3a10395af011a9073c1b247c0fdfa35e9bc35a8bba1d21b3dc089";
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

        // testBSC: {
        //     url: "https://data-seed-prebsc-1-s1.binance.org:8545",
        //     accounts: [process.env.PRIVATE_KEY], // 0xf9128f6E4faF9fc364a6d737221a93E9b97CBC68
        //     gas: 12000000,
        //     blockGasLimit: 0x1fffffffffffff,
        //     allowUnlimitedContractSize: true,
        //     timeout: 1800000,
        //     chainId: 97,
        // },

        // mainnetBSC: {
        //     url: "https://bsc-dataseed.binance.org/",
        //     accounts: [process.env.PRIVATE_KEY],
        //     gas: 12000000,
        //     blockGasLimit: 0x1fffffffffffff,
        //     allowUnlimitedContractSize: true,
        //     timeout: 1800000,
        //     chainId: 56,
        // },
    },

    etherscan: {
        apiKey: process.env.ETHERSCAN_APIKEY, // bsc
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
