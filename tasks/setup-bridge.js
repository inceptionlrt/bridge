const BRIDGE_TEMPLATE_PATH = "./tasks/templates/bridge.json";

task("setup-bridge", "It sets the bridge allowances, destinations, supported tokens...").setAction(async () => {
  const { readJson } = require("../scripts/utils");
  const { setupBridge } = require("../scripts/setup-bridge");

  const bridgeConfig = await readJson(BRIDGE_TEMPLATE_PATH);
  await setupBridge(bridgeConfig);
});
