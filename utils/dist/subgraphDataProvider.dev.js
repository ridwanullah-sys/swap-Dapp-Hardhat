"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var fetch2 = require("node-fetch");

var queryWithLinear = "\n      {\n        pool0: pools(\n          first: 1000,\n          where: { swapEnabled: true, totalShares_gt: \"0.000000000001\" },\n          orderBy: totalLiquidity,\n          orderDirection: desc\n        ) {\n          id\n          address\n          poolType\n          swapFee\n          totalShares\n          tokens {\n            address\n            balance\n            decimals\n            weight\n            priceRate\n          }\n          tokensList\n          totalWeight\n          amp\n          expiryTime\n          unitSeconds\n          principalToken\n          baseToken\n          swapEnabled\n          wrappedIndex\n          mainIndex\n          lowerTarget\n          upperTarget\n          sqrtAlpha\n          sqrtBeta\n          root3Alpha\n          alpha\n          beta\n          c\n          s\n          lambda\n          tauAlphaX\n          tauAlphaY\n          tauBetaX\n          tauBetaY\n          u\n          v\n          w\n          z\n          dSq\n        }\n        pool1000: pools(\n          first: 1000,\n          skip: 1000,\n          where: { swapEnabled: true, totalShares_gt: \"0.000000000001\" },\n          orderBy: totalLiquidity,\n          orderDirection: desc\n        ) {\n          id\n          address\n          poolType\n          swapFee\n          totalShares\n          tokens {\n            address\n            balance\n            decimals\n            weight\n            priceRate\n          }\n          tokensList\n          totalWeight\n          amp\n          expiryTime\n          unitSeconds\n          principalToken\n          baseToken\n          swapEnabled\n          wrappedIndex\n          mainIndex\n          lowerTarget\n          upperTarget\n          sqrtAlpha\n          sqrtBeta\n          root3Alpha\n          alpha\n          beta\n          c\n          s\n          lambda\n          tauAlphaX\n          tauAlphaY\n          tauBetaX\n          tauBetaY\n          u\n          v\n          w\n          z\n          dSq\n        }\n      }\n    ";

var getQuery = function getQuery(token1Address, token2Address) {
  return "\n    {\n      pool0: pools(\n        first: 1000,\n        where: { swapEnabled: true, totalShares_gt: \"0.000000000001\", tokensList_contains: [\"".concat(token1Address, "\", \"").concat(token2Address, "\"] },\n        orderBy: totalLiquidity,\n        orderDirection: desc\n      ) {\n        id\n        address\n        poolType\n        swapFee\n        totalShares\n        tokens {\n          address\n          balance\n          decimals\n          weight\n          priceRate\n        }\n        tokensList\n        totalWeight\n        amp\n        expiryTime\n        unitSeconds\n        principalToken\n        baseToken\n        swapEnabled\n        wrappedIndex\n        mainIndex\n        lowerTarget\n        upperTarget\n        sqrtAlpha\n        sqrtBeta\n        root3Alpha\n        alpha\n        beta\n        c\n        s\n        lambda\n        tauAlphaX\n        tauAlphaY\n        tauBetaX\n        tauBetaY\n        u\n        v\n        w\n        z\n        dSq\n      }\n      pool1000: pools(\n        first: 1000,\n        skip: 1000,\n        where: { swapEnabled: true, totalShares_gt: \"0.000000000001\", tokensList_contains: [\"").concat(token1Address, "\", \"").concat(token2Address, "\"]  },\n        orderBy: totalLiquidity,\n        orderDirection: desc\n      ) {\n        id\n        address\n        poolType\n        swapFee\n        totalShares\n        tokens {\n          address\n          balance\n          decimals\n          weight\n          priceRate\n        }\n        tokensList\n        totalWeight\n        amp\n        expiryTime\n        unitSeconds\n        principalToken\n        baseToken\n        swapEnabled\n        wrappedIndex\n        mainIndex\n        lowerTarget\n        upperTarget\n        sqrtAlpha\n        sqrtBeta\n        root3Alpha\n        alpha\n        beta\n        c\n        s\n        lambda\n        tauAlphaX\n        tauAlphaY\n        tauBetaX\n        tauBetaY\n        u\n        v\n        w\n        z\n        dSq\n      }\n    }\n  ");
};

var tokenInAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
var tokenOutAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
var query = getQuery(tokenInAddress, tokenOutAddress);

var SubgraphPoolDataService =
/*#__PURE__*/
function () {
  function SubgraphPoolDataService(config) {
    _classCallCheck(this, SubgraphPoolDataService);

    this.config = config;
  }

  _createClass(SubgraphPoolDataService, [{
    key: "getPools",
    value: function getPools() {
      var response, _ref, data, pools;

      return regeneratorRuntime.async(function getPools$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return regeneratorRuntime.awrap(fetch2(this.config.subgraphUrl, {
                method: "POST",
                headers: {
                  Accept: "application/json",
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  query: query
                })
              }));

            case 2:
              response = _context.sent;
              _context.next = 5;
              return regeneratorRuntime.awrap(response.json());

            case 5:
              _ref = _context.sent;
              data = _ref.data;
              pools = [].concat(_toConsumableArray(data.pool0), _toConsumableArray(data.pool1000));
              pools.forEach(function (pool, index) {
                if (pool.poolType == "HighAmpComposableStable" || pool.poolType == "FX") {
                  pools.splice(index, 1);
                }
              });
              return _context.abrupt("return", pools !== null && pools !== void 0 ? pools : []);

            case 10:
            case "end":
              return _context.stop();
          }
        }
      }, null, this);
    }
  }]);

  return SubgraphPoolDataService;
}();

function getPools(url) {
  var response, _ref2, data, pools;

  return regeneratorRuntime.async(function getPools$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.next = 2;
          return regeneratorRuntime.awrap(fetch2(url, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              query: queryWithLinear
            })
          }));

        case 2:
          response = _context2.sent;
          _context2.next = 5;
          return regeneratorRuntime.awrap(response.json());

        case 5:
          _ref2 = _context2.sent;
          data = _ref2.data;
          pools = [].concat(_toConsumableArray(data.pool0), _toConsumableArray(data.pool1000)); //return pools !== null && pools !== void 0 ? pools : []

          console.log("length before ".concat(pools.length));
          pools.forEach(function (pool, index) {
            if (pool.poolType == "HighAmpComposableStable" || pool.poolType == "FX") {
              pools.splice(index, 1);
            }
          });
          console.log("length after ".concat(pools.length)); // const poolsWithUnknownPoolTypes = pools.find((pool) => {
          //     console.log(pool.poolType)
          // })
          // console.log(poolsWithUnknownPoolTypes)
          // console.log(pools[0].poolType)

        case 11:
        case "end":
          return _context2.stop();
      }
    }
  });
}

module.exports = {
  SubgraphPoolDataService: SubgraphPoolDataService,
  getPools: getPools,
  queryWithLinear: queryWithLinear,
  getQuery: getQuery
};