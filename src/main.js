import * as bootstrap from 'bootstrap';

import $ from 'jquery';
import BN from "bn.js";

import * as spl_token from "@solana/spl-token";

let web3 = solanaWeb3

let NFT_PROGRAM_ID = new web3.PublicKey("4x1tR9EdoduSpJsA6ZZYXprSE9VVd47EW9Sby9dq9qFy");

let CASHIER = new web3.PublicKey("7EEtiweAtCmqiEw6UefkEdiPNPSjV5ssgEgv7ynyPon6");

async function connectButton() {
    const getProvider = async () => {
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

    var provider = await getProvider();
    provider.connect();

    provider.on("connect", async () => {
        console.log("connected!");
        console.log("Creator's public key: ", provider.publicKey.toString());

        let initializerAccount = window.solana;

        // Create temp account for fees
        const tempTokenAccount = new web3.Account();
        const createTempTokenAccountIx = web3.SystemProgram.createAccount({
            programId: NFT_PROGRAM_ID, // Owned by the NFT program
            space: 0, //spl_token .AccountLayout.span,
            lamports: 1000,
            //await connection.getMinimumBalanceForRentExemption(AccountLayout.span, 'singleGossip'),
            fromPubkey: initializerAccount.publicKey,
            newAccountPubkey: tempTokenAccount.publicKey
        });
        // Create temp account for mint
        const mintAcct = new web3.Account();
        const mintAcctIx = web3.SystemProgram.createAccount({
            programId: spl_token.TOKEN_PROGRAM_ID, // Owned by the token program
            space: spl_token.MintLayout.span,
            lamports: await connection.getMinimumBalanceForRentExemption(spl_token.MintLayout.span, 'singleGossip'),
            fromPubkey: initializerAccount.publicKey,
            newAccountPubkey: mintAcct.publicKey
        });
        // Create account to hold NFT
        const finalAcct = new web3.Account();
        const finalAcctIx = web3.SystemProgram.createAccount({
            programId: spl_token.TOKEN_PROGRAM_ID, // Owned by the token program
            space: spl_token.AccountLayout.span,
            lamports: await connection.getMinimumBalanceForRentExemption(spl_token.AccountLayout.span, 'singleGossip'),
            fromPubkey: initializerAccount.publicKey,
            newAccountPubkey: finalAcct.publicKey
        });

        console.log("temp account " + tempTokenAccount.publicKey.toString());
        console.log("mint acct " + mintAcct.publicKey.toString())

        //const cashierAccount = await web3.PublicKey.findProgramAddress([Buffer.from("cashier", 'utf8')], NFT_PROGRAM_ID);
        const signingAuthority = await web3.PublicKey.findProgramAddress([Buffer.from("mint_authority", 'utf8')], NFT_PROGRAM_ID);
        //console.log("cashier account " + cashierAccount);

        const mintNFTTx = new web3.TransactionInstruction({
            programId: NFT_PROGRAM_ID,
            keys: [
                { pubkey: initializerAccount.publicKey, isSigner: true, isWritable: false },
                { pubkey: signingAuthority[0], isSigner: false, isWritable: false },
                { pubkey: tempTokenAccount.publicKey, isSigner: true, isWritable: true },
                { pubkey: CASHIER, isSigner: false, isWritable: true },
                { pubkey: spl_token.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: mintAcct.publicKey, isSigner: true, isWritable: true },
                { pubkey: web3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
                { pubkey: finalAcct.publicKey, isSigner: true, isWritable: false },
            ],
            data: Buffer.from(Uint8Array.of([new BN(1).toArray("le", 0)])),
            //data: Buffer.from(Uint8Array.of(0, ...new BN(expectedAmount).toArray("le", 8)))
        });

        const tx = new web3.Transaction()
            .add(createTempTokenAccountIx, mintAcctIx, finalAcctIx, mintNFTTx);

        tx.recentBlockhash = (await connection.getRecentBlockhash('singleGossip')).blockhash;
        tx.feePayer = initializerAccount.publicKey;

        let signedTransaction = await window.solana.signTransaction(tx);
        signedTransaction.partialSign(tempTokenAccount);
        signedTransaction.partialSign(mintAcct);
        signedTransaction.partialSign(finalAcct);

        const serializedTransaction = signedTransaction.serialize()
        const signature = await connection.sendRawTransaction(
            serializedTransaction,
            { skipPreflight: false, preflightCommitment: 'singleGossip' },
        );

    })

    const connection = new web3.Connection(
        web3.clusterApiUrl('devnet'),
        'confirmed',
    );
}

$('#connectButton').on('click', () => {
    console.log("test");
    connectButton();
})