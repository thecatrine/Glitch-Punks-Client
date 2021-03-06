import * as bootstrap from 'bootstrap';

import $ from 'jquery';
import BN from "bn.js";

import * as spl_token from "@solana/spl-token";
import * as BufferLayout from 'buffer-layout';

import bs58 from 'bs58';
import { sha256 } from 'crypto-hash';

// Both devnet
let NFT_PROGRAM_ID = new solanaWeb3.PublicKey("4x1tR9EdoduSpJsA6ZZYXprSE9VVd47EW9Sby9dq9qFy");
let TOKEN_METADATA_ID = new solanaWeb3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
//new solanaWeb3.PublicKey("6mjLX2PqmAbQuv9zMChBqg4bv2UpADbWEhLNmUHdBiRt");

let CASHIER = new solanaWeb3.PublicKey("BkHFN4TvyWgDx3UsaJJoUbnAi4uKAniBvvwQUPPe2UDo");
let CAT = new solanaWeb3.PublicKey("7keeykNopXVgtLK97nCbarhaetE2351gZ8q7nzBnffJr");

let FEE_LAMPORTS = 100_000_000;

let TOTAL_NUMBER = 1000;

let wallet_initialized = false;
let connection = null;
let provider = null;



async function getHowManySold() {
    let info = await connection.getAccountInfo(CASHIER, "singleGossip");
    let number = info.data.readBigInt64LE([1]) - BigInt(1);
    console.log(number);

    $('#howMany').text(number + "/" + TOTAL_NUMBER);
}

async function getDisplayTokens() {
    $('#gallery-loading-text').text('Loading...');
    console.log(provider);
    let accounts = await connection.getTokenAccountsByOwner(
        provider._publicKey,
        { programId: spl_token.TOKEN_PROGRAM_ID, }
    );

    if (accounts.value.length == 0) {
        $('#gallery-loading-text').text('Mint or purchase a Glitch Punk to view it here.');
        return;
    }

    await Promise.all(accounts.value.map(async aaa => {
	try {
            let token_0 = aaa.account.data;

            let data = Buffer.from(token_0);
            token_0 = spl_token.AccountLayout.decode(data);

            console.log(token_0);

            const metadataAccountId = await solanaWeb3.PublicKey.findProgramAddress(
		[
                    Buffer.from("metadata", 'utf8'),
                    TOKEN_METADATA_ID.toBuffer(),
                    token_0.mint,
		], TOKEN_METADATA_ID
            );
            console.log(metadataAccountId[0].toString());

            let a = await fetch("https://api.all.art/v1/solana/" + metadataAccountId[0].toString());
            let b = await a.json();

            displayNFT(b);
	} catch (error) {
	    console.error(error);
	}
    }));
    $('#gallery-loading-text').addClass('d-none');
    renderNFTs();
}

async function connectButton(which) {
    const getProviderPhantom = async () => {
        if ("solana" in window) {
            const provider = window.solana;
            if (provider.isPhantom) {
                console.log("Is Phantom installed?  ", provider.isPhantom);
                return provider;
            }
        } else {
            window.open("https://www.phantom.app/", "_blank");
        }
    };

    const getProviderSolflare = async () => {
        if ("solflare" in window) {
            const provider = window.solflare;

            return provider;
        }
    }

    if (!wallet_initialized) {
        console.log("initializing " + which);
        if (which == 'phantom') {
            provider = await getProviderPhantom();
        } else if (which == 'solflare') {
            provider = await getProviderSolflare();
        }
        provider.connect();

        provider.on("connect", async () => {
            wallet_initialized = true;
            await getDisplayTokens();
        })

        $('#connectButtonSolflare').prop('disabled', true);
        $('#connectButtonPhantom').prop('disabled', true);
        $('#mintButton').prop('disabled', false);
    } else {
        console.log('already initialized wallet');
    }
}

$('#connectButtonPhantom').on('click', () => {
    console.log("connect");
    connectButton('phantom');
});

$('#connectButtonSolflare').on('click', () => {
    console.log("connect");
    connectButton('solflare');
});

async function connectRPC() {
    connection = new solanaWeb3.Connection(
	"https://solana-api.projectserum.com",
//        solanaWeb3.clusterApiUrl('mainnet-beta'),
        'confirmed',
    );

    console.log("Connected to rpc");

    await getHowManySold();
}

