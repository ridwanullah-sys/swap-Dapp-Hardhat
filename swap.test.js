const { ethers, getNamedAccounts, deployments } = require("hardhat")
const fs = require("fs")
const { assert, expect } = require("chai")
const { BigNumber } = require("ethers")

describe("swap test", function () {
    let tokenInput, tokenOutput, deployer, swap, approvalAmount, tokenInContract, tokenOutContract
    const amountIn = ethers.utils.parseEther("0.00001")
    const slippage = 5
    const ABIfile = "./constants/ERC20ABI.json"
    const ABIs = JSON.parse(fs.readFileSync(ABIfile, "utf8"))
    const owner = "0x4639155fb94e983a13f76be68845012f7eDCA46f"
    const ETH = "0x0000000000000000000000000000000000000123"
    const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"

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
    })

    describe("Uniswap", () => {
        describe("Token-Token", () => {
            beforeEach(async () => {
                tokenInput = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
                tokenOutput = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
                tokenInContract = await ethers.getContractAt(ABIs, tokenInput)
                tokenOutContract = await ethers.getContractAt(ABIs, tokenOutput)
            })
            it("tests token-token ExactInput", async () => {
                const swapType = 1
                approvalAmount = await swap.approvalAmountRequired(amountIn, swapType, slippage)
                const approve = await tokenInContract.approve(swap.address, approvalAmount)
                await approve.wait()
                const Balances1 = await Balances(tokenInput, tokenOutput)
                await swap.Uniswap(tokenInput, tokenOutput, 3000, amountIn, 0, swapType, slippage, {
                    value: 0,
                })
                const Balances2 = await Balances(tokenInput, tokenOutput)
                const AmountSent =
                    Balances1.receipientTokenInBalance - Balances2.receipientTokenInBalance
                const AmountReceivedByOwner =
                    Balances2.OwnerTokenBalance - Balances1.OwnerTokenBalance
                assert.equal(AmountSent, approvalAmount)
                assert.equal(
                    Balances2.receipientTokenOutBalance > Balances1.receipientTokenOutBalance,
                    true
                )
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
            })
            it("test token-token ExactOutput", async () => {
                const swapType = 2
                approvalAmount = await swap.approvalAmountRequired(amountIn, swapType, slippage)
                const approve = await tokenInContract.approve(swap.address, approvalAmount)
                await approve.wait()
                const Balances1 = await Balances(tokenInput, tokenOutput)
                await swap.Uniswap(tokenInput, tokenOutput, 3000, amountIn, 2, swapType, slippage, {
                    value: 0,
                })
                const Balances2 = await Balances(tokenInput, tokenOutput)

                const AmountReceived =
                    Balances2.receipientTokenOutBalance - Balances1.receipientTokenOutBalance
                const AmountReceivedByOwner =
                    Balances2.OwnerTokenBalance - Balances1.OwnerTokenBalance
                assert.equal(AmountReceived, 2)
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
            })
            it("reverts if value > 0", async () => {
                await expect(
                    swap.Uniswap(tokenInput, tokenOutput, 3000, amountIn, 0, 1, slippage, {
                        value: 10,
                    })
                ).to.be.reverted
            })
        })
        describe("Token-ETH", () => {
            it("test token-eth ExactInput", async () => {
                const swapType = 1
                tokenInput = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
                approvalAmount = await swap.approvalAmountRequired(amountIn, swapType, slippage)
                tokenInContract = await ethers.getContractAt(ABIs, tokenInput)
                const approve = await tokenInContract.approve(swap.address, approvalAmount)
                await approve.wait()
                const Balances1 = await Balances(tokenInput, WETH)
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
                const AmountSent =
                    Balances1.receipientTokenInBalance - Balances2.receipientTokenInBalance
                const AmountReceivedByOwner =
                    Balances2.OwnerTokenBalance - Balances1.OwnerTokenBalance
                assert.equal(AmountSent.toString(), approvalAmount.toString())
                assert.equal(
                    Balances2.receipientETHBalance.add(gasCost) > Balances1.receipientETHBalance,
                    true
                )
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
                assert.equal(Balances2.contractEthBalance.toString(), 0)
            })
            it("test token-eth ExactOutput", async () => {
                const swapType = 2
                tokenInput = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
                approvalAmount = await swap.approvalAmountRequired(amountIn, swapType, slippage)
                tokenInContract = await ethers.getContractAt(ABIs, tokenInput)
                const approve = await tokenInContract.approve(swap.address, approvalAmount)
                await approve.wait()
                const Balances1 = await Balances(tokenInput, WETH)
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
                const AmountReceived = Balances2.receipientETHBalance.sub(
                    Balances1.receipientETHBalance
                )
                const AmountReceivedByOwner = Balances2.OwnerTokenBalance.sub(
                    Balances1.OwnerTokenBalance
                )
                assert.equal(AmountReceived.add(gasCost).toString(), (2).toString())
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
                assert.equal(Balances2.contractEthBalance.toString(), 0)
            })
        })
        describe("ETH-Token", () => {
            it("test eth-token ExactInput", async () => {
                const swapType = 1
                tokenOutput = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
                approvalAmount = await swap.approvalAmountRequired(amountIn, swapType, slippage)
                const Balances1 = await Balances(WETH, tokenOutput)
                const tx = await swap.Uniswap(
                    ETH,
                    tokenOutput,
                    3000,
                    amountIn,
                    0,
                    swapType,
                    slippage,
                    {
                        value: approvalAmount,
                    }
                )
                const txreceipt = await tx.wait()
                const { effectiveGasPrice, gasUsed } = txreceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)
                const Balances2 = await Balances(WETH, tokenOutput)
                const AmountSent = Balances1.receipientETHBalance.sub(
                    Balances2.receipientETHBalance
                )
                const AmountReceivedByOwner =
                    Balances2.OwnerTokenBalance - Balances1.OwnerTokenBalance
                assert.equal(AmountSent.toString(), approvalAmount.add(gasCost).toString())
                assert.equal(
                    Balances2.receipientTokenOutBalance > Balances1.receipientTokenOutBalance,
                    true
                )
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
                assert.equal(Balances2.contractEthBalance.toString(), 0)
            })
            it("test eth-token ExactOutput", async () => {
                const swapType = 2
                tokenOutput = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
                approvalAmount = await swap.approvalAmountRequired(amountIn, swapType, slippage)
                const Balances1 = await Balances(WETH, tokenOutput)
                const tx = await swap.Uniswap(
                    ETH,
                    tokenOutput,
                    3000,
                    amountIn,
                    200,
                    swapType,
                    slippage,
                    {
                        value: approvalAmount,
                    }
                )
                const txreceipt = await tx.wait()
                const Balances2 = await Balances(WETH, tokenOutput)
                const AmountReceived = Balances2.receipientTokenOutBalance.sub(
                    Balances1.receipientTokenOutBalance
                )
                const AmountReceivedByOwner =
                    Balances2.OwnerTokenBalance - Balances1.OwnerTokenBalance
                assert.equal(AmountReceived.toString(), (200).toString())
                assert.equal(
                    Balances2.receipientTokenOutBalance > Balances1.receipientTokenOutBalance,
                    true
                )
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
                assert.equal(Balances2.contractEthBalance.toString(), 0)
            })
        })
    })
    describe("SushiSwap", () => {
        describe("Token-Token", () => {
            beforeEach(async () => {
                tokenInput = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
                tokenOutput = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
                tokenInContract = await ethers.getContractAt(ABIs, tokenInput)
                tokenOutContract = await ethers.getContractAt(ABIs, tokenOutput)
            })
            it("tests token-token ExactInput", async () => {
                const swapType = 1
                approvalAmount = await swap.approvalAmountRequired(amountIn, swapType, slippage)
                const approve = await tokenInContract.approve(swap.address, approvalAmount)
                await approve.wait()
                const Balances1 = await Balances(tokenInput, tokenOutput)
                await swap.Uniswap(tokenInput, tokenOutput, 3000, amountIn, 0, swapType, slippage, {
                    value: 0,
                })
                const Balances2 = await Balances(tokenInput, tokenOutput)
                const AmountSent =
                    Balances1.receipientTokenInBalance - Balances2.receipientTokenInBalance
                const AmountReceivedByOwner =
                    Balances2.OwnerTokenBalance - Balances1.OwnerTokenBalance
                assert.equal(AmountSent, approvalAmount)
                assert.equal(
                    Balances2.receipientTokenOutBalance > Balances1.receipientTokenOutBalance,
                    true
                )
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
            })
            it("test token-token ExactOutput", async () => {
                const swapType = 2
                approvalAmount = await swap.approvalAmountRequired(amountIn, swapType, slippage)
                const approve = await tokenInContract.approve(swap.address, approvalAmount)
                await approve.wait()
                const Balances1 = await Balances(tokenInput, tokenOutput)
                await swap.Uniswap(tokenInput, tokenOutput, 3000, amountIn, 2, swapType, slippage, {
                    value: 0,
                })
                const Balances2 = await Balances(tokenInput, tokenOutput)

                const AmountReceived =
                    Balances2.receipientTokenOutBalance - Balances1.receipientTokenOutBalance
                const AmountReceivedByOwner =
                    Balances2.OwnerTokenBalance - Balances1.OwnerTokenBalance
                assert.equal(AmountReceived, 2)
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
            })
            it("reverts if value > 0", async () => {
                await expect(
                    swap.Uniswap(tokenInput, tokenOutput, 3000, amountIn, 0, 1, slippage, {
                        value: 10,
                    })
                ).to.be.reverted
            })
        })
        describe("Token-ETH", () => {
            it("test token-eth ExactInput", async () => {
                const swapType = 1
                tokenInput = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
                approvalAmount = await swap.approvalAmountRequired(amountIn, swapType, slippage)
                tokenInContract = await ethers.getContractAt(ABIs, tokenInput)
                const approve = await tokenInContract.approve(swap.address, approvalAmount)
                await approve.wait()
                const Balances1 = await Balances(tokenInput, WETH)
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
                const AmountSent =
                    Balances1.receipientTokenInBalance - Balances2.receipientTokenInBalance
                const AmountReceivedByOwner =
                    Balances2.OwnerTokenBalance - Balances1.OwnerTokenBalance
                assert.equal(AmountSent.toString(), approvalAmount.toString())
                assert.equal(
                    Balances2.receipientETHBalance.add(gasCost) > Balances1.receipientETHBalance,
                    true
                )
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
                assert.equal(Balances2.contractEthBalance.toString(), 0)
            })
            it("test token-eth ExactOutput", async () => {
                const swapType = 2
                tokenInput = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
                approvalAmount = await swap.approvalAmountRequired(amountIn, swapType, slippage)
                tokenInContract = await ethers.getContractAt(ABIs, tokenInput)
                const approve = await tokenInContract.approve(swap.address, approvalAmount)
                await approve.wait()
                const Balances1 = await Balances(tokenInput, WETH)
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
                const AmountReceived = Balances2.receipientETHBalance.sub(
                    Balances1.receipientETHBalance
                )
                const AmountReceivedByOwner = Balances2.OwnerTokenBalance.sub(
                    Balances1.OwnerTokenBalance
                )
                assert.equal(AmountReceived.add(gasCost).toString(), (2).toString())
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
                assert.equal(Balances2.contractEthBalance.toString(), 0)
            })
        })
        describe("ETH-Token", () => {
            it("test eth-token ExactInput", async () => {
                const swapType = 1
                tokenOutput = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
                approvalAmount = await swap.approvalAmountRequired(amountIn, swapType, slippage)
                const Balances1 = await Balances(WETH, tokenOutput)
                const tx = await swap.Uniswap(
                    ETH,
                    tokenOutput,
                    3000,
                    amountIn,
                    0,
                    swapType,
                    slippage,
                    {
                        value: approvalAmount,
                    }
                )
                const txreceipt = await tx.wait()
                const { effectiveGasPrice, gasUsed } = txreceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)
                const Balances2 = await Balances(WETH, tokenOutput)
                const AmountSent = Balances1.receipientETHBalance.sub(
                    Balances2.receipientETHBalance
                )
                const AmountReceivedByOwner =
                    Balances2.OwnerTokenBalance - Balances1.OwnerTokenBalance
                assert.equal(AmountSent.toString(), approvalAmount.add(gasCost).toString())
                assert.equal(
                    Balances2.receipientTokenOutBalance > Balances1.receipientTokenOutBalance,
                    true
                )
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
                assert.equal(Balances2.contractEthBalance.toString(), 0)
            })
            it("test eth-token ExactOutput", async () => {
                const swapType = 2
                tokenOutput = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
                approvalAmount = await swap.approvalAmountRequired(amountIn, swapType, slippage)
                const Balances1 = await Balances(WETH, tokenOutput)
                const tx = await swap.Uniswap(
                    ETH,
                    tokenOutput,
                    3000,
                    amountIn,
                    200,
                    swapType,
                    slippage,
                    {
                        value: approvalAmount,
                    }
                )
                const txreceipt = await tx.wait()
                const Balances2 = await Balances(WETH, tokenOutput)
                const AmountReceived = Balances2.receipientTokenOutBalance.sub(
                    Balances1.receipientTokenOutBalance
                )
                const AmountReceivedByOwner =
                    Balances2.OwnerTokenBalance - Balances1.OwnerTokenBalance
                assert.equal(AmountReceived.toString(), (200).toString())
                assert.equal(
                    Balances2.receipientTokenOutBalance > Balances1.receipientTokenOutBalance,
                    true
                )
                assert.equal(AmountReceivedByOwner, amountIn / 100)
                assert.equal(Balances2.contractTokenInBalance.toString(), 0)
                assert.equal(Balances2.contractTokenOutBalance.toString(), 0)
                assert.equal(Balances2.contractEthBalance.toString(), 0)
            })
        })
    })
})
