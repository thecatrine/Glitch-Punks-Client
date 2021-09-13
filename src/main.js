import * as bootstrap from 'bootstrap';

import $ from 'jquery';

let web3 = solanaWeb3

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

    provider.on("connect", () => {
        console.log("connected!");
        console.log("Creator's public key: ", provider.publicKey.toString());
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