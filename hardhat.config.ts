import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-etherscan";
import { config as dotenvConfig } from "dotenv";
import { readdirSync } from "fs";
import "hardhat-contract-sizer";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import { HardhatUserConfig } from "hardhat/config";
import { NetworkUserConfig } from "hardhat/types";
import { join, resolve } from "path";
import 'solidity-coverage'

dotenvConfig({ path: resolve(__dirname, "./.env") });

// init typechain for the first time
try {
  readdirSync(join(__dirname, "typechain"));
  // require("./tasks");
} catch {
  //
}

const chainIds = {
  goerli: 5,
  hardhat: 31337,
  kovan: 42,
  mainnet: 1,
  rinkeby: 4,
  ropsten: 3,
  polygon: 137,
  bscTestnet: 97,
  bscMainnet: 56,
  oasistestnet: 42261,
  binamon: 1337,
  KCC: 321,
  KCCTestnet: 322,
};

// Ensure that we have all the environment variables we need.
const deployerPrivateKey: string | undefined = process.env.DEPLOYER_PRIVATE_KEY;
if (!deployerPrivateKey) {
  throw new Error("Please set your DEPLOYER_PRIVATE_KEY in a .env file");
}

const infuraApiKey: string | undefined = process.env.INFURA_API_KEY;
if (!infuraApiKey) {
  throw new Error("Please set your INFURA_API_KEY in a .env file");
}

function getChainConfig(network: keyof typeof chainIds): NetworkUserConfig {
  let url: string = "https://" + network + ".infura.io/v3/" + infuraApiKey;
  if (network === "polygon") {
    url = "https://polygon-rpc.com";
  }
  if (network === "oasistestnet") {
    url = "https://testnet.emerald.oasis.dev";
  }
  if (network === "binamon") {
    url = "http://172.16.1.223:8545"
  }
  if(network == "bscTestnet") {
    url = "https://data-seed-prebsc-1-s1.binance.org:8545"
  }
  if(network == "bscMainnet") {
    url = "https://bsc-dataseed.binance.org/"
  }
  if (network === "KCC") {
    url = "https://rpc-mainnet.kcc.network/";
  }
  if (network === "KCCTestnet") {
    url = "https://rpc-testnet.kcc.network/";
  }
  return {
    accounts: [`0x${deployerPrivateKey}`],
    chainId: chainIds[network],
    url,
  };
}

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: [],
    src: "./contracts",
  },
  networks: {
    hardhat: {
      chainId: chainIds.hardhat,
      // accounts: [{
      //   privateKey: process.env.DEPLOYER_PRIVATE_KEY || "",
      //   balance: "1000000000000000000000000"
      // }]
    },
    goerli: getChainConfig("goerli"),
    kovan: getChainConfig("kovan"),
    rinkeby: getChainConfig("rinkeby"),
    ropsten: getChainConfig("ropsten"),
    polygon: getChainConfig("polygon"),
    oasistestnet: getChainConfig("oasistestnet"),
    binamon: getChainConfig("binamon"),
    bscTestnet: getChainConfig("bscTestnet"),
    bscMainnet: getChainConfig("bscMainnet"),
    KCC: getChainConfig("KCC"),
    KCCTestnet: getChainConfig("KCCTestnet"),
  },
  etherscan: {
    // Your API key for Etherscan
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
    deploy: "./deployments/migrations",
    deployments: "./deployments/artifacts",
  },
  mocha: {
    timeout: 200000
  },
  solidity: {
    compilers: [
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
  namedAccounts: {
    deployer: 0,
  },
};

export default config;
