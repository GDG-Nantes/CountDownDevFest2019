'use strict'

import {AudioPlayer} from './audio.js'


document.body.addEventListener('click', _=>{
    fetch('http://localhost:5000/Audioslave-cochise_g_g+s.json')
    .then(res=>res.json())
    .then(json=>{
        const audioPlayer = new AudioPlayer();
        audioPlayer.loadAndPlaySong('./assets/songs/Audioslave-cochise_g_g+s/song.ogg')
        .then(_=>{

            console.log(json);
        })
    });
})