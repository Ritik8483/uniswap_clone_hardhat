import React, { useEffect, useState } from "react";
import ContractAddress from "../contractsData/CustomDex-address.json";
import ContractAbi from "../contractsData/CustomDex.json";
import ContractTokenAbi from "../contractsData/CustomToken.json";
import { useSDK } from "@metamask/sdk-react";
import { BigNumber, ethers } from "ethers";

const tokenStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "30px",
  flexDirection: "column",
  border: "1px solid black",
  padding: "10px",
};

const TokenOptions = [
  {
    name: "Etherium (ETH)",
    value: "ETH",
  },
  {
    name: "Coin A",
    value: "CoinA",
  },
  {
    name: "Coin B",
    value: "CoinB",
  },
  {
    name: "Coin C",
    value: "CoinC",
  },
];

const Home = () => {
  const [loading, setLoading] = useState(false);
  const [insuffFund, setInsuffFund] = useState(false);
  const [ethValue, setEthValue] = useState("");
  const [balanceInEth, setBalanceInEth] = useState("");
  const [coinsValue, setCoinsValue] = useState("");
  const [coinsBalance, setCoinsBalance] = useState({
    CoinA: "0.0",
    CoinB: "0.0",
    CoinC: "0.0",
  });
  const [firstEthValue, setFirstEthValue] = useState("ETH");
  const [secondEthValue, setSecondEthValue] = useState("CoinA");
  const [increaseAllResp, setIncreaseAllResp] = useState(false);
  const { sdk, connected, account, balance } = useSDK(); //make debug true in index.js

  const connect = async () => {
    try {
      await sdk?.connect();
    } catch (err) {
      console.warn(`failed to connect..`, err);
    }
  };

  const getEthProvider = async () => {
    //getting our contract using ethers
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const fundingContract = new ethers.Contract(
      ContractAddress.address,
      ContractAbi.abi,
      signer
    );
    return fundingContract;
  };

  const getTokenEthProvider = async (address) => {
    //getting our contract using ethers
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const fundingContract = new ethers.Contract(
      address,
      ContractTokenAbi.abi,
      signer
    );
    return fundingContract;
  };

  const handleSubmit = async () => {
    setLoading(true);
    const contractObj = await getEthProvider();
    const weiEthValue = ethers.utils.parseUnits(ethValue, 18);
    if (!ethValue || !firstEthValue || !secondEthValue) return;
    try {
      if (firstEthValue === "ETH" && secondEthValue !== "ETH") {
        const response = await (
          await contractObj.swapEthToToken(secondEthValue, {
            value: weiEthValue,
          })
        ).wait();
        setLoading(false);
        setEthValue("");
        setCoinsValue("");
      } else if (firstEthValue !== "ETH" && secondEthValue === "ETH") {
        const resp = await hasValidAllowance();
        if (resp) {
          const weiEtherValue = ethers.utils
            .parseUnits(ethValue.toString())
            .toString();
          const response = await (
            await contractObj.swapTokenToEth(firstEthValue, weiEtherValue)
          ).wait();
          setLoading(false);
          setEthValue("");
          setIncreaseAllResp(false);
          setCoinsValue("");
        } else {
          alert("Insufficient Fund");
          setInsuffFund(true);
          increaseAllowence();
        }
      } else {
        const resp = await hasValidAllowance();
        if (resp) {
          const weiEtherValue = ethers.utils
            .parseUnits(ethValue.toString())
            .toString();
          const data = await contractObj.swapTokenToToken(
            firstEthValue,
            secondEthValue,
            weiEtherValue
          );
          const finalResp = await data.wait();
          setLoading(false);
          setEthValue("");
          setIncreaseAllResp(false);
          setCoinsValue("");
        } else {
          alert("Insufficient Fund");
          setInsuffFund(true);
          increaseAllowence();
        }
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  const hasValidAllowance = async () => {
    try {
      const contractObj = await getEthProvider();
      const address = await contractObj.getTokenAddress(firstEthValue);
      const tokenContractObj = await getTokenEthProvider(address);
      const data = await tokenContractObj.allowance(
        account,
        ContractAddress.address
      );
      const result = BigNumber.from(data.toString()).gte(
        BigNumber.from(ethers.utils.parseUnits(ethValue.toString()).toString())
      );
      return result;
    } catch (error) {
      return console.log("error", error);
    }
  };

  const increaseAllowence = async () => {
    const contractObj = await getEthProvider();
    const address = await contractObj.getTokenAddress(firstEthValue);
    const tokenContractObj = await getTokenEthProvider(address);
    const data = await (
      await tokenContractObj.approve(
        ContractAddress.address,
        ethers.utils.parseUnits(ethValue.toString()).toString()
      )
    ).wait();
    setIncreaseAllResp(true);
    setLoading(false);
    setInsuffFund(false);
  };

  const handleEthValueChange = (e) => {
    const inputValue = e.target.value;
    setEthValue(e.target.value);
    if (!inputValue) {
      setCoinsValue("");
      return;
    }
    const parseUnits = ethers.utils.parseUnits(inputValue, 18).toString();
    const formattedUnits = ethers.utils.formatUnits(parseUnits, 14).toString(); //coins units
    const formattedEthUnits = ethers.utils
      .formatUnits(parseUnits, 22)
      .toString(); //coins to eth unit
    if (firstEthValue !== "ETH" && secondEthValue !== "ETH") {
      setCoinsValue(e.target.value);
    } else if (firstEthValue !== "ETH" && secondEthValue === "ETH") {
      setCoinsValue(formattedEthUnits);
    } else {
      setCoinsValue(formattedUnits);
    }
  };

  const fetchTokenBalance = async (coinName) => {
    const contractObj = await getEthProvider();
    const balance = await contractObj.getBalance(coinName, account);
    const formatEtherBalance = ethers.utils.formatUnits(balance.toString(), 18);
    return formatEtherBalance;
  };
  useEffect(() => {
    const coinsArr = ["CoinA", "CoinB", "CoinC"];
    if (account) {
      if (balance) {
        const balanceEth = ethers.utils.formatEther(balance);
        setBalanceInEth(balanceEth);
      }
      const arr = coinsArr.map((it) => fetchTokenBalance(it));

      if (arr.length === 3) {
        Promise.all(arr)?.then((resp) => {
          setCoinsBalance({
            CoinA: resp[0],
            CoinB: resp[1],
            CoinC: resp[2],
          });
        });
      }
    }
  }, [account, loading, balance]);

  const handleFirstEthValueChange = (e) => {
    setFirstEthValue(e.target.value);
    setEthValue("");
    setCoinsValue("");
  };

  const handleSecondEthValueChange = (e) => {
    setSecondEthValue(e.target.value);
    setEthValue("");
    setCoinsValue("");
  };

  return (
    <div>
      <button disabled={connected} variant="contained" onClick={connect}>
        Connect
      </button>
      {connected && (
        <div padding="10px 0">{account && `Connected account: ${account}`}</div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "60vh",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", gap: "20px" }}>
          <h4>ETH : {balanceInEth}ETH</h4>
          <h4>CoinA : {coinsBalance.CoinA}</h4>
          <h4>CoinB : {coinsBalance.CoinB}</h4>
          <h4>CoinC : {coinsBalance.CoinC}</h4>
        </div>
        {connected && (
          <div style={tokenStyle}>
            <div>
              <input
                value={ethValue}
                onChange={(e) => handleEthValueChange(e)}
                type="number"
                disabled={!secondEthValue}
                style={{ marginRight: "20px" }}
              />
              <select
                onChange={(e) => handleFirstEthValueChange(e)}
                name="cars"
                id="cars"
              >
                <option disabled value="s">
                  Source Token
                </option>
                {TokenOptions.map((item) => {
                  return secondEthValue !== item.value ? (
                    <option key={item.value} value={item.value}>
                      {item.name}
                    </option>
                  ) : null;
                })}
              </select>
            </div>
            <div>
              <input
                defaultValue={coinsValue}
                disabled
                type="number"
                style={{ marginRight: "20px" }}
              />
              <select
                onChange={(e) => handleSecondEthValueChange(e)}
                name="cars"
                id="cars"
              >
                <option disabled value="d">
                  Destination Token
                </option>
                {TokenOptions.map((item) => {
                  return firstEthValue !== item.value ? (
                    <option key={item.value} value={item.value}>
                      {item.name}
                    </option>
                  ) : null;
                })}
              </select>
            </div>
            <button disabled={loading || !ethValue} onClick={handleSubmit}>
              {insuffFund
                ? "Increasing allowence..."
                : increaseAllResp
                ? "Perform Swap"
                : loading
                ? "Swapping..."
                : "Swap"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
