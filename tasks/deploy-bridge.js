const { readTemplate } = require("./utils");

const BRIDGE_TEMPLATE_PATH = "./tasks/templates/bridge.json";

task("deploy-bridge", "TODO").setAction(async (taskArgs) => {
  const { deployBridge } = require("../scripts/migration/deploy-bridge");
  const { setupBridge } = require("../scripts/setup-bridge");

  // get the bridge template
  const bridgeConfig = await readTemplate(BRIDGE_TEMPLATE_PATH);
  const bridgesToAdd = bridgeConfig.bridgesToAdd;
  const supportedTokens = bridgeConfig.tokens;

  console.log(bridgeConfig);

  /// 1. deploy and initialize the Proxy(+ProxyAdmin)
  await deployBridge();

  /// 2. deploy and initialize the Proxy(+ProxyAdmin)
  await setupBridge(supportedTokens, bridgesToAdd);
});
