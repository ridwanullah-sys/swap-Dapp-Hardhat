const { ethers } = require("hardhat")
const fs = require("fs")

const swap = async () => {
    const ABIfile = "./constants/ERC20ABI.json"
    const CurveABIfile = "./constants/curveABIs.json"
    const ABIs = JSON.parse(fs.readFileSync(ABIfile, "utf8"))
    const curveABIs = JSON.parse(fs.readFileSync(CurveABIfile, "utf8"))
    const { deployer } = await getNamedAccounts()
    const swapContract = await ethers.getContract("Swap", deployer)
    const tokenInAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7" //"0x6B175474E89094C44Da98b954EedeAC495271d0F"
    const tokenOutAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" //"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" //"0xdAC17F958D2ee523a2206206994597C13D831ec7"
    const token1Contract = await ethers.getContractAt(ABIs, tokenInAddress)
    const token2Contract = await ethers.getContractAt(ABIs, tokenOutAddress)
    const amount = ethers.utils.parseUnits("1", 8)
    const balanceOfDeployer = await token1Contract.balanceOf(deployer)
    const curveContract = await ethers.getContractAt(
        curveABIs["Vyper"],
        "0x99a58482BD75cbab83b27EC03CA68fF489b5788f"
    )
    console.log(`Initial deployer Balance is ${balanceOfDeployer}`)
    console.log("----------getting approval amount Required----------------------")
    const swapType = 1
    const approvalAmount = await swapContract.approvalAmountRequired(amount, swapType, 5)
    console.log(approvalAmount.toString())
    console.log("---------approving..-------------------")
    const approve1 = await token1Contract.approve(curveContract.address, 0)
    await approve1.wait()
    const approve = await token1Contract.approve(curveContract.address, approvalAmount)
    await approve.wait()
    console.log("-------------calling Swap------------------")
    const ethAddress = "0x0000000000000000000000000000000000000123"
    const Value = tokenInAddress == ethAddress ? approvalAmount : 0
    // const curveResult = await swapContract.swapWithCurve(
    //     tokenInAddress,
    //     tokenOutAddress,
    //     amount,
    //     0,
    //     5,
    //     { value: 0 }
    // )
    const swap = await curveContract.exchange_with_best_rate(
        tokenInAddress,
        tokenOutAddress,
        amount,
        0,
        {
            gasLimit: 30000000,
            value: 0,
        }
    )

    const tx = await swap.wait()
    console.log(tx)
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
