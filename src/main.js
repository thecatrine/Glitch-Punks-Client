import * as bootstrap from 'bootstrap';

import $ from 'jquery';
import BN from "bn.js";

import * as spl_token from "@solana/spl-token";

let web3 = solanaWeb3

let NFT_PROGRAM_ID = new web3.PublicKey("4x1tR9EdoduSpJsA6ZZYXprSE9VVd47EW9Sby9dq9qFy");

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

        let initializerAccount = window.solana.publicKey;

        const mintNFTTx = new web3.TransactionInstruction({
            programId: NFT_PROGRAM_ID,
            keys: [
                { pubkey: initializerAccount, isSigner: true, isWritable: false },
                { pubkey: NFT_PROGRAM_ID, isSigner: false, isWritable: true },
                { pubkey: spl_token.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ],
            data: Buffer.from(Uint8Array.of([new BN(1).toArray("le", 0)])),
            //data: Buffer.from(Uint8Array.of(0, ...new BN(expectedAmount).toArray("le", 8)))
        });

        const tx = new web3.Transaction()
            .add(mintNFTTx);

        tx.recentBlockhash = (await connection.getRecentBlockhash('singleGossip')).blockhash;
        tx.feePayer = initializerAccount;

        const signedTransaction = await window.solana.signTransaction(tx);
        const signature = await connection.sendRawTransaction(
            signedTransaction.serialize(),
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