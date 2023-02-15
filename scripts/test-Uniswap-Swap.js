const { ethers } = require("hardhat")
const fs = require("fs")

async function swap() {
    const ABIfile = "./constants/ERC20ABI.json"
    const ABIs = JSON.parse(fs.readFileSync(ABIfile, "utf8"))
    const { deployer } = await getNamedAccounts()
    const swapContract = await ethers.getContract("Swap", deployer)

    const tokenInAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
    const tokenOutAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    const amount = ethers.utils.parseEther("0.0001")
    const token1Contract = await ethers.getContractAt(ABIs, tokenInAddress)
    const token2Contract = await ethers.getContractAt(ABIs, tokenOutAddress)
    console.log("---------getting Approval Amount-------------------")
    const swapType = 1
    const approvalAmount = await swapContract.approvalAmountRequired(amount, swapType, 5)
    console.log(approvalAmount.toString())
    console.log("---------approving..-------------------")
    const approve = await token1Contract.approve(swapContract.address, approvalAmount)
    await approve.wait()
    console.log("---------calling the swap-------------------")
    const ethAddress = "0x0000000000000000000000000000000000000123"
    const Value = tokenInAddress == ethAddress ? approvalAmount : 0
    const Uniswap = await swapContract.Uniswap(
        tokenInAddress,
        tokenOutAddress,
        3000,
        amount,
        2,
        swapType,
        5,
        { value: Value }
    )

    await Uniswap.wait()
    console.log("---------getting readers-------------------")
    const balanceOfOwner = await token1Contract.balanceOf(
        "0x4639155fb94e983a13f76be68845012f7eDCA46f"
    )
    console.log(`Owners balance ${balanceOfOwner.toString()}`)
}

swap()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
