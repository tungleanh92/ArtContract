const shell = require("shelljs");

module.exports = {
  istanbulReporter: ["html", "lcov"],
  onCompileComplete: async function (_config) {
    await run("typechain");
  },
  onIstanbulComplete: async function (_config) {
    // We need to do this because solcover generates bespoke artifacts.
  },
  providerOptions: {
    mnemonic: process.env.MNEMONIC,
  },
  configureYulOptimizer: true,
  // solcOptimizerDetails: {
  //   peephole: false,
  //   inliner: false,
  //   jumpdestRemover: false,
  //   orderLiterals: true,  // <-- TRUE! Stack too deep when false
  //   deduplicate: false,
  //   cse: false,
  //   constantOptimizer: false,
  //   yul: false
  // },
  skipFiles: ["mocks", "extensions", "libraries"],
};
