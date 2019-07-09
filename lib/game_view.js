import * as THREE from '../vendor/three';
import { songNotes, beatsPerMeasure } from './song';
import ViewControls from './view_controls';
import Light from './light';
import GameNotes from './game_notes';

class GameView {
  constructor(renderer, camera, scene, key, musicDelay) {
    this.renderer = renderer;
    this.camera = camera;
    this.scene = scene;
    this.key = key;
    this.musicDelay = musicDelay;

    this.note = {};

    this.zStartPoint = -500;
    this.zEndPoint = 0;
    this.yStartPoint = 50;
    this.yEndPoint = -75;
    this.xPos = [-50, -25, 0, 25, 50];

    this.xRotation = -Math.atan(
      (this.zEndPoint - this.zStartPoint) / (this.yStartPoint - this.yEndPoint)
    );

    this.spheres = [];
    this.cylinders = [];
    this.beatLines = [];

    this.t = 0;
    this.measures = [0];

    // Addition
    this.startTime = 0;
    this.objectSong = undefined;

  }

  setup() {
    this.setWindowResizer();
    this.backgroundSetup();
    this.addFretBoard();
    this.setNoteAttributes();
    this.controls = new ViewControls(this.camera, this.renderer);
    this.gameLoop();
  }

  setWindowResizer() {
    let width,
      height;

    window.addEventListener( 'resize', () => {
      width = window.innerWidth;
      height = window.innerHeight;
      this.renderer.setSize( width, height);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    });
  }

  backgroundSetup() {
    let backgroundGeometry = new THREE.BoxGeometry( 2000, 1000, 1000 );
    let backgroundMaterials = [ "", "", "", "", "",
      new THREE.MeshPhongMaterial( {
        map: new THREE.TextureLoader().load( 'photos/stage.jpeg' ),
        side: THREE.DoubleSide
      } )
    ];

    let backgroundMaterial = new THREE.MeshFaceMaterial( backgroundMaterials );

    this.light = new Light(this.scene);
    this.light.addLights();
    // this.light.addMovingLights();

    let background = new THREE.Mesh( backgroundGeometry, backgroundMaterial );
    this.scene.add( background );

    // LINES (STRINGS)
    this.lineMaterial = new THREE.LineBasicMaterial({ color: 0xFFFFFF });
    for (let i = 0; i < 5; i++) {
      let lineGeometry = new THREE.Geometry();
      lineGeometry.vertices.push(new THREE.Vector3(
        this.xPos[i], this.yStartPoint, this.zStartPoint));
      lineGeometry.vertices.push(new THREE.Vector3(
        this.xPos[i], this.yEndPoint, this.zEndPoint));
      let line = new THREE.Line(lineGeometry, this.lineMaterial);
      this.scene.add(line);
    }

  }

  addFretBoard() {
    let width = this.xPos[4] - this.xPos[0] + 50;
    let height = Math.sqrt(
      Math.pow((this.zEndPoint - this.zStartPoint), 2)
        + Math.pow((this.yEndPoint - this.yStartPoint), 2)
    );
    let boardGeometry = new THREE.PlaneGeometry( width, height );
    let boardMaterial = new THREE.MeshPhongMaterial( {
      color: 0x000000,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: .6
    } );
    let board = new THREE.Mesh( boardGeometry, boardMaterial );
    board.rotateX(this.xRotation);
    board.position.set(0, -15, -250);
    this.scene.add( board ) ;
  }

  setNoteAttributes() {
    this.note.vel = .75;

    this.note.yVel = this.note.vel * (this.yEndPoint - this.yStartPoint) / 100;
    this.note.zVel = this.note.vel * (this.zEndPoint - this.zStartPoint) / 100;

    this.note.radius = 7.5;

    this.note.colors = [];
    this.note.colors[0] = 0x4C7048; // Green
    this.note.colors[1] = 0xDA3A3C; // Red
    this.note.colors[2] = 0xffeb3b; // Yellow
    this.note.colors[3] = 0x3f51b5; // Blue
    this.note.colors[4] = 0xff5722; // Orange
    this.note.colors[5] = 0xffffff; // White - selected

    this.note.geometry = new THREE.SphereGeometry(this.note.radius);

    this.note.materials = [];
    this.note.colors.forEach( (color, idx) => {
    this.note.materials[idx] =
       new THREE.MeshPhongMaterial( { color: this.note.colors[idx] } );
    });

    const circleGeometry = new THREE.CircleGeometry(this.note.radius);
    const circles = [];
    for (let i = 0; i < 5; i ++) {
      circles[i] = new THREE.Mesh(circleGeometry, this.note.materials[i]);
    }

    circles.forEach((circle, idx) => {
      circle.position.set(
      this.xPos[idx],
      this.yEndPoint,
      this.zEndPoint
      );
      circle.rotateX(-.2);

      // LIGHT UP CIRCLE WHEN KEY IS PRESSED
      setInterval( () => {
        if (this.key.isDownVisually(this.key.pos[idx + 1])) {
           circle.material = this.note.materials[5];
         } else {
           circle.material = this.note.materials[idx];
         }
      }, 100);

      this.scene.add(circle);
    });
  }

