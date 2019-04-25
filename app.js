'use strict'

import {AudioPlayer} from './audio.js'

const fileToPlay = `Guns_'N_Roses_-_Sweet_Child_'O_Mine`;
//const fileToPlay = `3.5_Paint_It,_Black_–_The_Rolling_Stones.json`;
//const fileToPlay = `Queen_-_killer_queen_g_g+s.json`;

document.body.addEventListener('click', _=>{
    fetch(`http://localhost:5000/${fileToPlay}.json`)
    .then(res=>res.json())
    .then(json=>{
        const audioPlayer = new AudioPlayer();
        audioPlayer.loadAndPlaySong(`./assets/songs/${fileToPlay}`)
        .then(_=>{

            console.log(json);
            const playTime = Date.now();
            const tickTime = (60000 / (json.bpm*json.ppq));
            raf(playTime, tickTime, json);

        })
    });

    function raf(playTime, tickTime, json){
        let nextTick = null;
        let tickIndex = 0;
        while (!nextTick || tickIndex >= json.tickArray.length){
            const tempTick = json.tickArray[tickIndex];
            if (!tempTick.process){
                nextTick = tempTick;
            }
            tickIndex++;
        }
        if (nextTick){
            const delta = Date.now() - playTime;
            const tickTimeInMs = nextTick.tick * tickTime;

            if (delta - 5000 < tickTimeInMs){
                nextTick.process = true;
                nextTick.tracks.forEach(track=> {
                    const newNode = document.createElement('div');
                    newNode.id = `tick${nextTick.tick}`;
                    let colorNote = 'green';
                    switch(track){
                        case '1':
                        colorNote = 'green';
                        break;
                        case '2':
                        colorNote = 'red';
                        break;
                        case '3':
                        colorNote = 'yellow';
                        break;
                        case '4':
                        colorNote = 'blue';
                        break;
                        case '5':
                        colorNote = 'orange';
                        break;
                    }
                    newNode.classList.add('note' , colorNote);
                    document.querySelector('.notes').appendChild(newNode);
                    setTimeout(()=>{
                        newNode.remove();
                    },5400);
                });

            }
        }
        window.requestAnimationFrame(()=> raf(playTime, tickTime, json));
    }
})