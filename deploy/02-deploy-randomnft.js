const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { storeImage, storeTokenUriMetadata } = require("../utils/uploadToPinata")
const { verify } = require("../utils/verify")

const imagesLocation = "images/randomNfts"
const metadataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [{
        trait_type: "cuteness",
        value: 100,
    }, ],
}

const FUND_AMOUNT = ethers.utils.parseUnits("10")

module.exports = async function({ getNamedAccounts, deployments }) {
    const { deployer } = await getNamedAccounts()
    const { deploy, log } = deployments
    const chainId = network.config.chainId

    let tokenUris = [
        "ipfs://QmQs4yASJakykKzcUYiJoQEFptCuufghNA3S5J2CkD47tp",
        "ipfs://QmXry9jwWVKfbt6V87Gzd97WJ5LGAmtyWY7znSQXCRysv9",
        "ipfs://QmX5V7Xc31vMfM8tYgrNefix1WCFmiMqpLzjDtk6PgTQd2",
    ]

    if (process.env.UPLOAD_TO_PINATA === "1") {
        tokenUris = await handleTokenUris()
    }

    let vrfCoordinatorV2Address, subscriptionId

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address

        const tx = await vrfCoordinatorV2Mock.createSubscription()
        const txReceipt = await tx.wait(1)
        subscriptionId = txReceipt.events[0].args.subId
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
        subscriptionId = networkConfig[chainId].subscriptionId
    }

    log("--------------------------------------------------")
    const constructorArgs = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId].gasLane,
        networkConfig[chainId].callbackGasLimit,
        networkConfig[chainId].mintFee,
        tokenUris,
    ]

    const randomIpfs = await deploy("RandomIpfsNft", {
        from: deployer,
        args: constructorArgs,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(randomIpfs.address, constructorArgs)
    }
}

async function handleTokenUris() {
    const tokenUris = []

    const { responses: imageUploadResponse, files } = await storeImage(imagesLocation)
    for (responseIndex in imageUploadResponse) {
        let tokenUriMetadata = {...metadataTemplate }
        tokenUriMetadata.name = files[responseIndex].replace(".png", "")
        tokenUriMetadata.description = `An adorable ${tokenUriMetadata.name} pup!`
        tokenUriMetadata.image = `ipfs://${imageUploadResponse[responseIndex].IpfsHash}`
        console.log("Uploading")
        console.log(tokenUriMetadata)

        const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata)
        tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
    }
    console.log("Token uris uploaded")
    console.log(tokenUris)
    return tokenUris
}

module.exports.tags = ["all", "randomnft", "main"]