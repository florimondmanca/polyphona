import Tone from 'tone'

import {Track, SCALE} from '../Music'
import {remote} from 'electron'

const division = 4
const scale = SCALE
// NOTE: synthesizer cannot be in the store because Tone modifies this value
// (and does so outside of a mutation, which Vuex does not like).
const synthesizer = new Tone.Synth().toMaster()
Tone.Transport.bpm.value = 120

const state = {
  currentTrack: new Track(),
  musicContext: {
    division,
    scale,
    octave: 2,
    playing: false
  },
  renderContext: {
    // Percentage of the canvas filled by one tick, from 0 to 100.
    percentPerTick: 100 / (4 * division),
    // Percentage of the canvas filled by a note interval, from 0 to 100
    percentPerInterval: 100 / Object.keys(scale).length
  }
}

function toTransportTime (musicContext, canvasTime) {
  // Notation: "bar:quarter:sixteenth"
  // See: https://github.com/Tonejs/Tone.js/wiki/Time#transport-time
  const quarter = Math.floor(canvasTime / musicContext.division)
  const sixteenth = 4 / musicContext.division * (canvasTime % musicContext.division)
  return `0:${quarter}:${sixteenth}`
}

const mutations = {
  ADD_NOTE (state, note) {
    state.currentTrack.addNote(note)
  },
  DELETE_NOTE (state, note) {
    state.currentTrack.deleteNote(note)
  },
  SCHEDULE_NOTES (state) {
    state.currentTrack.notes.forEach((note) => {
      const pitch = (
        state.musicContext.scale[note.pitch] + state.musicContext.octave
      )
      Tone.Transport.schedule(
        (time) => {
          synthesizer.triggerAttackRelease(
            pitch,
            toTransportTime(state.musicContext, note.duration),
            time,
            note.velocity
          )
        },
        toTransportTime(state.musicContext, note.startTime)
      )
    })
  },
  START (state) {
    state.musicContext.playing = true
  },
  STOP (state) {
    state.musicContext.playing = false
  },
  SET_OCTAVE (state, octave) {
    state.musicContext.octave = octave
  }
}

const getters = {
  listNotes: (state) => state.currentTrack.notes,
  getTrack: (state) => state.currentTrack,
  getRenderContext: (state) => state.renderContext,
  getMusicContext: (state) => state.musicContext,
  getOctave: (state) => state.musicContext.octave,
  getPlaying: (state) => state.musicContext.playing
}

const actions = {
  addNote (context, note) {
    context.commit('ADD_NOTE', note)
    context.dispatch('restart')
  },
  deleteNote (context, note) {
    context.commit('DELETE_NOTE', note)
    context.dispatch('restart')
  },
  play ({commit}, offset) {
    commit('START')
    commit('SCHEDULE_NOTES')
    // Loop one measure ad eternam
    Tone.Transport.loopEnd = '1m'
    Tone.Transport.loop = true
    // Start the song now, but offset by `offset`.
    Tone.Transport.start(Tone.Transport.now(), offset)
  },
  stop ({commit}) {
    commit('STOP')
    Tone.Transport.stop()
    // Cancel all note events so they are not played again
    // when the transport starts again.
    Tone.Transport.cancel()
  },
  restart (context) {
    if (context.state.musicContext.playing) {
      const offset = Tone.Transport.getSecondsAtTime()
      context.dispatch('stop')
      context.dispatch('play', offset)
    }
  },
  togglePlay (context) {
    if (context.state.musicContext.playing) {
      context.dispatch('stop')
    } else {
      context.dispatch('play')
    }
  },
  updateOctave (context, octave) {
    context.commit('SET_OCTAVE', octave)
    context.dispatch('restart')
  },
  exportMidi (context) {
    var fs = require('fs')
    var MidiConvert = require('simonadcock-midiconvert')
    var midi = MidiConvert.create()
    // add a track
    var track = midi.track()
    // select an instrument by its MIDI patch number
      .patch(32)
    const notes = context.state.currentTrack.notes
    for (var i = 0; i < notes.length; i++) {
      const note = notes[i]
      const notePitch = scale[note.pitch].toLowerCase() + context.state.musicContext.octave.toString()
      // note events: note, time, duration
      track.note(notePitch, note.startTime, note.duration / 5, note.velocity + 0.2)
    }
    const {dialog} = require('electron').remote
    var path = dialog.showSaveDialog()
    // write the output in the path chosen by the user
    fs.writeFileSync(path + '.mid', midi.encode(), 'binary')
  }
}

export default {
  namespaced: true,
  state: state,
  mutations: mutations,
  getters: getters,
  actions: actions
}
