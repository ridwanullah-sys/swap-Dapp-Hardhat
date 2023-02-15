const { ethers, network } = require("hardhat")
const fs = require("fs")

const frontendABI = "./../my_first_dapp/constants/swapABI.json"
const frontendAddress = "./../my_first_dapp/constants/swapAddress.json"

module.exports = async function (params) {
    if ([process.env.UPDATE_FRONT_END]) {
        console.log("updating....")
        await updateFrontEnd()
    }
}

async function updateFrontEnd() {
    const swap = await ethers.getContract("Swap")
    fs.writeFileSync(frontendABI, swap.interface.format(ethers.utils.FormatTypes.json))
    const Address = JSON.parse(fs.readFileSync(frontendAddress, "utf8"))
    Address["Contract_Address"] = swap.address
    fs.writeFileSync(frontendAddress, JSON.stringify(Address))
}

module.exports.tags = ["all", "frontend"]
