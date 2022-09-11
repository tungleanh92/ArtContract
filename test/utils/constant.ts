import { utils } from "ethers";

export const ADMIN_ROLE = utils.keccak256(utils.toUtf8Bytes("ADMIN"));
export const MOD_ROLE = utils.keccak256(utils.toUtf8Bytes("MOD"));