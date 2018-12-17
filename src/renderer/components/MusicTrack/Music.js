class Note {
  constructor (startCell) {
    this.startCell = startCell
  }
}

export default class Track {
  constructor (length = 4, tempo = 1) {
    this.length = length
    this.tempo = tempo
    this.notes = []
  }

  addNote = (startCell) => {
    this.notes.push(new Note(startCell))
  }

  getCellList = () => {
    let trackList = Array.from({length: this.length}, (v, k) => ({activated: false}))
    for (let note of this.notes) {
      trackList[note.startCell].activated = true
    }
    return trackList
  }
}