window.setUpCashier = async () => {
    const signingAuthority = await solanaWeb3.PublicKey.findProgramAddress([Buffer.from("mint_authority", 'utf8')], NFT_PROGRAM_ID);

    let buf = Buffer.from("lolno", "base64");
    const cashierAccount = new solanaWeb3.Account(buf);
    const createCashierAccountIx = solanaWeb3.SystemProgram.createAccount({
        space: 9,
        lamports: await connection.getMinimumBalanceForRentExemption(9, 'singleGossip'),
        fromPubkey: provider.publicKey,
        newAccountPubkey: cashierAccount.publicKey,
        programId: NFT_PROGRAM_ID
    });

    const tx = new solanaWeb3.Transaction().add(createCashierAccountIx);
    tx.recentBlockhash = (await connection.getRecentBlockhash('singleGossip')).blockhash;
    tx.feePayer = provider.publicKey;

    let signedTransaction = await provider.signTransaction(tx);
    signedTransaction.partialSign(cashierAccount);

    const serializedTransaction = signedTransaction.serialize()
    const signature = await connection.sendRawTransaction(
        serializedTransaction,
        { skipPreflight: false, preflightCommitment: 'singleGossip' },
    );

    console.log(cashierAccount.secretKey.toString('base64'));
    console.log(cashierAccount.publicKey.toString());
}