  addMovingNotes(noteInterval, objectSong, currentTime) {
    let noteMaterial;
    this.startTime = currentTime;
    this.objectSong = objectSong;

    /*this.gameNotes = new GameNotes(
      noteInterval, this.musicDelay, this.key
    );*/


    //this.generateNotesNew(objectSong);
  }

  generateNotes(noteInterval){
    let noteMaterial;
    songNotes.forEach((songNote, idx) => {

      noteMaterial = this.note.materials[songNote.pos - 1];

      this.spheres[idx] = new THREE.Mesh(this.note.geometry, noteMaterial);

      let time = noteInterval * (
        ((songNote.m - 1) * beatsPerMeasure) + songNote.t
      );
      let lag = 0;

      if (songNote.m > 94) {
        lag = 12.5 * songNote.m;
        time += lag;
      } else if (songNote.m > 79) {
        lag = 10 * songNote.m;
        time += lag;
      } else if (songNote.m > 71) {
        lag = 7.5 * songNote.m;
        time += lag;
      }
      else if (songNote.m > 48) {
        lag = 5 * songNote.m;
        time += lag;
      }

      // CREATE HOLDS
      if (songNote.hold) {
        let cylinderMaterial = this.note.materials[songNote.pos - 1];
        let cylinderGeometry = new THREE.CylinderGeometry(
          3.5, 3.5, (songNote.hold * this.note.vel * 30)
        );
        this.cylinders[idx] = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
        this.cylinders[idx].rotateX(this.xRotation);
      }

      this.addMovingBeatLine(songNote.m, noteInterval, lag);

      // POSITION & ADD TO SCENE NOTES & HOLDS & BeatLines
      setTimeout( () => {
        if (this.cylinders[idx]) {
          let hold = songNote.hold * 3;
          this.cylinders[idx].hold = hold;
          this.cylinders[idx].position.set(
            this.xPos[songNote.pos - 1],
            this.yStartPoint - hold * this.note.yVel,
            this.zStartPoint - hold * this.note.zVel
          );
          this.scene.add(this.cylinders[idx]);
        }
        this.scene.add(this.spheres[idx]);
        this.spheres[idx].position.set(
          this.xPos[songNote.pos - 1],
          (this.yStartPoint),
          (this.zStartPoint));
        }, time
      );
      this.gameNotes.setNoteCheck(songNote, time);
    });
  }

  generateNotesNew(objectSong){
    let noteMaterial;
    let index = 0;
    objectSong.tickArray.forEach(tickEvent =>{
      tickEvent.tracks.forEach(track => {
        index++;
        let idx = index + 0;
        noteMaterial = this.note.materials[+track - 1];

        this.spheres[idx] = new THREE.Mesh(this.note.geometry, noteMaterial);

        let time = tickEvent.tick;
        let lag = 0;

        /*if (songNote.m > 94) {
          lag = 12.5 * songNote.m;
          time += lag;
        } else if (songNote.m > 79) {
          lag = 10 * songNote.m;
          time += lag;
        } else if (songNote.m > 71) {
          lag = 7.5 * songNote.m;
          time += lag;
        }
        else if (songNote.m > 48) {
          lag = 5 * songNote.m;
          time += lag;
        }*/

      // CREATE HOLDS
      /*if (songNote.hold) {
        let cylinderMaterial = this.note.materials[songNote.pos - 1];
        let cylinderGeometry = new THREE.CylinderGeometry(
          3.5, 3.5, (songNote.hold * this.note.vel * 30)
        );
        this.cylinders[idx] = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
        this.cylinders[idx].rotateX(this.xRotation);
      }*/

      //this.addMovingBeatLine(songNote.m, noteInterval, lag);

      // POSITION & ADD TO SCENE NOTES & HOLDS & BeatLines
      setTimeout( () => {
        /*if (this.cylinders[idx]) {
          let hold = songNote.hold * 3;
          this.cylinders[idx].hold = hold;
          this.cylinders[idx].position.set(
            this.xPos[songNote.pos - 1],
            this.yStartPoint - hold * this.note.yVel,
            this.zStartPoint - hold * this.note.zVel
          );
          this.scene.add(this.cylinders[idx]);
        }*/
        this.scene.add(this.spheres[idx]);
        this.spheres[idx].position.set(
          this.xPos[+track - 1],
          (this.yStartPoint),
          (this.zStartPoint));
        }, time
      );
      //this.gameNotes.setNoteCheckNew(+track, time);


      });
    })
  }

