const fs = require("fs")
const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async function({ getNamedAccounts, deployments }) {
    const { deployer } = await getNamedAccounts()
    const { deploy, log } = deployments
    const chainId = network.config.chainId

    let ethUsdPriceFeedAddress
    if (developmentChains.includes(network.name)) {
        const EthUsdAggregator = await ethers.getContract("MockV3Aggregator")
        ethUsdPriceFeedAddress = EthUsdAggregator.address
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId].ethUsdPriceFeed
    }

    const lowSVG = await fs.readFileSync("./images/dynamicNfts/frown.svg", { encoding: "utf8" })
    const highSVG = await fs.readFileSync("./images/dynamicNfts/happy.svg", { encoding: "utf8" })

    log("--------------------")
    const constructorArgs = [ethUsdPriceFeedAddress, lowSVG, highSVG]
    const dynamicNft = await deploy("DynamicNft", {
        from: deployer,
        args: constructorArgs,
        log: true,
        waitConfirmations: network.config.blockConfirmation || 1,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(dynamicNft.address, constructorArgs)
    }
    log("--------------------")
}

module.exports.tags = ["all", "dynamicsvgnft", "main"]