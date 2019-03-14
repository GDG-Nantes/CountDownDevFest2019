'use strict'

var MidiPlayer = import('midi-player-js');

// Initialize player and register event handler
var Player = new MidiPlayer.Player(function(event) {
    console.log(event);
});

// Load a MIDI file
Player.loadFile('./assets/songs/Audioslave-cochise_g_g+s/notes.mid');
Player.play();

Player.on('fileLoaded', function() {
    console.log('File Loaded');
    // Do something when file is loaded
});
Player.on('playing', function(currentTick) {
    //console.log('Playing', currentTick);
    // Do something while player is playing
    // (this is repeatedly triggered within the play loop)
});
Player.on('midiEvent', function(event) {
    console.log('midiEvent', event);
    // Do something when a MIDI event is fired.
    // (this is the same as passing a function to MidiPlayer.Player() when instantiating.
});
Player.on('endOfFile', function() {
    console.log('endOfFile');
    // Do something when end of the file has been reached.
});