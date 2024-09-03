import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DeployContractsModule = buildModule("DeployContractsModule", (m) => {

    const deployer = "0xaa082dAEDe284d1E4227EB81d342471f9F372F31";
    // Setup contracts
    const rebalancer = m.contract('Rebalancer', [deployer]);
    const inETH = m.contract('InETH', [deployer, rebalancer]);

    // Setup Lockbox contract with inETH address and owner
    const lockbox = m.contract('Lockbox', [inETH, deployer]);

    // Set Lockbox address in InETH contract
    m.call(inETH, 'setLockbox', [lockbox]);

    // Deploy LiquidPool contract
    const liquidPool = m.contract('LiquidPool', [rebalancer, inETH, deployer]);

    // Set addresses in Rebalancer
    m.call(rebalancer, 'setInETHAddress', [inETH]);
    m.call(rebalancer, 'setLockboxAddress', [lockbox]);
    m.call(rebalancer, 'setLiqPool', [liquidPool]);

    // Deploy CrossChainAdapter contract
    const CrossChainAdapter = m.contract('CrossChainAdapter', [deployer, liquidPool]);

    // Set CrossChainAdapter address in Rebalancer
    m.call(rebalancer, 'setCrossChainAdapter', [CrossChainAdapter]);
    m.call(CrossChainAdapter, 'setRebalancer', [rebalancer]);

    return { rebalancer, inETH, lockbox, liquidPool, CrossChainAdapter };
});

export default DeployContractsModule;