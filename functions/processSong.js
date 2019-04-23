'use strict'

const MidiPlayer = require('midi-player-js');
const fs = require('fs');


// Initialize player and register event handler
const Player = new MidiPlayer.Player(function(event) {
    //console.log(event);
});

const objectSong = {
    title : 'Audioslave-cochise_g_g+s',
    tickArray : [],
    tickMap: {},
    notes: {},
    bpm: 120
};

// Load a MIDI file
Player.loadFile('./assets/songs/Audioslave-cochise_g_g+s/notes.mid');
Player.play();

Player.on('fileLoaded', function() {
    console.log('File Loaded');
    //objectSong.title = 'Audioslave-cochise_g_g+s';
    //objectSong.tickArray = [];
    //objectSong.tickMap = {};
    //objectSong.notes = {};
    // Do something when file is loaded
});
Player.on('playing', function(currentTick) {
    //console.log('Playing', currentTick);
    // Do something while player is playing
    // (this is repeatedly triggered within the play loop)
});
Player.on('midiEvent', function(event) {
    //console.log('midiEvent', event);
    if (event.name === 'Note on'){
        let tickEvent = objectSong.tickMap[event.tick];
        if (!tickEvent){
            tickEvent = {
                tick : event.tick,
                notes: []
            };
            objectSong.tickMap[event.tick] = tickEvent;
            objectSong.tickArray.push(tickEvent)
        }
        tickEvent.notes.push(event.noteNumber);
        if (!objectSong.notes[event.noteNumber]){
            objectSong.notes[event.noteNumber] = {
                ticks: [],
                lastEvent : tickEvent
            };
        }
        objectSong.notes[event.noteNumber].ticks.push(tickEvent);
        objectSong.notes[event.noteNumber].lastEvent = tickEvent;
    }else if (event.name === 'Note off'){
        let tickEvent = objectSong.notes[event.noteNumber].lastEvent;
        tickEvent.delta = event.tick - tickEvent.tick;
    }
    // Do something when a MIDI event is fired.
    // (this is the same as passing a function to MidiPlayer.Player() when instantiating.
});
Player.on('endOfFile', function() {
    console.log('endOfFile');
    // Do something when end of the file has been reached.
    let data = JSON.stringify(objectSong, null, 2);
    fs.writeFileSync('./Audioslave-cochise_g_g+s.json', data);
});