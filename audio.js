'use strict'

export class AudioPlayer {
    constructor() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContext();
            this.buffer = undefined;
            this.bufferGuitar = undefined;
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
                this.context.decodeAudioData(request.response, (buffer) => {
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
    _loadSoundGuitar(url, bufferToUse) {
        return new Promise((resolve, reject) => {
            const request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.responseType = 'arraybuffer';

            // Decode asynchronously
            request.onload = () => {
                this.context.decodeAudioData(request.response, (buffer) => {
                    this.bufferGuitar = buffer;
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

    loadAndPlaySong(songPath, mute) {
        return this._loadSound(`${songPath}/song.ogg`)
            .then(_=> this._loadSoundGuitar(`${songPath}/guitar.ogg`))
            .then(_ => {
                const source = this.context.createBufferSource(); // creates a sound source
                const sourceGuitar = this.context.createBufferSource(); // creates a sound source
                source.buffer = this.buffer; // tell the source which sound to play
                sourceGuitar.buffer = this.bufferGuitar; // tell the source which sound to play
                source.connect(this.context.destination); // connect the source to the context's destination (the speakers)
                sourceGuitar.connect(this.context.destination); // connect the source to the context's destination (the speakers)
                if (!mute){
                    source.start(0); // play the source now
                    sourceGuitar.start(0); // play the source now
                }
                return {source, sourceGuitar};
            })
            .then(({source, sourceGuitar}) => {
                this.currentSource = source;
            });
    }


    stop() {
        if (this.currentSource && this.currentSource.stop) {
            this.currentSource.stop(0);
        }
    }

    time(){
        return this.context.currentTime;
    }


}