  addMovingBeatLine(measure, noteInterval, lag) {
    if (this.measures[this.measures.length - 1] < measure) {
      this.measures.push(measure);
      let onBeatLineMaterial =
        new THREE.MeshBasicMaterial( { color: 0x999999});
      let offBeatLineMaterial =
        new THREE.MeshBasicMaterial( { color: 0x3b3b3b});
      let beatLineGeometry = new THREE.CylinderGeometry(
        .25, .25, (this.xPos[4] - this.xPos[0] + 50)
      );
      for (let t = 1; t < 9; t++ ) {
        let time = lag + noteInterval * (
          ((measure - 1) * beatsPerMeasure) + t
        );
        let idx = measure * beatsPerMeasure + t;
        if (t % 2 === 0) {
          this.beatLines[idx] =
            new THREE.Mesh(beatLineGeometry, offBeatLineMaterial);
        } else {
          this.beatLines[idx] =
            new THREE.Mesh(beatLineGeometry, onBeatLineMaterial);
        }

        setTimeout( () => {
          this.scene.add(this.beatLines[idx]);
          this.beatLines[idx].position.set(
            0, this.yStartPoint, this.zStartPoint
          );
          this.beatLines[idx].rotateZ(Math.PI / 2);
        }, time);
      }
    }
  }

  processTicks(){
    if (!this.objectSong) return;

    let nextTick = null;
    let tickIndex = 0;
    const delta = Date.now() - this.startTime;
    while (!nextTick && tickIndex < this.objectSong.tickArray.length) {
      const tempTick = this.objectSong.tickArray[tickIndex];
      tickIndex++;
      if (tempTick.process) continue;
      if (tempTick.tick < delta){
        tempTick.process = true;
        continue;
      }
      nextTick = tempTick;
    }
    if (nextTick) {
      const tickTimeInMs = nextTick.tick;

      if (tickTimeInMs < 10000) {
        //console.log('<5000', this.startTime, delta, tickTimeInMs);
        nextTick.process = true;
        this.addNote(nextTick, delta);
        if (nextTick.duration ){
          this.addCylinder(nextTick, delta);
        }
      } else if (delta + 10000 > tickTimeInMs) {
        nextTick.process = true;
        //console.log('Delta 5000', this.startTime, delta, tickTimeInMs);
        this.addNote(nextTick, delta);
        if (nextTick.duration ){
          this.addCylinder(nextTick, delta);
        }
      }
    }
  }

  addCylinder(tick, delta){
    tick.tracks.forEach(track => {
      const cylinderMaterial = this.note.materials[+track - 1];
      if (tick.duration ){
        let cylinderGeometry = new THREE.CylinderGeometry(
          //3.5, 3.5, (tick.hold * this.note.vel * 30)
          3.5, 3.5, (tick.duration / 10)
        );
        const cylinderMesh = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
        cylinderMesh.rotateX(this.xRotation);
        cylinderMesh.moveTime = tick.tick - delta;
        cylinderMesh.ellapseTime = Date.now();
        cylinderMesh.position.set(
          this.xPos[+track - 1],
          (this.yStartPoint - 100),
          (this.zStartPoint));
        this.cylinders.push(cylinderMesh);
        this.scene.add(cylinderMesh);
      }

      /*if (songNote.hold) {
        let cylinderMaterial = this.note.materials[songNote.pos - 1];
        let cylinderGeometry = new THREE.CylinderGeometry(
          3.5, 3.5, (songNote.hold * this.note.vel * 30)
        );
        this.cylinders[idx] = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
        this.cylinders[idx].rotateX(this.xRotation);
      }*/

      //this.addMovingBeatLine(songNote.m, noteInterval, lag);

      // POSITION & ADD TO SCENE NOTES & HOLDS & BeatLines
        /*if (this.cylinders[idx]) {
          let hold = songNote.hold * 3;
          this.cylinders[idx].hold = hold;
          this.cylinders[idx].position.set(
            this.xPos[songNote.pos - 1],
            this.yStartPoint - hold * this.note.yVel,
            this.zStartPoint - hold * this.note.zVel
          );
          this.scene.add(this.cylinders[idx]);
        }*/
      }
    );
  }