async function mintNFT() {
    const signingAuthority = await solanaWeb3.PublicKey.findProgramAddress([Buffer.from("mint_authority", 'utf8')], NFT_PROGRAM_ID);
    if (!wallet_initialized) {
        console.log("Error, wallet not initialized");
        return
    }
    console.log("connected!");
    console.log("Creator's public key: ", provider.publicKey.toString());

    let initializerAccount = provider;

    // Create temp account for fees
    const tempTokenAccount = new solanaWeb3.Account();
    const createTempTokenAccountIx = solanaWeb3.SystemProgram.createAccount({
        programId: NFT_PROGRAM_ID, // Owned by the NFT program
        space: 0, //spl_token .AccountLayout.span,
        lamports: FEE_LAMPORTS,
        //await connection.getMinimumBalanceForRentExemption(AccountLayout.span, 'singleGossip'),
        fromPubkey: initializerAccount.publicKey,
        newAccountPubkey: tempTokenAccount.publicKey
    });
    // Create temp account for mint
    const mintAcct = new solanaWeb3.Account();
    const mintAcctIx = solanaWeb3.SystemProgram.createAccount({
        programId: spl_token.TOKEN_PROGRAM_ID, // Owned by the token program
        space: spl_token.MintLayout.span,
        lamports: await connection.getMinimumBalanceForRentExemption(spl_token.MintLayout.span, 'singleGossip'),
        fromPubkey: initializerAccount.publicKey,
        newAccountPubkey: mintAcct.publicKey
    });
    // Create account to hold NFT
    const finalAcct = new solanaWeb3.Account();
    const finalAcctIx = solanaWeb3.SystemProgram.createAccount({
        programId: spl_token.TOKEN_PROGRAM_ID, // Owned by the token program
        space: spl_token.AccountLayout.span,
        lamports: await connection.getMinimumBalanceForRentExemption(spl_token.AccountLayout.span, 'singleGossip'),
        fromPubkey: initializerAccount.publicKey,
        newAccountPubkey: finalAcct.publicKey
    });

    //        const metadataAcct = await solanaWeb3.PublicKey.findProgramAddress([
    let seeds = [
        Buffer.from("metadata", 'utf8'),
        TOKEN_METADATA_ID.toBuffer(),
        mintAcct.publicKey.toBuffer(),
    ];
    const metadataAcct = await solanaWeb3.PublicKey.findProgramAddress(seeds, TOKEN_METADATA_ID);
    const MAX_METADATA_LEN = 679; // TODO don't just rip this number
    const metadataLamports = await connection.getMinimumBalanceForRentExemption(MAX_METADATA_LEN, 'singleGossip');
    const fundMetadataIx = solanaWeb3.SystemProgram.transfer({
        fromPubkey: initializerAccount.publicKey,
        toPubkey: metadataAcct[0],
        lamports: metadataLamports,
    })

    console.log("temp account " + tempTokenAccount.publicKey.toString());
    console.log("mint acct " + mintAcct.publicKey.toString())
    console.log("metadata address " + metadataAcct[0].toString())

    const mintNFTTx = new solanaWeb3.TransactionInstruction({
        programId: NFT_PROGRAM_ID,
        keys: [
            { pubkey: initializerAccount.publicKey, isSigner: true, isWritable: false },
            { pubkey: signingAuthority[0], isSigner: false, isWritable: false },
            { pubkey: tempTokenAccount.publicKey, isSigner: true, isWritable: true },
            { pubkey: CAT, isSigner: false, isWritable: true },
            { pubkey: CASHIER, isSigner: false, isWritable: true },
            { pubkey: spl_token.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: mintAcct.publicKey, isSigner: true, isWritable: true },
            { pubkey: solanaWeb3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
            { pubkey: finalAcct.publicKey, isSigner: true, isWritable: false },
            { pubkey: TOKEN_METADATA_ID, isSigner: false, isWritable: false },
            { pubkey: metadataAcct[0], isSigner: false, isWritable: true },
            { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
            //{ pubkey: dataStorage[0], isSigner: false, isWritable: false },
        ],
        data: Buffer.from(Uint8Array.of([new BN(1).toArray("le", 0)])),
        //data: Buffer.from(Uint8Array.of(0, ...new BN(expectedAmount).toArray("le", 8)))
    });

    const tx = new solanaWeb3.Transaction()
        .add(createTempTokenAccountIx, mintAcctIx, finalAcctIx, fundMetadataIx, mintNFTTx);

    tx.recentBlockhash = (await connection.getRecentBlockhash('singleGossip')).blockhash;
    tx.feePayer = initializerAccount.publicKey;

    let signedTransaction = await provider.signTransaction(tx);
    signedTransaction.partialSign(tempTokenAccount);
    signedTransaction.partialSign(mintAcct);
    signedTransaction.partialSign(finalAcct);

    try {
        const serializedTransaction = signedTransaction.serialize()
        const signature = await connection.sendRawTransaction(
            serializedTransaction,
            { skipPreflight: false, preflightCommitment: 'singleGossip' },
        );

        console.log("Success!");

        await getHowManySold();
        await getDisplayTokens();

        displayToast("<a href='https://solscan.io/tx/" + signature + "'>View Transaction</a>");
    } catch {
        displayToast("There's been an error.")
    }
}

let visibleToasts = [];

function displayToast(msg) {
    visibleToasts.push(msg);

    let string = "";
    visibleToasts.forEach((x) => {
        string = string + msg + "<br />";
    });

    $('#alert-div').html(string); // TODO fix wrapping being wonky
}

window.displayToast = displayToast;

let visibleNFTs = []
let visibleNFTDivs = []

function displayNFT(nft) {
    let mint = nft.Mint;
    let url = nft.Preview_URL;
    let name = nft.Title;

    let attributes = [];
    if (nft.Properties && nft.Properties.attributes) {
        nft.Properties.attributes.forEach((attr) => {
            attributes.push(attr.trait_type + ": " + attr.value + "<br />");
        })
    }
    if (!visibleNFTs.includes(mint)) {
        let string = "\
        <div class='card' style='width: 18rem;'> \
        <img class='nft p-2' crossorigin='anonymous' src='" + url + "'></img>\
        <div class='card-body p-2'><h3>"+ name + "</h3></div>\
        <div class='card-attributes p-2'>";
        attributes.forEach((attr_str) => {
            string = string + attr_str;
        })
        string = string + "</div></div >";
        visibleNFTDivs.push(string);
        visibleNFTs.push(mint);
    }
}

function renderNFTs() {
    $('#gallery-div').html('');
    visibleNFTDivs.forEach((item) => {
        $('#gallery-div').append(item);
    });
}


$('#mintButton').on('click', () => {
    console.log('mint');
    mintNFT();
});
$('#mintButton').prop('disabled', true);

$('#gallery-nav-item').on('click', async () => {
    $('#gallery-nav-item').addClass('active');
    $('#mint-nav-item').removeClass('active');

    $('#mint-div').addClass('d-none');
    $('#gallery-div').removeClass('d-none');

    if (wallet_initialized) {
        await getDisplayTokens();
    }
});

$('#mint-nav-item').on('click', () => {
    $('#gallery-nav-item').removeClass('active');
    $('#mint-nav-item').addClass('active');

    $('#mint-div').removeClass('d-none');
    $('#gallery-div').addClass('d-none');
});

$('#howMany').text("?/" + TOTAL_NUMBER);

$(window).on('load', async () => {
    await connectRPC();
})
