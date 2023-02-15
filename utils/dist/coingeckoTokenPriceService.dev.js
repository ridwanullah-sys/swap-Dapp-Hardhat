"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var _require = require("isomorphic-fetch"),
    fetch = _require.fetch;

var fetch2 = require("node-fetch");

var CoingeckoTokenPriceService =
/*#__PURE__*/
function () {
  function CoingeckoTokenPriceService(chainId) {
    _classCallCheck(this, CoingeckoTokenPriceService);

    this.chainId = chainId;
  }

  _createClass(CoingeckoTokenPriceService, [{
    key: "getNativeAssetPriceInToken",
    value: function getNativeAssetPriceInToken(tokenAddress) {
      var ethPerToken;
      return regeneratorRuntime.async(function getNativeAssetPriceInToken$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return regeneratorRuntime.awrap(this.getTokenPriceInNativeAsset(tokenAddress));

            case 2:
              ethPerToken = _context.sent;
              return _context.abrupt("return", "".concat(1 / parseFloat(ethPerToken)));

            case 4:
            case "end":
              return _context.stop();
          }
        }
      }, null, this);
    }
    /**
     * @dev Assumes that the native asset has 18 decimals
     * @param tokenAddress - the address of the token contract
     * @returns the price of 1 ETH in terms of the token base units
     */

  }, {
    key: "getTokenPriceInNativeAsset",
    value: function getTokenPriceInNativeAsset(tokenAddress) {
      var endpoint, response, data;
      return regeneratorRuntime.async(function getTokenPriceInNativeAsset$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              endpoint = "https://api.coingecko.com/api/v3/simple/token_price/".concat(this.platformId, "?contract_addresses=").concat(tokenAddress, "&vs_currencies=").concat(this.nativeAssetId);
              _context2.next = 3;
              return regeneratorRuntime.awrap(fetch2(endpoint, {
                headers: {
                  Accept: "application/json",
                  "Content-Type": "application/json"
                }
              }));

            case 3:
              response = _context2.sent;
              _context2.next = 6;
              return regeneratorRuntime.awrap(response.json());

            case 6:
              data = _context2.sent;

              if (!(data[tokenAddress.toLowerCase()][this.nativeAssetId] === undefined)) {
                _context2.next = 9;
                break;
              }

              throw Error("No price returned from Coingecko");

            case 9:
              return _context2.abrupt("return", data[tokenAddress.toLowerCase()][this.nativeAssetId]);

            case 10:
            case "end":
              return _context2.stop();
          }
        }
      }, null, this);
    }
  }, {
    key: "platformId",
    get: function get() {
      switch (this.chainId) {
        case 1:
          return "ethereum";

        case 42:
          return "ethereum";

        case 137:
          return "polygon-pos";

        case 42161:
          return "arbitrum-one";
      }

      return "2";
    }
  }, {
    key: "nativeAssetId",
    get: function get() {
      switch (this.chainId) {
        case 1:
          return "eth";

        case 42:
          return "eth";

        case 137:
          return "";

        case 42161:
          return "eth";
      }

      return "";
    }
  }]);

  return CoingeckoTokenPriceService;
}();

module.exports = {
  CoingeckoTokenPriceService: CoingeckoTokenPriceService
};