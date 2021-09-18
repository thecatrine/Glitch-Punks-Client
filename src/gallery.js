import * as bootstrap from 'bootstrap';

import $ from 'jquery';
import BN from "bn.js";

import * as spl_token from "@solana/spl-token";

import bs58 from 'bs58';
import { sha256 } from 'crypto-hash';

let web3 = solanaWeb3

// Both devnet
let NFT_PROGRAM_ID = new web3.PublicKey("4x1tR9EdoduSpJsA6ZZYXprSE9VVd47EW9Sby9dq9qFy");
let TOKEN_METADATA_ID = new web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

async function connectRPC() {
    connection = new web3.Connection(
        web3.clusterApiUrl('mainnet-beta'),
        'confirmed',
    );

    console.log("Connected to rpc");

    await getHowManySold();
}

async function loadSomeNFTS() {
    let info = await connection.getAccountInfo(spl_token.TOKEN_PROGRAM_ID, "singleGossip");
    //let number = info.data.readBigInt64LE([1]) - BigInt(1);
    console.log(info);
}

$('#gallery').text("Load some images here from javascript");

$(window).on('load', async () => {
    await connectRPC();
})