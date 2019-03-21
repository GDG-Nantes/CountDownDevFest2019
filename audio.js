'use strict'

export class AudioPlayer {
    constructor() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContext();
        } catch (e) {
            console.log("No WebAPI dectect");
        }
    }

    _loadSound(url, bufferToUse) {
        return new Promise((resolve, reject) => {
            const request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.responseType = 'arraybuffer';

            // Decode asynchronously
            request.onload = () => {
                this.context.decodeAudioData(request.response, function (buffer) {
                    this.buffer = buffer;
                    resolve();
                }, (e) => {
                    reject();
                    console.log('Error decoding file', e);
                });
            }
            request.send();
        })
    }




    /*****************************
     ******************************
     * Apis exposed
     ******************************
     ******************************
     */

    loadAndPlaySong(songPath) {
        return this._loadSound(songPath)
            .then(_ => {
                const source = this.context.createBufferSource(); // creates a sound source
                source.buffer = this.buffer; // tell the source which sound to play
                source.connect(this.context.destination); // connect the source to the context's destination (the speakers)
                source.start(0); // play the source now
                return source;
            })
            .then((source) => {
                this.currentSource = source;
            });
    }


    stop() {
        if (this.currentSource && this.currentSource.stop) {
            this.currentSource.stop(0);
        }
    }


}