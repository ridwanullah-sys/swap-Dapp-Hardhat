const { ethers } = require("hardhat")
const fs = require("fs")

const swap = async () => {
    const ABIfile = "./constants/ERC20ABI.json"
    const ABIs = JSON.parse(fs.readFileSync(ABIfile, "utf8"))
    const { deployer } = await getNamedAccounts()
    const swapContract = await ethers.getContract("Swap", deployer)
    const Weth = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    const WethContract = await ethers.getContractAt(ABIs, Weth)
    const balanceOfDeployer = await WethContract.balanceOf(deployer)
    console.log(`balanceOfDeployer ${balanceOfDeployer}`)
    const amount = ethers.utils.parseEther("0.1")
    console.log("---------approving..-------------------")
    const approve = await WethContract.approve(swapContract.address, amount)
    await approve.wait()
    console.log("-------------wrapping-------------------")
    const wrap = await swapContract.unWrap(amount, 888)
    await wrap.wait()
    console.log("---------getting readers-------------------")
    const tokenAmountSent = await swapContract.tokenAmountSent()
    const AmountReceived = await swapContract.tokenAmountReceived()
    console.log(`token Amount Sent ${tokenAmountSent.toString()}`)
    console.log(`token Amount Received ${AmountReceived.toString()}`)
    const balanceAfter = await swapContract.balanceBefore()
    console.log(`balance After ${balanceAfter}`)
}
swap()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
