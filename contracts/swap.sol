// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;
pragma abicoder v2;

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IUniswapV2Router.sol";
import "./interfaces/balancers/iVault.sol";
import "./interfaces/balancers/IAsset.sol";
import "hardhat/console.sol";

contract Swap {
    ISwapRouter public immutable swapRouter;
    IUniswapV2Router01 public immutable sushiSwapRouter;
    IVault public immutable balancerVault;
    address public constant Owner = 0x4639155fb94e983a13f76be68845012f7eDCA46f;
    address public constant ETH = 0x0000000000000000000000000000000000000123;
    address public constant Weth = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    constructor(
        ISwapRouter _swapRouter,
        IUniswapV2Router01 _sushiSwapRouter,
        IVault _balancerVault
    ) {
        swapRouter = _swapRouter;
        sushiSwapRouter = _sushiSwapRouter;
        balancerVault = _balancerVault;
    }

    function Uniswap(
        address _tokenInput,
        address _tokenOutput,
        uint24 _fee,
        uint256 amountIn,
        uint256 amountOut,
        uint256 swapType,
        uint256 slippage
    ) public payable {
        address receipient = _tokenOutput == ETH ? address(this) : msg.sender;
        bool unwrapOutput = _tokenOutput == ETH ? true : false;
        bool unwrapInput = _tokenInput == ETH ? true : false;
        _tokenOutput = _tokenOutput == ETH ? Weth : _tokenOutput;

        if (_tokenInput != ETH) {
            require(msg.value == 0, "Require value");
        }
        if (swapType == 1) {
            if (_tokenInput == ETH) {
                _tokenInput = Weth;
                this.wrap{value: msg.value}();
            } else {
                TransferHelper.safeTransferFrom(
                    _tokenInput,
                    msg.sender,
                    address(this),
                    (amountIn + amountIn / 100)
                );
            }

            TransferHelper.safeTransfer(_tokenInput, Owner, amountIn / 100);

            TransferHelper.safeApprove(_tokenInput, address(swapRouter), amountIn);
            uint256 amountOutMinimum = (amountOut * (100 - slippage)) / (100);

            ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
                tokenIn: _tokenInput,
                tokenOut: _tokenOutput,
                fee: _fee,
                recipient: receipient,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            });

            (bool success, bytes memory data) = address(swapRouter).call(
                abi.encodeWithSelector(ISwapRouter.exactInputSingle.selector, params)
            );
            require(success, "exact Input Failed");
            uint256 amountOutput = abi.decode(data, (uint256));
            if (unwrapOutput) {
                this.unWrap(amountOutput, msg.sender);
            }
            if (msg.value > (amountIn + (amountIn / 100))) {
                this.unWrap(msg.value - (amountIn + (amountIn / 100)), msg.sender);
            }
        } else if (swapType == 2) {
            uint256 amountInMaximum = (amountIn * (100 + slippage)) / (100);
            if (_tokenInput == ETH) {
                _tokenInput = Weth;
                this.wrap{value: msg.value}();
            } else {
                TransferHelper.safeTransferFrom(
                    _tokenInput,
                    msg.sender,
                    address(this),
                    (amountInMaximum + amountIn / 100)
                );
            }

            TransferHelper.safeTransfer(_tokenInput, Owner, amountIn / 100);
            TransferHelper.safeApprove(_tokenInput, address(swapRouter), amountInMaximum);

            ISwapRouter.ExactOutputSingleParams memory params = ISwapRouter
                .ExactOutputSingleParams({
                    tokenIn: _tokenInput,
                    tokenOut: _tokenOutput,
                    fee: _fee,
                    recipient: receipient,
                    deadline: block.timestamp,
                    amountOut: amountOut,
                    amountInMaximum: amountInMaximum,
                    sqrtPriceLimitX96: 0
                });

            (bool success, bytes memory data) = address(swapRouter).call(
                abi.encodeWithSelector(ISwapRouter.exactOutputSingle.selector, params)
            );
            require(success, "exact Output Failed");
            uint256 amountUsed = abi.decode(data, (uint256));

            if ((amountUsed < amountInMaximum) && (!unwrapInput)) {
                TransferHelper.safeApprove(_tokenInput, address(swapRouter), 0);
                TransferHelper.safeTransfer(_tokenInput, msg.sender, amountInMaximum - amountUsed);
            }
            if (unwrapOutput) {
                this.unWrap(amountOut, msg.sender);
            }
            if (msg.value > (amountUsed + (amountIn / 100))) {
                this.unWrap(msg.value - (amountUsed + (amountIn / 100)), msg.sender);
            }
        }
    }

    function swapWithCurve(
        address _tokenInput,
        address _tokenOutput,
        uint256 _amountIn,
        uint256 _amountOut,
        uint256 _slippage
    ) public payable {
        if (_tokenInput != ETH) {
            require(msg.value == 0, "Require value to be zero");
        }
        address receipient = _tokenOutput == ETH ? address(this) : msg.sender;
        bool unwrap = _tokenOutput == ETH ? true : false;
        _tokenOutput = _tokenOutput == ETH ? Weth : _tokenOutput;
        if (_tokenInput == ETH) {
            _tokenInput = Weth;
            this.wrap{value: msg.value}();
        } else {
            TransferHelper.safeTransferFrom(
                _tokenInput,
                msg.sender,
                address(this),
                _amountIn + _amountIn / 100
            );
        }
        TransferHelper.safeTransfer(_tokenInput, Owner, _amountIn / 100);

        (, bytes memory data) = 0x0000000022D53366457F9d5E68Ec105046FC4383.call(
            abi.encodeWithSignature("get_address(uint256)", 2)
        );

        address exchangeAddress = abi.decode(data, (address));
        TransferHelper.safeApprove(_tokenInput, exchangeAddress, _amountIn);
        uint256 amountOutMinimum = (_amountOut * (100 - _slippage)) / (100);
        (bool Exsuccess, ) = exchangeAddress.call(
            abi.encodeWithSignature(
                "exchange_with_best_rate(address,address,uint256,uint256,address)",
                _tokenInput,
                _tokenOutput,
                _amountIn,
                amountOutMinimum,
                receipient
            )
        );
        require(Exsuccess, "Curve Swap Failed");
        if (unwrap) {
            this.unWrap(_amountOut, msg.sender);
        }
    }

    function swapWithSushi(
        address _tokenInput,
        address _tokenOutput,
        uint256 _amountIn,
        uint256 _amountOut,
        uint256 _slippage,
        uint256 _swapType
    ) public payable {
        address[] memory path = new address[](2);
        path[0] = _tokenInput == ETH ? Weth : _tokenInput;
        path[1] = _tokenOutput == ETH ? Weth : _tokenOutput;
        if (_tokenInput != ETH) {
            require(msg.value == 0, "Require value to be zero");
        }
        if (_swapType == 1) {
            if (_tokenInput == ETH) {
                (bool success, ) = payable(Owner).call{value: _amountIn / 100}("");
                require(success, "Owner Transfer failed");
            } else {
                TransferHelper.safeTransferFrom(
                    _tokenInput,
                    msg.sender,
                    address(this),
                    (_amountIn + _amountIn / 100)
                );
                TransferHelper.safeTransfer(_tokenInput, Owner, _amountIn / 100);
            }
            TransferHelper.safeApprove(_tokenInput, address(sushiSwapRouter), _amountIn);
            uint256 amountOutMinimum = (_amountOut * (100 - _slippage)) / (100);

            if (_tokenOutput != ETH && _tokenInput != ETH) {
                (bool success, ) = address(sushiSwapRouter).call(
                    abi.encodeWithSelector(
                        sushiSwapRouter.swapExactTokensForTokens.selector,
                        _amountIn,
                        amountOutMinimum,
                        path,
                        msg.sender,
                        block.timestamp
                    )
                );
                require(success, "SUHSI1 FAILED");
            } else if (_tokenOutput == ETH && _tokenInput != ETH) {
                (bool success, ) = address(sushiSwapRouter).call(
                    abi.encodeWithSelector(
                        sushiSwapRouter.swapExactTokensForETH.selector,
                        _amountIn,
                        amountOutMinimum,
                        path,
                        msg.sender,
                        block.timestamp
                    )
                );
                require(success, "SUHSI2 FAILED");
            } else if ((_tokenOutput != ETH && _tokenInput == ETH)) {
                (bool success, ) = address(sushiSwapRouter).call{value: _amountIn}(
                    abi.encodeWithSelector(
                        sushiSwapRouter.swapExactETHForTokens.selector,
                        amountOutMinimum,
                        path,
                        msg.sender,
                        block.timestamp
                    )
                );
                require(success, "SUHSI3 FAILED");
            }
            if (msg.value > (_amountIn + (_amountIn / 100))) {
                (bool Success, ) = payable(msg.sender).call{
                    value: msg.value - (_amountIn + (_amountIn / 100))
                }("");
                require(Success, "Withdraw Failed");
            }
        } else if (_swapType == 2) {
            uint256 amountInMaximum = (_amountIn * (100 + _slippage)) / (100);
            if (_tokenInput == ETH) {
                (bool success, ) = payable(Owner).call{value: _amountIn / 100}("");
                require(success, "Owner Transfer failed");
            } else {
                TransferHelper.safeTransferFrom(
                    _tokenInput,
                    msg.sender,
                    address(this),
                    (amountInMaximum + _amountIn / 100)
                );
                TransferHelper.safeTransfer(_tokenInput, Owner, _amountIn / 100);
            }

            TransferHelper.safeApprove(_tokenInput, address(sushiSwapRouter), amountInMaximum);
            uint256 amountUse;
            if (_tokenOutput != ETH && _tokenInput != ETH) {
                (bool success, bytes memory data) = address(sushiSwapRouter).call(
                    abi.encodeWithSelector(
                        sushiSwapRouter.swapTokensForExactTokens.selector,
                        _amountOut,
                        amountInMaximum,
                        path,
                        msg.sender,
                        block.timestamp
                    )
                );
                require(success, "SUHSI FAILED");
                uint256[] memory amountUsed = abi.decode(data, (uint256[]));
                amountUse = amountUsed[0];

                console.log(success);
            } else if (_tokenOutput == ETH && _tokenInput != ETH) {
                (bool success, bytes memory data) = address(sushiSwapRouter).call(
                    abi.encodeWithSelector(
                        sushiSwapRouter.swapTokensForExactETH.selector,
                        _amountOut,
                        amountInMaximum,
                        path,
                        msg.sender,
                        block.timestamp
                    )
                );
                require(success, "SUHSI FAILED");
                uint256[] memory amountUsed = abi.decode(data, (uint256[]));
                amountUse = amountUsed[0];
            } else if ((_tokenOutput != ETH && _tokenInput == ETH)) {
                (bool success, bytes memory data) = address(sushiSwapRouter).call{
                    value: amountInMaximum
                }(
                    abi.encodeWithSelector(
                        sushiSwapRouter.swapETHForExactTokens.selector,
                        _amountOut,
                        path,
                        msg.sender,
                        block.timestamp
                    )
                );
                require(success, "SUHSI3 FAILED");
                uint256[] memory amountUsed = abi.decode(data, (uint256[]));
                amountUse = amountUsed[0];
            }
            if (amountUse < amountInMaximum && _tokenInput != ETH) {
                TransferHelper.safeApprove(_tokenInput, address(sushiSwapRouter), 0);
                TransferHelper.safeTransfer(_tokenInput, msg.sender, amountInMaximum - amountUse);
            }

            if (msg.value > (amountUse + (_amountIn / 100))) {
                (bool Success, ) = payable(msg.sender).call{
                    value: msg.value - (amountUse + (_amountIn / 100))
                }("");
                require(Success, "Withdraw Failed");
            }
        }
    }

    function swapWithBalancer(
        address _tokenInput,
        address _tokenOutput,
        IVault.BatchSwapStep[] memory swaps,
        IAsset[] memory assets,
        int256[] memory limits,
        int256 _slippage,
        uint256 _swapType
    ) public payable {
        if (_tokenInput != ETH) {
            require(msg.value == 0, "Require value to be zero");
        }
        address receipient = _tokenOutput == ETH ? address(this) : msg.sender;
        IVault.FundManagement memory funds = IVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(receipient),
            toInternalBalance: false
        });
        uint256 indexOfAmountOut;
        if (_swapType == 1) {
            if (_tokenInput == ETH) {
                this.wrap{value: msg.value}();
            } else {
                TransferHelper.safeTransferFrom(
                    address(assets[0]),
                    msg.sender,
                    address(this),
                    uint256(limits[0] + (limits[0] / 100))
                );
            }
            TransferHelper.safeTransfer(address(assets[0]), Owner, uint256((limits[0] / 100)));
            TransferHelper.safeApprove(
                address(assets[0]),
                address(balancerVault),
                uint256(limits[0])
            );
            for (uint j = 0; j < 5; j++) {
                if (limits[j] < 0) {
                    indexOfAmountOut = j;
                    break;
                }
            }
            int256 Limit = limits[0];
            int256 amountOutMinimum = (limits[indexOfAmountOut] * (100 - _slippage)) / (100);
            limits[indexOfAmountOut] = amountOutMinimum;

            (bool success, bytes memory data) = address(balancerVault).call(
                abi.encodeWithSelector(
                    IVault.batchSwap.selector,
                    IVault.SwapKind.GIVEN_IN,
                    swaps,
                    assets,
                    funds,
                    limits,
                    block.timestamp
                )
            );
            require(success, "BAL ERROR");
            int256[] memory amount = abi.decode(data, (int256[]));
            int256 coverted = amount[indexOfAmountOut] * -1;
            if (_tokenOutput == ETH) {
                this.unWrap(uint256(coverted), msg.sender);
            }
            if (int256(msg.value) > ((Limit) + (Limit / 100))) {
                this.unWrap(uint256(int256(msg.value) - ((Limit) + (Limit / 100))), msg.sender);
            }
        } else if (_swapType == 2) {
            int256 amountInMaximum = (limits[0] * (100 + _slippage)) / (100);
            if (_tokenInput == ETH) {
                this.wrap{value: msg.value}();
            } else {
                TransferHelper.safeTransferFrom(
                    address(assets[0]),
                    msg.sender,
                    address(this),
                    uint256(amountInMaximum + (limits[0] / 100))
                );
            }
            TransferHelper.safeTransfer(address(assets[0]), Owner, uint256((limits[0] / 100)));
            TransferHelper.safeApprove(
                address(assets[0]),
                address(balancerVault),
                uint256(amountInMaximum)
            );
            int256 Limit = limits[0];
            limits[0] = amountInMaximum;

            (bool success, bytes memory data) = address(balancerVault).call(
                abi.encodeWithSelector(
                    IVault.batchSwap.selector,
                    IVault.SwapKind.GIVEN_OUT,
                    swaps,
                    assets,
                    funds,
                    limits,
                    block.timestamp
                )
            );
            require(success, "BAL ERROR");

            int256[] memory amount = abi.decode(data, (int256[]));
            if ((uint256(amountInMaximum) > uint256(amount[0])) && (_tokenInput != ETH)) {
                TransferHelper.safeApprove(address(assets[0]), address(balancerVault), 0);
                TransferHelper.safeTransfer(
                    address(assets[0]),
                    msg.sender,
                    uint256(amountInMaximum) - uint256(amount[0])
                );
            }
            if (int256(msg.value) > ((amount[0]) + (Limit / 100))) {
                this.unWrap(uint256(int256(msg.value) - ((amount[0]) + (Limit / 100))), msg.sender);
            }
            for (uint j = 0; j < 5; j++) {
                if (limits[j] < 0) {
                    indexOfAmountOut = j;
                    break;
                }
            }
            int256 coverted = amount[indexOfAmountOut] * -1;
            if (_tokenOutput == ETH) {
                this.unWrap(uint256(coverted), msg.sender);
            }
        }
    }

    function wrap() public payable {
        require(msg.sender.balance >= msg.value, "Insufficient ETH Amount");
        (bool success, ) = Weth.call{value: msg.value}(abi.encodeWithSignature("deposit()"));
        require(success, "Error Depositing");
    }

    function unWrap(uint256 _amount, address receipient) public {
        require(IERC20(Weth).balanceOf(msg.sender) >= _amount, "Insufficient Weth Amount");
        TransferHelper.safeTransferFrom(Weth, msg.sender, address(this), _amount);
        (bool success, ) = Weth.call(abi.encodeWithSignature("withdraw(uint256)", _amount));
        require(success, "Error withdrawing");
        (bool Success, ) = payable(receipient).call{value: _amount}("");
        require(Success, "Withdraw Failed");
    }

    function approvalAmountRequired(
        uint256 amountIn,
        uint256 swapType,
        uint256 slippage
    ) external pure returns (uint256) {
        if (swapType == 2) {
            uint256 amountInMaximum = (amountIn * (100 + slippage)) / (100);
            return amountInMaximum + (amountIn / 100);
        } else {
            return amountIn + (amountIn / 100);
        }
    }

    receive() external payable {}
}
