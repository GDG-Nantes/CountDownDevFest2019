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
            const playTime = Date.now();
            const tickTime = (60000 / (json.bpm*192));
            raf(playTime, tickTime, json);

        })
    });

    function raf(playTime, tickTime, json){
        const nextTick = null;
        let tickIndex = 0;
        while (!nextTick || tickIndex >= json.tickArray.length){
            const tempTick = json.tickArray[tickIndex];
            if (!tempTick.process){
                tempTick.process = true;
                nextTick = tempTick;
            }
            tickIndex++;
        }
        if (nextTick){
            const delta = Date.now() - playTime;
            const tickTimeInMs = nextTick.tick * tickTime;
            if (delta - 4500 > tickTimeInMs && delta - 5000 < tickTimeInMs){
                const newNode = document.createElement('div');
                newNode.id = `tick${nextTick.tick}`;
                newNode.classList.add('node' ,'green');
                document.querySelector('.notes').appendChild(newNode);
                setTimeout(()=>{
                    document.querySelector.removeChild(newNode);
                },5400);

            }
        }
        window.requestAnimationFrame(()=> raf(playTime, tickTime, json));
    }
})