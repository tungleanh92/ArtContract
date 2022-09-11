import Web3 from "web3";
import { soliditySha3 } from "web3-utils";
import { ethers } from "ethers";
import { promisify } from "util";
import * as IERC20JSON from "../../artifacts/contracts/interfaces/IERC20.sol/IERC20.json";
import { IERC20 } from "../../typechain";

export const sleep = promisify(setTimeout);

export const balanceOf = async (
  deployer: any,
  user: string,
  token: string,
): Promise<any> => {
  const contract = new ethers.Contract(
    token,
    IERC20JSON.abi,
    deployer,
  ) as IERC20;
  const balance = await contract.balanceOf(user);
  return Web3.utils.fromWei(balance.toString());
};

export const getSignature = (address: string, amount: string): string => {
  const web3 = new Web3();
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY || "";

  const message = soliditySha3(address, amount);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const result = web3.eth.accounts.sign(message!, privateKey);
  return result.signature;
};

