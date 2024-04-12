// const { network } = require("hardhat");

const BRIDGE_TEMPLATE_PATH = "./tasks/templates/bridge.json";

task("setup-bridge", "TODO").setAction(async (taskArgs) => {
  const { readTemplate } = require("./utils");
  const { setupBridge } = require("../scripts/setup-bridge");

  // get the bridge template
  const bridgeConfig = await readTemplate(BRIDGE_TEMPLATE_PATH);
  /// 2. deploy and initialize the Proxy(+ProxyAdmin)
  await setupBridge(bridgeConfig);
});
