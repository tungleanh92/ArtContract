import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (
    hre: HardhatRuntimeEnvironment,
): Promise<void> {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    console.log("deployer: ", deployer);


    const alloc = await deploy("AllocationPool", {
        from: deployer,
        log: true
    });

    const liner = await deploy("LinearPool", {
        from: deployer,
        log: true
    });

    await deploy("PoolFactory", {
        from: deployer,
        log: true,
        args: [liner.address, alloc.address]
    });

};


export default func;
