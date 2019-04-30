"use strict";

import { AudioPlayer } from "./audio.js";

const fileToPlay = `Guns_'N_Roses_-_Sweet_Child_'O_Mine`;
//const fileToPlay = `3.5_Paint_It,_Black_–_The_Rolling_Stones`;
//const fileToPlay = `Queen_-_killer_queen_g_g+s`;
//const fileToPlay = `The_Police_-_Message_in_a_Bottle`;

document.body.addEventListener("click", _ => {
  const objectSong = {
    title: fileToPlay,
    tickArray: [],
    tickMap: {},
    notes: {},
    tempos: {},
    timeSignatures: {},
    bpm: 120,
    ppq: 192
  };
  Midi.fromUrl(
    `http://localhost:5000/assets/songs/${fileToPlay}/notes.mid`
  ).then(midi => {
    midi.tracks.forEach(track => {
      if (track.name === "PART GUITAR") {
        track.notes.forEach(note => {
          let tickEvent = objectSong.tickMap[note.ticks];
          if (!tickEvent) {
            tickEvent = {
              tick: note.time * 1000,
              tracks: [],
              notes: [],
              tempo: 120, //this.getTempo(event.tick),
              timeSignature: 24 //this.getTimeSignature(event.tick)
            };
            objectSong.tickMap[note.ticks] = tickEvent;
            objectSong.tickArray.push(tickEvent);
          }
          if (note.midi >= 60 && note.midi < 70) {
            tickEvent.tracks.push(`1`);
          } else if (note.midi >= 70 && note.midi < 80) {
            tickEvent.tracks.push(`2`);
          } else if (note.midi >= 80 && note.midi < 90) {
            tickEvent.tracks.push(`3`);
          } else if (note.midi >= 90 && note.midi < 100) {
            tickEvent.tracks.push(`4`);
          } else if (note.midi >= 100 && note.midi < 110) {
            tickEvent.tracks.push(`5`);
          }
        });

        const json = objectSong;
        const audioPlayer = new AudioPlayer();
        audioPlayer.loadAndPlaySong(`./assets/songs/${fileToPlay}`).then(_ => {
            console.log(json);
            const playTime = Date.now();
            const tickTime = 60000 / (json.bpm * json.ppq);
            raf(playTime, tickTime, json);
        });
      }
    });
  });

  /*fetch(`http://localhost:5000/${fileToPlay}.json`)
    .then(res => res.json())
    .then(json => {
      const audioPlayer = new AudioPlayer();
      audioPlayer.loadAndPlaySong(`./assets/songs/${fileToPlay}`).then(_ => {
        console.log(json);
        const playTime = Date.now();
        const tickTime = 60000 / (json.bpm * json.ppq);
        raf(playTime, tickTime, json);
      });
    });*/

  function raf(playTime, tickTime, json) {
    let nextTick = null;
    let tickIndex = 0;
    while (!nextTick || tickIndex >= json.tickArray.length) {
      const tempTick = json.tickArray[tickIndex];
      if (!tempTick.process) {
        nextTick = tempTick;
      }
      tickIndex++;
    }
    if (nextTick) {
      const delta = Date.now() - playTime;
      const tickTimeInMs = calculateTiming(
        nextTick.tick,
        json.bpm,
        json.ppq,
        json.timeSignature
      );

      if (tickTimeInMs < 5000) {
        //console.log('<5000', playTime, delta, tickTimeInMs,);
        addNote(nextTick, 5400);
      } else if (delta + 5000 > tickTimeInMs) {
        //console.log('Delta 5000', playTime, delta, tickTimeInMs);
        addNote(nextTick, 5400);
      }
    }
    window.requestAnimationFrame(() => raf(playTime, tickTime, json));
  }

  function addNote(nextTick, killTimeout) {
    nextTick.process = true;
    nextTick.tracks.forEach(track => {
      const newNode = document.createElement("div");
      newNode.id = `tick${nextTick.tick}`;
      let colorNote = "green";
      switch (track) {
        case "1":
          colorNote = "green";
          break;
        case "2":
          colorNote = "red";
          break;
        case "3":
          colorNote = "yellow";
          break;
        case "4":
          colorNote = "blue";
          break;
        case "5":
          colorNote = "orange";
          break;
      }
      newNode.classList.add("note", colorNote);
      document.querySelector(".notes").appendChild(newNode);
      setTimeout(() => {
        newNode.remove();
      }, killTimeout);
    });
  }

  function calculateTiming(tickIndex, tempo, division, signature) {
    /*const baseTemp = 60 * 1000 * 1000; //60 000 000 microseconds
    const tempoInMicroSeconds = baseTemp / tempo;
    const divisionInMicroSeconds = division * 1000;
    const tickInMicroSeconds =
      (tempoInMicroSeconds / (division * 1000)) * signature;
    //const tickTiming = (tickIndex * tickInMicroSeconds);
    //const tickTiming = (baseTemp / 1000) / (tempo * division);*/
    const tickTiming = tickIndex;
    return tickTiming;
  }
});


function canvas(){
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    console.log(canvas.width, canvas.height);
    rafCanvas(canvas, context);
}

function rafCanvas(canvas, context){

    const widthCircle = canvas.width / 5;
    var x = 100,
        y = 150,
        // Radii of the white glow.
        innerRadius = 5,
        outerRadius = 15,
        // Radius of the entire circle.
        radiusWidth = widthCircle / 2,
        radiusHeight = 10;

    var gradient = context.createRadialGradient(x, y, innerRadius, x, y, outerRadius);
    gradient.addColorStop(0, 'black');
    gradient.addColorStop(1, 'green');

    //context.arc(x, y, radius, 0, 2 * Math.PI);
    context.ellipse(x, y, radiusWidth, radiusHeight, 0 * Math.PI/180, 0, 2 * Math.PI);

    context.fillStyle = gradient;
    context.fill();

    context.beginPath();
    context.ellipse(x, y, radiusWidth, radiusHeight, 0 * Math.PI/180, 0, 2 * Math.PI);
    //context.arc(100, 100, radius, 0, 2 * Math.PI);
    context.stroke();
    window.requestAnimationFrame(()=> rafCanvas(canvas, context))
}

setTimeout(() => {
    
    canvas();
}, 500);