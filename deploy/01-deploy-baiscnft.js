const { network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

const { verify } = require("../utils/verify")

module.exports = async function({ getNamedAccounts, deployments }) {
    const { deployer } = await getNamedAccounts()
    const { deploy, log } = deployments

    log("--------------------")
    const constructorArgs = []
    const basicNft = await deploy("BasicNft", {
        from: deployer,
        args: constructorArgs,
        log: true,
        waitConfirmations: network.config.blockConfirmation || 1,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(basicNft.address, constructorArgs)
    }
    log("--------------------")
}

module.exports.tags = ["all", "basicnft", "main"]