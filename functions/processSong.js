'use strict'

const MidiPlayer = require('midi-player-js');
const fs = require('fs');

//const fileToParse = `Guns_'N_Roses_-_Sweet_Child_'O_Mine`;
//const fileToParse = `Audioslave-cochise_g_g+s`;
//const fileToParse = `3.5_Paint_It,_Black_–_The_Rolling_Stones`;
//const fileToParse = `Queen_-_killer_queen_g_g+s`;
//const fileToParse = `The_Police_-_Message_in_a_Bottle`;
const arrayFileToParse = [
    `Guns_'N_Roses_-_Sweet_Child_'O_Mine`,
    `3.5_Paint_It,_Black_–_The_Rolling_Stones`,
    `Queen_-_killer_queen_g_g+s`,
    `The_Police_-_Message_in_a_Bottle`
];


class ParserMidi {
    constructor(fileToParse) {
        this.fileToParse = fileToParse;
        this.objectSong = {
            title: fileToParse,
            tickArray: [],
            tickMap: {},
            notes: {},
            tempos: {},
            timeSignatures: {},
            bpm: 120,
            ppq: 192
        };
        this.midiPlayer = new MidiPlayer.Player();

        this.initListeners();
        this.midiPlayer.loadFile(`./assets/songs/${this.fileToParse}/notes.mid`);
    }

    initListeners() {
        this.midiPlayer.on('fileLoaded', () => {
            console.log('File Loaded', this.midiPlayer.tempo);
            this.objectSong.bpm = this.midiPlayer.tempo;
            this.objectSong.ppq = this.midiPlayer.division;
            this.midiPlayer.events.forEach(trackEvent => {
                const firstEventTrack = trackEvent[0];
                if (firstEventTrack.name === "Sequence/Track Name" &&
                    (firstEventTrack.string === "PART GUITAR" ||
                        firstEventTrack.track === 1)) {
                    trackEvent.forEach(event => this.processMidiEvent(event));
                }
            })

            this.finalizeSong();
        });

    }


    getTempo(tick) {
        let tempoToUse = 120;
        Object.keys(this.objectSong.tempos).forEach(tickKey => {
            if (tick >= tickKey) {
                tempoToUse = this.objectSong.tempos[tickKey];
            }
        })
        return tempoToUse;
    }

    getTimeSignature(tick) {
        let signatureToUse = '4/4';
        Object.keys(this.objectSong.timeSignatures).forEach(tickKey => {
            if (tick >= tickKey) {
                signatureToUse = this.objectSong.timeSignatures[tickKey];
            }
        })
        return signatureToUse;
    }

    processMidiEvent(event) {
        //console.log('midiEvent', event);
        if (event.name === 'Note on') {
            let tickEvent = this.objectSong.tickMap[event.tick];
            if (!tickEvent) {
                tickEvent = {
                    tick: event.tick,
                    tracks: [],
                    notes: [],
                    tempo: this.getTempo(event.tick),
                    timeSignature: this.getTimeSignature(event.tick)
                };
                this.objectSong.tickMap[event.tick] = tickEvent;
                this.objectSong.tickArray.push(tickEvent)
            }
            if (event.noteNumber >= 60 && event.noteNumber < 70) {
                tickEvent.tracks.push(`1`);
            } else if (event.noteNumber >= 70 && event.noteNumber < 80) {
                tickEvent.tracks.push(`2`);
            } else if (event.noteNumber >= 80 && event.noteNumber < 90) {
                tickEvent.tracks.push(`3`);
            } else if (event.noteNumber >= 90 && event.noteNumber < 100) {
                tickEvent.tracks.push(`4`);
            } else if (event.noteNumber >= 100 && event.noteNumber < 110) {
                tickEvent.tracks.push(`5`);
            }
            tickEvent.notes.push(`${event.noteNumber}`);
            if (!this.objectSong.notes[`${event.noteNumber}`]) {
                this.objectSong.notes[`${event.noteNumber}`] = {
                    ticks: [],
                    lastEvent: tickEvent
                };
            }
            this.objectSong.notes[`${event.noteNumber}`].ticks.push(tickEvent);
            this.objectSong.notes[`${event.noteNumber}`].lastEvent = tickEvent;
        } else if (event.name === 'Note off') {
            let tickEvent = this.objectSong.notes[`${event.noteNumber}`].lastEvent;
            tickEvent.delta = event.tick - tickEvent.tick;
        } else if (event.name === 'Set Tempo') {
            this.objectSong.tempos[event.tick] = event.data;
        } else if (event.name === 'Time Signature') {
            // Nb Midi Clocks in clic = 3 byte of data
            if (!this.objectSong.timeSignature) {
                this.objectSong.timeSignature = event.data[2];
            }
            this.objectSong.timeSignatures[event.tick] = event.data[2];
        }
        // Do something when a MIDI event is fired.
        // (this is the same as passing a function to MidiPlayer.Player() when instantiating.
    }

    finalizeSong() {
        this.objectSong.tickArray = this.objectSong.tickArray.sort((tickA, tickB) => tickA.tick - tickB.tick)
        let data = JSON.stringify(this.objectSong, null, 2);
        // Do something when end of the file has been reached.
        fs.writeFileSync(`./${this.fileToParse}.json`, data);
    }

}

// Initialize player and register event handler
//const Player = new MidiPlayer.Player(function (event) {
    //console.log(event);
//});

//Player.on('playing', function(currentTick) {});
//Player.on('midiEvent', processMidiEvent);
//Player.on('endOfFile', function() {});

arrayFileToParse.forEach(fileToParse=>new ParserMidi(fileToParse));
// Load a MIDI file
//Player.loadFile(`./assets/songs/${fileToParse}/notes.mid`);
//Player.play();