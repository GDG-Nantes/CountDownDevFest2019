'use strict'

const MidiPlayer = require('midi-player-js');
const fs = require('fs');

const fileToParse = `Guns_'N_Roses_-_Sweet_Child_'O_Mine`;
//const fileToParse = `Audioslave-cochise_g_g+s`;
//const fileToParse = `3.5_Paint_It,_Black_–_The_Rolling_Stones`;
//const fileToParse = `Queen_-_killer_queen_g_g+s`;

// Initialize player and register event handler
const Player = new MidiPlayer.Player(function(event) {
    //console.log(event);
});

const objectSong = {
    title : fileToParse,
    tickArray : [],
    tickMap: {},
    notes: {},
    bpm: 120
};

function processMidiEvent(event){
    //console.log('midiEvent', event);
    if (event.name === 'Note on'){
        let tickEvent = objectSong.tickMap[event.tick];
        if (!tickEvent){
            tickEvent = {
                tick : event.tick,
                tracks: [],
                notes: []
            };
            objectSong.tickMap[event.tick] = tickEvent;
            objectSong.tickArray.push(tickEvent)
        }
        if (event.noteNumber>=60 && event.noteNumber< 70){
            tickEvent.tracks.push(`1`);
        }else if (event.noteNumber>=70 && event.noteNumber< 80){
            tickEvent.tracks.push(`2`);
        }else if (event.noteNumber>=80 && event.noteNumber< 90){
            tickEvent.tracks.push(`3`);
        }else if (event.noteNumber>=90 && event.noteNumber< 100){
            tickEvent.tracks.push(`4`);
        }else if (event.noteNumber>=100 && event.noteNumber< 110){
            tickEvent.tracks.push(`5`);
        }
        tickEvent.notes.push(`${event.noteNumber}`);
        if (!objectSong.notes[`${event.noteNumber}`]){
            objectSong.notes[`${event.noteNumber}`] = {
                ticks: [],
                lastEvent : tickEvent
            };
        }
        objectSong.notes[`${event.noteNumber}`].ticks.push(tickEvent);
        objectSong.notes[`${event.noteNumber}`].lastEvent = tickEvent;
    }else if (event.name === 'Note off'){
        let tickEvent = objectSong.notes[`${event.noteNumber}`].lastEvent;
        tickEvent.delta = event.tick - tickEvent.tick;
    }else if (event.name === 'Time Signature'){
        objectSong.bpm = Player.tempo;
    }
    // Do something when a MIDI event is fired.
    // (this is the same as passing a function to MidiPlayer.Player() when instantiating.
}

function finalizeSong(){
    objectSong.tickArray = objectSong.tickArray.sort((tickA, tickB) => tickA.tick - tickB.tick)
    let data = JSON.stringify(objectSong, null, 2);
    // Do something when end of the file has been reached.
    fs.writeFileSync(`./${fileToParse}.json`, data);
}

Player.on('fileLoaded', function() {
    console.log('File Loaded', Player.tempo);
    Player.events.forEach(trackEvents => {
        trackEvents.forEach(event => processMidiEvent(event));
    });

    finalizeSong();
});
//Player.on('playing', function(currentTick) {});
//Player.on('midiEvent', processMidiEvent);
//Player.on('endOfFile', function() {});



// Load a MIDI file
Player.loadFile(`./assets/songs/${fileToParse}/notes.mid`);
//Player.play();