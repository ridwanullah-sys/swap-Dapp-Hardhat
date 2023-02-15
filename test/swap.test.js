const { ethers, getNamedAccounts, deployments } = require("hardhat")
const fs = require("fs")
const { assert, expect } = require("chai")
const { SubgraphPoolDataService, getQuery, query } = require("../utils/subgraphDataProvider")
const { CoingeckoTokenPriceService } = require("../utils/coingeckoTokenPriceService")
const { SOR, SwapTypes } = require("@balancer-labs/sor")
const { BigNumber } = require("ethers")

describe("swap test", function () {
    let tokenInput,
        tokenOutput,
        deployer,
        swap,
        approvalAmount,
        tokenInContract,
        tokenOutContract,
        vaultContract,
        fund_struct,
        sushiContract,
        uniContract,
        curveContract
    const amountIn = ethers.utils.parseEther("0.00001")
    const slippage = 5
    const ABIfile = "./constants/ERC20ABI.json"
    const ABIs = JSON.parse(fs.readFileSync(ABIfile, "utf8"))
    const owner = "0x4639155fb94e983a13f76be68845012f7eDCA46f"
    const ETH = "0x0000000000000000000000000000000000000123"
    const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    const subgraphPoolDataService = new SubgraphPoolDataService({
        subgraphUrl: "https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2-beta",
    })
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
    const balancerABIfile = "./constants/balancerABI.json"
    const balancerABIs = JSON.parse(fs.readFileSync(balancerABIfile, "utf8"))
    const sushiABIfile = "./constants/sushiABIs.json"
    const sushiABIs = JSON.parse(fs.readFileSync(sushiABIfile, "utf8"))
    const uniswapABIfile = "./constants/uniSwapABI.json"
    const uniswapABIs = JSON.parse(fs.readFileSync(uniswapABIfile, "utf8"))
    const curveABIFile = "./constants/curveABIs.json"
    const curveABIs = JSON.parse(fs.readFileSync(curveABIFile, "utf8"))

    const Balances = async (tokenInputAddress, tokenOutputAddress) => {
        const provider = waffle.provider
        const inputTokenContract = new ethers.Contract(tokenInputAddress, ABIs, provider)
        const outTokenContract = new ethers.Contract(tokenOutputAddress, ABIs, provider)
        const OwnerTokenBalance = await inputTokenContract.balanceOf(owner)
        const contractTokenInBalance = await inputTokenContract.balanceOf(swap.address)
        const contractTokenOutBalance = await outTokenContract.balanceOf(swap.address)
        const OwnerETHBalance = await provider.getBalance(owner)
        const contractEthBalance = await provider.getBalance(swap.address)
        const receipientTokenInBalance = await inputTokenContract.balanceOf(deployer)
        const receipientTokenOutBalance = await outTokenContract.balanceOf(deployer)
        const receipientETHBalance = await provider.getBalance(deployer)

        return {
            OwnerTokenBalance: OwnerTokenBalance,
            contractTokenInBalance: contractTokenInBalance,
            contractTokenOutBalance: contractTokenOutBalance,
            OwnerETHBalance: OwnerETHBalance,
            contractEthBalance: contractEthBalance,
            receipientTokenInBalance: receipientTokenInBalance,
            receipientTokenOutBalance: receipientTokenOutBalance,
            receipientETHBalance: receipientETHBalance,
        }
    }
    beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture("all")
        swap = await ethers.getContract("Swap", deployer)
        vaultContract = await ethers.getContractAt(
            balancerABIs,
            "0xBA12222222228d8Ba445958a75a0704d566BF2C8"
        )
        sushiContract = await ethers.getContractAt(
            sushiABIs["0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"],
            "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"
        )
        uniContract = await ethers.getContractAt(
            uniswapABIs["0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"],
            "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"
        )
        curveContract = await ethers.getContractAt(
            curveABIs["Vyper"],
            "0x99a58482BD75cbab83b27EC03CA68fF489b5788f"
        )
        fund_struct = {
            sender: deployer,
            fromInternalBalance: false,
            recipient: deployer,
            toInternalBalance: false,
        }
    })

    describe("Token-Token", () => {
        beforeEach(async () => {
            tokenInput = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
            tokenOutput = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
            tokenInContract = await ethers.getContractAt(ABIs, tokenInput)
        })
        describe("E ExactInput", () => {
            let Balances1, swapType
            beforeEach(async () => {
                swapType = 1
                approvalAmount = await swap.approvalAmountRequired(amountIn, swapType, slippage)
                const approve = await tokenInContract.approve(swap.address, approvalAmount)
                await approve.wait()
                Balances1 = await Balances(tokenInput, tokenOutput)
            })
            it("Uniswap", async () => {
                const result = await uniContract.callStatic.quoteExactInputSingle(
                    tokenInput,
                    tokenOutput,
                    3000,
                    amountIn,
                    0
                )
                await swap.Uniswap(tokenInput, tokenOutput, 3000, amountIn, 0, swapType, slippage, {
                    value: 0,
                })
                const Balances2 = await Balances(tokenInput, tokenOutput)
                const AmountSent = Balances1.receipientTokenInBalance.sub(
                    Balances2.receipientTokenInBalance
                )
                const AmountReceived = Balances2.receipientTokenOutBalance.sub(
                    Balances1.receipientTokenOutBalance
                )
                const AmountReceivedByOwner = Balances2.OwnerTokenBalance.sub(
                    Balances1.OwnerTokenBalance
                )
                const AssetWithSlippage = result.mul(BigNumber.from(100).sub(slippage)).div(100)
                assert.equal(AmountSent.toString(), approvalAmount.toString())
                assert.equal(AmountReceived.toString() >= AssetWithSlippage.toString(), true)
                assert.equal(AmountReceivedByOwner.toString(), amountIn.div(100).toString())
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
            })
            it("sushiswap", async () => {
                const result = await sushiContract.getAmountsOut(amountIn, [
                    tokenInput,
                    tokenOutput,
                ])
                await swap.swapWithSushi(tokenInput, tokenOutput, amountIn, 0, slippage, swapType, {
                    value: 0,
                })
                const Balances2 = await Balances(tokenInput, tokenOutput)
                const AmountSent = Balances1.receipientTokenInBalance.sub(
                    Balances2.receipientTokenInBalance
                )
                const AmountReceived = Balances2.receipientTokenOutBalance.sub(
                    Balances1.receipientTokenOutBalance
                )
                const AmountReceivedByOwner = Balances2.OwnerTokenBalance.sub(
                    Balances1.OwnerTokenBalance
                )
                const AssetWithSlippage = result[1].mul(BigNumber.from(100).sub(slippage)).div(100)
                assert.equal(AmountSent.toString(), approvalAmount.toString())
                assert.equal(AmountReceived.toString() >= AssetWithSlippage.toString(), true)
                assert.equal(AmountReceivedByOwner.toString(), amountIn.div(100).toString())
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
            })
            it("E Curve", async () => {
                const result = await curveContract.get_best_rate(tokenInput, tokenOutput, amountIn)
                await swap.swapWithCurve(tokenInput, tokenOutput, amountIn, 0, slippage, {
                    value: 0,
                })
                const Balances2 = await Balances(tokenInput, tokenOutput)
                const AmountSent = Balances1.receipientTokenInBalance.sub(
                    Balances2.receipientTokenInBalance
                )
                const AmountReceived = Balances2.receipientTokenOutBalance.sub(
                    Balances1.receipientTokenOutBalance
                )
                const AmountReceivedByOwner = Balances2.OwnerTokenBalance.sub(
                    Balances1.OwnerTokenBalance
                )
                const AssetWithSlippage = result[1].mul(BigNumber.from(100).sub(slippage)).div(100)
                assert.equal(AmountSent.toString(), approvalAmount.toString())
                assert.equal(AmountReceived.toString() >= AssetWithSlippage.toString(), true)
                assert.equal(AmountReceivedByOwner.toString(), amountIn.div(100).toString())
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
            })
            it("Balancer", async () => {
                await getQuery(tokenInput, tokenOutput)
                await sor.fetchPools()
                const swaps = await sor.getSwaps(
                    tokenInput,
                    tokenOutput,
                    SwapTypes.SwapExactIn,
                    amountIn
                )
                const batch_swap_function = await vaultContract.callStatic.queryBatchSwap(
                    SwapTypes.SwapExactIn,
                    swaps.swaps,
                    swaps.tokenAddresses,
                    fund_struct
                )
                const swapWithBalancer = await swap.swapWithBalancer(
                    tokenInput,
                    tokenOutput,
                    swaps.swaps,
                    swaps.tokenAddresses,
                    batch_swap_function,
                    slippage,
                    swapType,
                    { value: 0 }
                )

                await swapWithBalancer.wait()
                const Balances2 = await Balances(tokenInput, tokenOutput)
                const Asset = batch_swap_function.find((assetdellta) => assetdellta < 0).mul(-1)

                const AmountSent = Balances1.receipientTokenInBalance.sub(
                    Balances2.receipientTokenInBalance
                )
                const AmountReceived = Balances2.receipientTokenOutBalance.sub(
                    Balances1.receipientTokenOutBalance
                )
                const AmountReceivedByOwner = Balances2.OwnerTokenBalance.sub(
                    Balances1.OwnerTokenBalance
                )
                const AssetWithSlippage = Asset.mul(BigNumber.from(100).sub(slippage)).div(100)
                assert.equal(AmountSent.toString(), approvalAmount.toString())
                assert.equal(AmountReceived.toString() >= AssetWithSlippage.toString(), true)
                assert.equal(AmountReceivedByOwner.toString(), amountIn.div(100).toString())
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
            })
        })
        describe("ExactOutput", () => {
            let Balances1, swapType
            beforeEach(async () => {
                swapType = 2
                approvalAmount = await swap.approvalAmountRequired(amountIn, swapType, slippage)
                const approve = await tokenInContract.approve(swap.address, approvalAmount)
                await approve.wait()
                Balances1 = await Balances(tokenInput, tokenOutput)
            })
            it("Uniswap", async () => {
                const result = await uniContract.callStatic.quoteExactOutputSingle(
                    tokenInput,
                    tokenOutput,
                    3000,
                    2,
                    0
                )

                await swap.Uniswap(tokenInput, tokenOutput, 3000, amountIn, 2, swapType, slippage, {
                    value: 0,
                })
                const Balances2 = await Balances(tokenInput, tokenOutput)
                const AssetWithSlippage = result.mul(BigNumber.from(100).add(slippage)).div(100)
                const AmountSent = Balances1.receipientTokenInBalance.sub(
                    Balances2.receipientTokenInBalance
                )
                const AmountReceived =
                    Balances2.receipientTokenOutBalance - Balances1.receipientTokenOutBalance
                const AmountReceivedByOwner =
                    Balances2.OwnerTokenBalance - Balances1.OwnerTokenBalance
                assert.equal(AmountReceived, 2)
                assert.equal(
                    AmountSent.toString() <= AssetWithSlippage.add(amountIn.div(100)).toString(),
                    true
                )
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
            })
            it("sushiswap", async () => {
                const result = await sushiContract.getAmountsIn(2, [tokenInput, tokenOutput])
                await swap.swapWithSushi(tokenInput, tokenOutput, amountIn, 2, slippage, swapType, {
                    value: 0,
                })
                const Balances2 = await Balances(tokenInput, tokenOutput)
                const AssetWithSlippage = result[0].mul(BigNumber.from(100).add(slippage)).div(100)
                const AmountSent = Balances1.receipientTokenInBalance.sub(
                    Balances2.receipientTokenInBalance
                )
                const AmountReceived =
                    Balances2.receipientTokenOutBalance - Balances1.receipientTokenOutBalance
                const AmountReceivedByOwner =
                    Balances2.OwnerTokenBalance - Balances1.OwnerTokenBalance
                assert.equal(AmountReceived, 2)
                assert.equal(
                    AmountSent.toString() <= AssetWithSlippage.add(amountIn.div(100)).toString(),
                    true
                )
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
            })
            it("Balancer", async () => {
                await getQuery(tokenInput, tokenOutput)
                await sor.fetchPools()
                const swaps = await sor.getSwaps(tokenInput, tokenOutput, SwapTypes.SwapExactOut, 2)
                const batch_swap_function = await vaultContract.callStatic.queryBatchSwap(
                    SwapTypes.SwapExactOut,
                    swaps.swaps,
                    swaps.tokenAddresses,
                    fund_struct
                )
                const swapWithBalancer = await swap.swapWithBalancer(
                    tokenInput,
                    tokenOutput,
                    swaps.swaps,
                    swaps.tokenAddresses,
                    batch_swap_function,
                    slippage,
                    swapType,
                    { value: 0 }
                )

                await swapWithBalancer.wait()
                const AssetWithSlippage = batch_swap_function[0]
                    .mul(BigNumber.from(100).add(slippage))
                    .div(100)
                const Balances2 = await Balances(tokenInput, tokenOutput)
                const AmountSent = Balances1.receipientTokenInBalance.sub(
                    Balances2.receipientTokenInBalance
                )
                const AmountReceived =
                    Balances2.receipientTokenOutBalance - Balances1.receipientTokenOutBalance
                const AmountReceivedByOwner =
                    Balances2.OwnerTokenBalance - Balances1.OwnerTokenBalance
                assert.equal(AmountReceived, 2)
                assert.equal(
                    AmountSent.toString() <=
                        AssetWithSlippage.add(batch_swap_function[0].div(100)).toString(),
                    true
                )
                assert.equal(AmountReceivedByOwner, batch_swap_function[0].div(100))
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
            })
        })
    })

    describe("ETH-Token", () => {
        beforeEach(async () => {
            tokenOutput = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
            tokenOutContract = await ethers.getContractAt(ABIs, tokenOutput)
        })
        describe("ExactInput", () => {
            let Balances1, swapType
            beforeEach(async () => {
                swapType = 1
                approvalAmount = await swap.approvalAmountRequired(amountIn, swapType, slippage)
                Balances1 = await Balances(WETH, tokenOutput)
            })
            it("Uniswap", async () => {
                const result = await uniContract.callStatic.quoteExactInputSingle(
                    WETH,
                    tokenOutput,
                    3000,
                    amountIn,
                    0
                )
                const tx = await swap.Uniswap(
                    ETH,
                    tokenOutput,
                    3000,
                    amountIn,
                    0,
                    swapType,
                    slippage,
                    {
                        value: approvalAmount.add(200),
                    }
                )
                const txreceipt = await tx.wait()
                const { effectiveGasPrice, gasUsed } = txreceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)
                const Balances2 = await Balances(WETH, tokenOutput)
                const AmountSent = Balances1.receipientETHBalance.sub(
                    Balances2.receipientETHBalance
                )
                const AmountReceived =
                    Balances2.receipientTokenOutBalance - Balances1.receipientTokenOutBalance
                const AmountReceivedByOwner =
                    Balances2.OwnerTokenBalance - Balances1.OwnerTokenBalance
                const AssetWithSlippage = result.mul(BigNumber.from(100).sub(slippage)).div(100)
                assert.equal(AmountSent.toString(), approvalAmount.add(gasCost).toString())
                assert.equal(AmountReceived.toString() >= AssetWithSlippage.toString(), true)
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
                assert.equal(Balances2.contractEthBalance.toString(), 0)
            })
            it("sushiswap", async () => {
                const result = await sushiContract.getAmountsOut(amountIn, [WETH, tokenOutput])
                const tx = await swap.swapWithSushi(
                    ETH,
                    tokenOutput,
                    amountIn,
                    0,
                    slippage,
                    swapType,
                    {
                        value: approvalAmount.add(100),
                    }
                )
                const txreceipt = await tx.wait()
                const { effectiveGasPrice, gasUsed } = txreceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)
                const Balances2 = await Balances(WETH, tokenOutput)
                const AmountSent = Balances1.receipientETHBalance.sub(
                    Balances2.receipientETHBalance
                )
                const AmountReceived =
                    Balances2.receipientTokenOutBalance - Balances1.receipientTokenOutBalance
                const AmountReceivedByOwner = Balances2.OwnerETHBalance - Balances1.OwnerETHBalance
                const AssetWithSlippage = result[1].mul(BigNumber.from(100).sub(slippage)).div(100)
                assert.equal(AmountSent.toString(), approvalAmount.add(gasCost).toString())
                assert.equal(AmountReceived.toString() >= AssetWithSlippage.toString(), true)
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
                assert.equal(Balances2.contractEthBalance.toString(), 0)
            })
            it("Balancer", async () => {
                await getQuery(WETH, tokenOutput)
                await sor.fetchPools()
                const swaps = await sor.getSwaps(WETH, tokenOutput, SwapTypes.SwapExactIn, amountIn)
                const batch_swap_function = await vaultContract.callStatic.queryBatchSwap(
                    SwapTypes.SwapExactIn,
                    swaps.swaps,
                    swaps.tokenAddresses,
                    fund_struct
                )
                const swapWithBalancer = await swap.swapWithBalancer(
                    ETH,
                    tokenOutput,
                    swaps.swaps,
                    swaps.tokenAddresses,
                    batch_swap_function,
                    slippage,
                    swapType,
                    { value: approvalAmount.add(1000) }
                )

                const txreceipt = await swapWithBalancer.wait()
                const Balances2 = await Balances(WETH, tokenOutput)
                const Asset = batch_swap_function.find((assetdellta) => assetdellta < 0).mul(-1)
                const { effectiveGasPrice, gasUsed } = txreceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)
                const AmountSent = Balances1.receipientETHBalance.sub(
                    Balances2.receipientETHBalance
                )
                const AmountReceived =
                    Balances2.receipientTokenOutBalance - Balances1.receipientTokenOutBalance
                const AmountReceivedByOwner =
                    Balances2.OwnerTokenBalance - Balances1.OwnerTokenBalance
                const AssetWithSlippage = Asset.mul(BigNumber.from(100).sub(slippage)).div(100)

                assert.equal(AmountSent.toString(), approvalAmount.add(gasCost).toString())
                assert.equal(AmountReceived.toString() >= AssetWithSlippage.toString(), true)
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
                assert.equal(Balances2.contractEthBalance.toString(), 0)
            })
        })
        describe("ExactOutput", () => {
            let Balances1, swapType
            beforeEach(async () => {
                swapType = 2
                approvalAmount = await swap.approvalAmountRequired(amountIn, swapType, slippage)
                Balances1 = await Balances(WETH, tokenOutput)
            })
            it("Uniswap", async () => {
                const result = await uniContract.callStatic.quoteExactOutputSingle(
                    WETH,
                    tokenOutput,
                    3000,
                    200,
                    0
                )
                const tx = await swap.Uniswap(
                    ETH,
                    tokenOutput,
                    3000,
                    amountIn,
                    200,
                    swapType,
                    slippage,
                    {
                        value: approvalAmount.add(200),
                    }
                )
                const txreceipt = await tx.wait()
                const Balances2 = await Balances(WETH, tokenOutput)
                const AssetWithSlippage = result.mul(BigNumber.from(100).add(slippage)).div(100)
                const { effectiveGasPrice, gasUsed } = txreceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)
                const AmountSent = Balances1.receipientETHBalance.sub(
                    Balances2.receipientETHBalance
                )
                const AmountReceived = Balances2.receipientTokenOutBalance.sub(
                    Balances1.receipientTokenOutBalance
                )

                const AmountReceivedByOwner =
                    Balances2.OwnerTokenBalance - Balances1.OwnerTokenBalance
                assert.equal(AmountReceived.toString(), (200).toString())
                assert.equal(
                    AmountSent.toString() <=
                        AssetWithSlippage.add(gasCost.add(amountIn / 100)).toString(),
                    true
                )
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
                assert.equal(Balances2.contractEthBalance.toString(), 0)
            })
            it("sushiswap", async () => {
                const result = await sushiContract.getAmountsIn(200, [WETH, tokenOutput])
                const tx = await swap.swapWithSushi(
                    ETH,
                    tokenOutput,
                    amountIn,
                    200,
                    slippage,
                    swapType,
                    {
                        value: approvalAmount.add(100),
                    }
                )
                const txreceipt = await tx.wait()
                const Balances2 = await Balances(WETH, tokenOutput)
                const AssetWithSlippage = result[0].mul(BigNumber.from(100).add(slippage)).div(100)
                const { effectiveGasPrice, gasUsed } = txreceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)
                const AmountSent = Balances1.receipientETHBalance.sub(
                    Balances2.receipientETHBalance
                )
                const AmountReceived = Balances2.receipientTokenOutBalance.sub(
                    Balances1.receipientTokenOutBalance
                )
                const AmountReceivedByOwner = Balances2.OwnerETHBalance - Balances1.OwnerETHBalance
                assert.equal(AmountReceived.toString(), (200).toString())
                assert.equal(
                    AmountSent.toString() <=
                        AssetWithSlippage.add(gasCost.add(amountIn / 100)).toString(),
                    true
                )
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
                assert.equal(Balances2.contractEthBalance.toString(), 0)
            })
            it("Balancer", async () => {
                await getQuery(WETH, tokenOutput)
                await sor.fetchPools()
                const swaps = await sor.getSwaps(WETH, tokenOutput, SwapTypes.SwapExactOut, 200)
                const batch_swap_function = await vaultContract.callStatic.queryBatchSwap(
                    SwapTypes.SwapExactOut,
                    swaps.swaps,
                    swaps.tokenAddresses,
                    fund_struct
                )
                const tx = await swap.swapWithBalancer(
                    ETH,
                    tokenOutput,
                    swaps.swaps,
                    swaps.tokenAddresses,
                    batch_swap_function,
                    slippage,
                    swapType,
                    { value: approvalAmount.add(700) }
                )

                const txreceipt = await tx.wait()
                const Balances2 = await Balances(WETH, tokenOutput)
                const AssetWithSlippage = batch_swap_function[0]
                    .mul(BigNumber.from(100).add(slippage))
                    .div(100)
                const { effectiveGasPrice, gasUsed } = txreceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)
                const AmountSent = Balances1.receipientETHBalance.sub(
                    Balances2.receipientETHBalance
                )
                const AmountReceived = Balances2.receipientTokenOutBalance.sub(
                    Balances1.receipientTokenOutBalance
                )
                const AmountReceivedByOwner =
                    Balances2.OwnerTokenBalance - Balances1.OwnerTokenBalance
                assert.equal(AmountReceived.toString(), (200).toString())
                assert.equal(
                    AmountSent.toString() <=
                        AssetWithSlippage.add(
                            gasCost.add(batch_swap_function[0].div(100))
                        ).toString(),
                    true
                )
                assert.equal(AmountReceivedByOwner, batch_swap_function[0].div(100))
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
                assert.equal(Balances2.contractEthBalance.toString(), 0)
            })
        })
    })
    describe("Token-ETH", () => {
        beforeEach(async () => {
            tokenInput = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
            tokenInContract = await ethers.getContractAt(ABIs, tokenInput)
        })
        describe("ExactInput", () => {
            let Balances1, swapType
            beforeEach(async () => {
                swapType = 1
                approvalAmount = await swap.approvalAmountRequired(amountIn, swapType, slippage)
                const approve = await tokenInContract.approve(swap.address, approvalAmount)
                await approve.wait()
                Balances1 = await Balances(tokenInput, WETH)
            })
            it("Uniswap", async () => {
                const result = await uniContract.callStatic.quoteExactInputSingle(
                    tokenInput,
                    WETH,
                    3000,
                    amountIn,
                    0
                )
                const tx = await swap.Uniswap(
                    tokenInput,
                    ETH,
                    3000,
                    amountIn,
                    0,
                    swapType,
                    slippage,
                    {
                        value: 0,
                    }
                )
                const txreceipt = await tx.wait()
                const { effectiveGasPrice, gasUsed } = txreceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)
                const Balances2 = await Balances(tokenInput, WETH)
                const AmountSent = Balances1.receipientTokenInBalance.sub(
                    Balances2.receipientTokenInBalance
                )
                const AmountReceived = Balances2.receipientETHBalance.sub(
                    Balances1.receipientETHBalance
                )
                const AmountReceivedByOwner =
                    Balances2.OwnerTokenBalance - Balances1.OwnerTokenBalance
                const AssetWithSlippage = result.mul(BigNumber.from(100).sub(slippage)).div(100)
                assert.equal(AmountSent.toString(), approvalAmount)
                assert.equal(
                    AmountReceived.add(gasCost).toString() >= AssetWithSlippage.toString(),
                    true
                )
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
                assert.equal(Balances2.contractEthBalance.toString(), 0)
            })
            it("sushiswap", async () => {
                const result = await sushiContract.getAmountsOut(amountIn, [tokenInput, WETH])
                const tx = await swap.swapWithSushi(
                    tokenInput,
                    ETH,
                    amountIn,
                    0,
                    slippage,
                    swapType,
                    {
                        value: 0,
                    }
                )
                const txreceipt = await tx.wait()
                const Balances2 = await Balances(tokenInput, WETH)
                const { effectiveGasPrice, gasUsed } = txreceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)
                const AmountSent = Balances1.receipientTokenInBalance.sub(
                    Balances2.receipientTokenInBalance
                )
                const AmountReceived = Balances2.receipientETHBalance.sub(
                    Balances1.receipientETHBalance
                )
                const AmountReceivedByOwner =
                    Balances2.OwnerTokenBalance - Balances1.OwnerTokenBalance
                const AssetWithSlippage = result[1].mul(BigNumber.from(100).sub(slippage)).div(100)
                assert.equal(AmountSent.toString(), approvalAmount)
                assert.equal(
                    AmountReceived.add(gasCost).toString() >= AssetWithSlippage.toString(),
                    true
                )
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
                assert.equal(Balances2.contractEthBalance.toString(), 0)
            })
            it("Balancer", async () => {
                await getQuery(tokenInput, WETH)
                await sor.fetchPools()
                const swaps = await sor.getSwaps(tokenInput, WETH, SwapTypes.SwapExactIn, amountIn)
                const batch_swap_function = await vaultContract.callStatic.queryBatchSwap(
                    SwapTypes.SwapExactIn,
                    swaps.swaps,
                    swaps.tokenAddresses,
                    fund_struct
                )
                const tx = await swap.swapWithBalancer(
                    tokenInput,
                    ETH,
                    swaps.swaps,
                    swaps.tokenAddresses,
                    batch_swap_function,
                    slippage,
                    swapType,
                    { value: 0 }
                )

                const txreceipt = await tx.wait()
                const Balances2 = await Balances(tokenInput, WETH)
                const Asset = batch_swap_function.find((assetdellta) => assetdellta < 0).mul(-1)
                const { effectiveGasPrice, gasUsed } = txreceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)
                const AssetWithSlippage = Asset.mul(BigNumber.from(100).sub(slippage)).div(100)
                const AmountSent = Balances1.receipientTokenInBalance.sub(
                    Balances2.receipientTokenInBalance
                )
                const AmountReceived = Balances2.receipientETHBalance.sub(
                    Balances1.receipientETHBalance
                )
                const AmountReceivedByOwner =
                    Balances2.OwnerTokenBalance - Balances1.OwnerTokenBalance
                console.log(AmountReceived.add(gasCost).toString())
                console.log(Asset.toString())
                assert.equal(AmountSent.toString(), approvalAmount)
                assert.equal(
                    AmountReceived.add(gasCost).toString() >= AssetWithSlippage.toString(),
                    true
                )
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
                assert.equal(Balances2.contractEthBalance.toString(), 0)
            })
        })
        describe("ExactOutput", () => {
            let Balances1, swapType
            beforeEach(async () => {
                swapType = 2
                approvalAmount = await swap.approvalAmountRequired(amountIn, swapType, slippage)
                const approve = await tokenInContract.approve(swap.address, approvalAmount)
                await approve.wait()
                Balances1 = await Balances(tokenInput, WETH)
            })

            it("Uniswap", async () => {
                const result = await uniContract.callStatic.quoteExactOutputSingle(
                    tokenInput,
                    WETH,
                    3000,
                    2,
                    0
                )

                const tx = await swap.Uniswap(
                    tokenInput,
                    ETH,
                    3000,
                    amountIn,
                    2,
                    swapType,
                    slippage,
                    {
                        value: 0,
                    }
                )
                const txreceipt = await tx.wait()
                const Balances2 = await Balances(tokenInput, WETH)
                const { effectiveGasPrice, gasUsed } = txreceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)
                const AssetWithSlippage = result.mul(BigNumber.from(100).add(slippage)).div(100)
                const AmountSent = Balances1.receipientTokenInBalance.sub(
                    Balances2.receipientTokenInBalance
                )
                const AmountReceived = Balances2.receipientETHBalance.sub(
                    Balances1.receipientETHBalance
                )
                const AmountReceivedByOwner =
                    Balances2.OwnerTokenBalance - Balances1.OwnerTokenBalance
                assert.equal(AmountReceived.add(gasCost).toString(), 2)
                assert.equal(
                    AmountSent.toString() <= AssetWithSlippage.add(amountIn.div(100)).toString(),
                    true
                )
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
                assert.equal(Balances2.contractEthBalance.toString(), 0)
            })
            it("sushiswap", async () => {
                const result = await sushiContract.getAmountsIn(2, [tokenInput, WETH])
                const tx = await swap.swapWithSushi(
                    tokenInput,
                    ETH,
                    amountIn,
                    2,
                    slippage,
                    swapType,
                    {
                        value: 0,
                    }
                )
                const txreceipt = await tx.wait()
                const Balances2 = await Balances(tokenInput, WETH)
                const { effectiveGasPrice, gasUsed } = txreceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)
                const AssetWithSlippage = result[0].mul(BigNumber.from(100).add(slippage)).div(100)
                const AmountSent = Balances1.receipientTokenInBalance.sub(
                    Balances2.receipientTokenInBalance
                )
                const AmountReceived = Balances2.receipientETHBalance.sub(
                    Balances1.receipientETHBalance
                )
                const AmountReceivedByOwner =
                    Balances2.OwnerTokenBalance - Balances1.OwnerTokenBalance
                assert.equal(AmountReceived.add(gasCost).toString(), 2)
                assert.equal(
                    AmountSent.toString() <= AssetWithSlippage.add(amountIn.div(100)).toString(),
                    true
                )
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
                assert.equal(Balances2.contractEthBalance.toString(), 0)
            })
            it("E Balancer", async () => {
                await getQuery(tokenInput, WETH)
                await sor.fetchPools()
                const swaps = await sor.getSwaps(tokenInput, WETH, SwapTypes.SwapExactOut, 2)
                const batch_swap_function = await vaultContract.callStatic.queryBatchSwap(
                    SwapTypes.SwapExactOut,
                    swaps.swaps,
                    swaps.tokenAddresses,
                    fund_struct
                )
                const tx = await swap.swapWithBalancer(
                    tokenInput,
                    ETH,
                    swaps.swaps,
                    swaps.tokenAddresses,
                    batch_swap_function,
                    slippage,
                    swapType,
                    { value: 0 }
                )

                const txreceipt = await tx.wait()
                const Balances2 = await Balances(tokenInput, WETH)
                const AssetWithSlippage = batch_swap_function[0]
                    .mul(BigNumber.from(100).add(slippage))
                    .div(100)
                const { effectiveGasPrice, gasUsed } = txreceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)
                const AmountSent = Balances1.receipientTokenInBalance.sub(
                    Balances2.receipientTokenInBalance
                )
                const AmountReceived = Balances2.receipientETHBalance.sub(
                    Balances1.receipientETHBalance
                )
                const AmountReceivedByOwner =
                    Balances2.OwnerTokenBalance - Balances1.OwnerTokenBalance
                assert.equal(AmountReceived.add(gasCost).toString(), 2)
                assert.equal(
                    AmountSent.toString() <=
                        AssetWithSlippage.add(batch_swap_function[0].div(100)).toString(),
                    true
                )
                assert.equal(AmountReceivedByOwner, batch_swap_function[0].div(100))
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
                assert.equal(Balances2.contractEthBalance.toString(), 0)
            })
        })
    })
})
