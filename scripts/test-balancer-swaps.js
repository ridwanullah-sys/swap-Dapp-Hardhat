const { ethers, waffle } = require("hardhat")
const { SubgraphPoolDataService } = require("../utils/subgraphDataProvider")
const { CoingeckoTokenPriceService } = require("../utils/coingeckoTokenPriceService")
const { SOR, SwapTypes } = require("@balancer-labs/sor")
const fs = require("fs")

async function swap() {
    const subgraphPoolDataService = new SubgraphPoolDataService({
        subgraphUrl: "https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2-beta",
    })
    const tokenInAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
    const tokenOutAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    const coingeckoTokenPriceService = new CoingeckoTokenPriceService(1)
    const SOR_Config = {
        chainId: 1,
        vault: "0xBA12222222228d8Ba445958a75a0704d566BF2C8",
        weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        wETHwstETH: {
            id: "0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080",
            address: "0x32296969ef14eb0c6d29669c550d4a0449130230",
        },
    }
    const provider = waffle.provider
    const sor = new SOR(provider, SOR_Config, subgraphPoolDataService, coingeckoTokenPriceService)

    console.log("---------------fetching Pools------------------")
    await sor.fetchPools()
    const pools = sor.getPools()
    console.log(pools.length)
    const amount = ethers.utils.parseUnits("0.1", 4)
    const swap = await sor.getSwaps(tokenInAddress, tokenOutAddress, SwapTypes.SwapExactOut, amount)

    const { deployer } = await getNamedAccounts()

    const ABIfile = "./constants/balancerABI.json"
    const ABIs = JSON.parse(fs.readFileSync(ABIfile, "utf8"))
    const vaultAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8"
    const vaultContract = await ethers.getContractAt(ABIs, vaultAddress)
    const fund_struct = {
        sender: deployer,
        fromInternalBalance: false,
        recipient: deployer,
        toInternalBalance: false,
    }
    console.log("----------calling queryBatch swap--------------------")
    const batch_swap_function = await vaultContract.callStatic.queryBatchSwap(
        1,
        swap.swaps,
        swap.tokenAddresses,
        fund_struct
    )
    console.log(batch_swap_function.toString())
    console.log("---------getting Approval Amount-------------------")
    const swapContract = await ethers.getContract("Swap", deployer)
    const swapType = 2
    const approvalAmount = await swapContract.approvalAmountRequired(
        batch_swap_function[0],
        swapType,
        5
    )
    console.log(approvalAmount.toString())
    console.log("---------approving..-------------------")
    const ABIfile2 = "./constants/ERC20ABI.json"
    const ABIs2 = JSON.parse(fs.readFileSync(ABIfile2, "utf8"))
    const token1Contract = await ethers.getContractAt(ABIs2, tokenInAddress)
    const token2Contract = await ethers.getContractAt(ABIs2, tokenOutAddress)
    const approve = await token1Contract.approve(swapContract.address, approvalAmount)
    await approve.wait()
    console.log("----------swapping---------------------")
    const deployerBalance = await token1Contract.balanceOf(deployer)
    console.log(`balance of deployer is ${deployerBalance.toString()}`)
    const swapWithBalancer = await swapContract.swapWithBalancer(
        swap.swaps,
        swap.tokenAddresses,
        batch_swap_function,
        5,
        swapType
    )
    await swapWithBalancer.wait()

    console.log("---------getting readers-------------------")
    const balanceOfOwner = await token1Contract.balanceOf(
        "0x4639155fb94e983a13f76be68845012f7eDCA46f"
    )
    console.log(`Owners balance ${balanceOfOwner.toString()}`)
    const tokenAmountSent = await swapContract.tokenAmountSent()
    const AmountReceived = await swapContract.tokenAmountReceived()
    console.log(`token Amount Sent ${tokenAmountSent.toString()}`)
    console.log(`token Amount Received ${AmountReceived.toString()}`)
    const balanceAfter = await swapContract.balanceAfter()
    console.log(`balance After ${balanceAfter}`)
}

swap()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
