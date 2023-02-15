const { network, getNamedAccounts } = require("hardhat")
const { verify } = require("../utils/verify")

module.exports = async function ({ deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    log("------------------------------")

    const swap = await deploy("Swap", {
        from: deployer,
        args: [
            "0xE592427A0AEce92De3Edee1F18E0157C05861564",
            "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
            "0xBA12222222228d8Ba445958a75a0704d566BF2C8",
        ],
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    // await verify(swap.address, [
    //     "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    //     "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
    //     "0xBA12222222228d8Ba445958a75a0704d566BF2C8",
    // ])

    log("--------------------------------")
}

module.exports.tags = ["all", "swap", "main"]
