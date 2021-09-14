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
//new web3.PublicKey("6mjLX2PqmAbQuv9zMChBqg4bv2UpADbWEhLNmUHdBiRt");

let CASHIER = new web3.PublicKey("AuK2wzBzM5ZToXdoAigrKQHFVzZfavbzPo82NU2cawnj");
let CAT = new web3.PublicKey("7keeykNopXVgtLK97nCbarhaetE2351gZ8q7nzBnffJr");

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

        //        const metadataAcct = await web3.PublicKey.findProgramAddress([
        let seeds = [
            Buffer.from("metadata", 'utf8'),
            TOKEN_METADATA_ID.toBuffer(),
            mintAcct.publicKey.toBuffer(),
        ];
        const metadataAcct = await web3.PublicKey.findProgramAddress(seeds, TOKEN_METADATA_ID);
        const MAX_METADATA_LEN = 679; // TODO don't just rip this number
        const metadataLamports = await connection.getMinimumBalanceForRentExemption(MAX_METADATA_LEN, 'singleGossip');
        const fundMetadataIx = web3.SystemProgram.transfer({
            fromPubkey: initializerAccount.publicKey,
            toPubkey: metadataAcct[0],
            lamports: metadataLamports,
        })

        //const escrowAccount = new web3.Account();
        //const createEscrowAccountIx = web3.SystemProgram.createAccount({
        //    space: 9,
        //    lamports: await connection.getMinimumBalanceForRentExemption(9, 'singleGossip'),
        //    fromPubkey: initializerAccount.publicKey,
        //    newAccountPubkey: escrowAccount.publicKey,
        //    programId: NFT_PROGRAM_ID
        //});

        console.log("temp account " + tempTokenAccount.publicKey.toString());
        console.log("mint acct " + mintAcct.publicKey.toString())
        console.log("metadata address " + metadataAcct[0].toString())

        //const cashierAccount = await web3.PublicKey.findProgramAddress([Buffer.from("cashier", 'utf8')], NFT_PROGRAM_ID);
        const signingAuthority = await web3.PublicKey.findProgramAddress([Buffer.from("mint_authority", 'utf8')], NFT_PROGRAM_ID);

        // const dataStorage = await web3.PublicKey.findProgramAddress([Buffer.from("state", 'utf8')], NFT_PROGRAM_ID);

        //console.log("cashier account " + escrowAccount.publicKey.toString());

        const mintNFTTx = new web3.TransactionInstruction({
            programId: NFT_PROGRAM_ID,
            keys: [
                { pubkey: initializerAccount.publicKey, isSigner: true, isWritable: false },
                { pubkey: signingAuthority[0], isSigner: false, isWritable: false },
                { pubkey: tempTokenAccount.publicKey, isSigner: true, isWritable: true },
                { pubkey: CAT, isSigner: false, isWritable: true },
                { pubkey: CASHIER, isSigner: false, isWritable: true },
                { pubkey: spl_token.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: mintAcct.publicKey, isSigner: true, isWritable: true },
                { pubkey: web3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
                { pubkey: finalAcct.publicKey, isSigner: true, isWritable: false },
                { pubkey: TOKEN_METADATA_ID, isSigner: false, isWritable: false },
                { pubkey: metadataAcct[0], isSigner: false, isWritable: true },
                { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
                //{ pubkey: dataStorage[0], isSigner: false, isWritable: false },
            ],
            data: Buffer.from(Uint8Array.of([new BN(1).toArray("le", 0)])),
            //data: Buffer.from(Uint8Array.of(0, ...new BN(expectedAmount).toArray("le", 8)))
        });

        const tx = new web3.Transaction()
            .add(createTempTokenAccountIx, mintAcctIx, finalAcctIx, fundMetadataIx, mintNFTTx);

        tx.recentBlockhash = (await connection.getRecentBlockhash('singleGossip')).blockhash;
        tx.feePayer = initializerAccount.publicKey;

        let signedTransaction = await window.solana.signTransaction(tx);
        signedTransaction.partialSign(tempTokenAccount);
        signedTransaction.partialSign(mintAcct);
        signedTransaction.partialSign(finalAcct);
        //signedTransaction.partialSign(escrowAccount);

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