  addNote(tick, delta){

    tick.tracks.forEach(track => {
      const noteMaterial = this.note.materials[+track - 1];
      const noteMesh = new THREE.Mesh(this.note.geometry, noteMaterial);
      noteMesh.moveTime = tick.tick - delta;
      noteMesh.ellapseTime = Date.now();
      noteMesh.position.set(
        this.xPos[+track - 1],
        (this.yStartPoint),
        (this.zStartPoint));
      this.spheres.push(noteMesh);
      this.scene.add(noteMesh);
      }
    );

  }


  sceneUpdateNew() {
    this.processTicks();
    this.spheres.forEach(sphere => {
      if (sphere.noteFinished) return;

      const deltaMove = (Date.now() - sphere.ellapseTime);
      if (deltaMove > sphere.moveTime || sphere.moveTime < 0) {
        sphere.noteFinished = true;
        this.scene.remove(sphere);
        return;
      }

      const percent = deltaMove / sphere.moveTime;


      //this.note.yVel = this.note.vel * (this.yEndPoint - this.yStartPoint) / 100;
      //this.note.zVel = this.note.vel * (this.zEndPoint - this.zStartPoint) / 100;

      sphere.position.y = -Math.abs(this.yEndPoint - this.yStartPoint) * percent + this.yStartPoint;
      sphere.position.z = Math.abs(this.zStartPoint - this.zEndPoint) * percent + this.zStartPoint;
      if (sphere.position.z > this.zEndPoint) {
        sphere.noteFinished = true;
        this.scene.remove(sphere);
      }
    });

    this.cylinders.forEach(cylinder => {
      if (cylinder.noteFinished) return;

      const deltaMove = (Date.now() - cylinder.ellapseTime);
      if (deltaMove > cylinder.moveTime || cylinder.moveTime < 0) {
        cylinder.noteFinished = true;
        this.scene.remove(cylinder);
        return;
      }

      const percent = deltaMove / cylinder.moveTime;


      //this.note.yVel = this.note.vel * (this.yEndPoint - this.yStartPoint) / 100;
      //this.note.zVel = this.note.vel * (this.zEndPoint - this.zStartPoint) / 100;

      cylinder.position.y = -Math.abs(this.yEndPoint - this.yStartPoint) * percent + this.yStartPoint;
      cylinder.position.z = Math.abs(this.zStartPoint - this.zEndPoint) * percent + this.zStartPoint;
      if (cylinder.position.z > this.zEndPoint) {
        cylinder.noteFinished = true;
        this.scene.remove(cylinder);
      }
    });
  }

  sceneUpdate() {
    this.spheres.forEach(sphere => {
      sphere.position.y += this.note.yVel;
      sphere.position.z += this.note.zVel;
      if (sphere.position.z > this.zEndPoint) {
        this.scene.remove(sphere);
      }
    });
    this.cylinders.forEach(cylinder => {
      if (cylinder) {
        cylinder.position.y += this.note.yVel;
        cylinder.position.z += this.note.zVel;
        if (cylinder.position.z > (this.zEndPoint + cylinder.hold * this.note.zVel)) {
          this.scene.remove(cylinder);
        }
      }
    });
    this.beatLines.forEach(beatLine => {
      if (beatLine) {
        beatLine.position.y += this.note.yVel;
        beatLine.position.z += this.note.zVel;
        if (beatLine.position.z > this.zEndPoint) {
          this.scene.remove(beatLine);
        }
      }
    });
    // this.t += .01;
    // this.light.movingLights[0].position.x = 5 * Math.cos(this.t) + 0;
    // this.light.movingLights[0].position.y = 5 * Math.sin(this.t) + 0;
  }

  sceneRender() {
    this.renderer.render(this.scene, this.camera);
  }

  gameLoop() {
    requestAnimationFrame(this.gameLoop.bind(this));

    //this.sceneUpdate();
    this.sceneUpdateNew();
    this.sceneRender();
  }

}

export default GameView;
